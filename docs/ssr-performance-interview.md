# SSR 性能优化面试手册（Website-Nuxt 实战）

这份文档不是通用科普，是把 `Website-Nuxt` 这个跑在生产上的 Nuxt 4 + Nitro 官网做过的事、踩过的坑、量到的数字摊开，按面试能讲出来的顺序组织。

除特别标注外，**所有数字都是本项目实测**（生产构建 + 线上 `ssr.vunbo.com`），不是行业通用值。复现命令见 §8。

配套阅读：

- [`渲染与性能.md`](./渲染与性能.md)：渲染分工与取舍的决策说明
- [`lighthouse-performance-optimization.md`](./lighthouse-performance-optimization.md)：Lighthouse 审计清单与改动记录

---

## 0. 先给框架，再给例子

被问「你怎么做 SSR 性能优化」时，别一上来报菜名。按三层答：

```text
① 指标层   你在优化什么？
            TTFB → FCP → LCP → CLS → INP
                 ↑ 每一个归因到不同的层，优化手段不通用

② 分层归因 问题出在哪一层？
            渲染策略（何时生成 HTML）
              ↓
            网络传输（字节数、压缩、缓存、连接）
              ↓
            资源加载（关键路径、优先级、格式）
              ↓
            主线程与水合（JS 体积、阻塞、重渲染）

③ 权衡     每一层的每个手段都有代价，说得出代价才算懂
```

面试里区分度最高的不是「你知道 `gzip`」，而是**「你怎么知道它没生效」**。本手册 §5 专门写归因方法。

---

## 1. 指标 → 本项目的归因表

| 指标 | 是什么 | 本项目主要靠什么改善 | 实测锚点 |
|---|---|---|---|
| **TTFB** | 首个字节到达 | SWR/预渲染命中缓存；SSR 直连后端不走公网 | 首页 `s-maxage=60`，命中时 Node 不渲染 |
| **FCP** | 首个内容绘制 | 首屏内容在 HTML 里；单文件 CSS；HTML gzip | 首页 HTML 27921B → gzip 5354B |
| **LCP** | 最大内容绘制 | 首图 preload + `fetchpriority=high`；webp + 收窄 srcset；OSS 预连接 | 同图 281416B → 9164B |
| **CLS** | 布局偏移 | `width`/`height` + `aspect-ratio: 16/9`；切换年级时保留上一屏 | 卡片容器固定比例 |
| **INP** | 交互响应 | JS 体积小；无第三方脚本；列表页 `keepalive` | 首页只有 1 个 `<script type="module">` |

**关键认知**：LCP 的瓶颈在 SSR 站点几乎从不是「JS 太大」，而是「首图发现得太晚 + 图太大 + HTML 太晚到」。所以优化顺序是 **TTFB → 压缩 → 首图**，而不是先拆包。

---

## 2. 做对了什么

### 2.1 渲染策略：按 URL 分工，不是全站一个模式

`nuxt.config.ts` 的 `routeRules` 只回答一件事：**这一条 URL 的 HTML 怎么来、缓存多久**。

| 路由 | 方式 | 为什么 |
|---|---|---|
| `/` | SWR 60s | 落地页必须有 HTML，但推荐位会变，构建时冻住会过期 |
| `/articles`、`/essays` | SWR 120s | 筛选组合太多，不能全量预渲染；查询串各自成一条缓存 |
| `/articles/:id`、`/essays/:id` | SWR 600s | 正文页是收录主体。首次请求渲染，之后直接回缓存 |
| `/category`、`/download-guide`、`/open-miniprogram` | 构建时预渲染 | 内容极少变，静态 HTML 零成本 |
| `/search` | 预渲染壳，结果只在浏览器请求 | 关键词没有稳定收录价值 |

**追问：为什么不用 ISR？**

因为 ISR 在 Nitro 里是**平台相关的**——`isr` 规则只在 Vercel / Netlify 上写成 CDN 规则。这个站是自建 Node（systemd 单元 `website-nuxt`，听 `127.0.0.1:5176`，前面一台 Nginx），用 `isr` 等于写了一条没人执行的配置。`swr` 在 `node-server` 上会把整页响应缓存在进程内，并带 `s-maxage` + `stale-while-revalidate`——**这两个头本来就是给下游共享缓存看的**，前面加 Nginx `proxy_cache` 或 CDN 时直接能接上。

> 这段话的价值在于：**框架能力 ≠ 部署环境能力**。答得出这一点，比背 `isr` 的定义有用。

**追问：为什么关掉 `crawlLinks`？**

预渲染默认会顺着页面里的链接爬。分类页链到大量文章详情，打开后**构建时就会把详情页全部抓下来**，和「详情页按需缓存」的策略直接冲突：构建产物膨胀、构建时长取决于内容量、且内容更新要重新构建。所以显式列 `routes`，关掉爬取。

**踩过的坑：SWR 的缓存 key 是整个 URL。**

首页如果把「年级」放进 URL 或让服务端读取年级偏好，SWR 就会把**某个人的年级页**缓存下来发给下一个访客。所以年级只存 `localStorage`，服务端渲染的 HTML 永远是「全部年级」。这是典型的**正确性换缓存命中率**的权衡，见 §2.6。

### 2.2 缓存头分层

不同性质的东西给不同的 TTL，别一刀切。

| 资源 | 实测响应头 | 依据 |
|---|---|---|
| `/_nuxt/*.js`、`*.css` | `public, max-age=31536000, immutable` | 文件名带内容 hash，内容变则文件名变 |
| `/favicon.png` | `public, max-age=2592000` | 文件名固定、极少变 |
| `/robots.txt` | `public, max-age=3600` | 可接受 1 小时延迟 |
| `/sitemap.xml` | `public, max-age=600` | 路由里显式设置 |
| HTML（首页/列表/详情） | `s-maxage=60/120/600, stale-while-revalidate` | 见下方注意 |
| OSS 封面图 | `public, max-age=31536000, immutable` | Bucket 侧配置 |

**注意：`/_nuxt/**` 的 immutable 头不用自己配。** Nitro 会对带内容 hash 的构建产物自动发 `public, max-age=31536000, immutable`；手动再配一遍是冗余。而 `public/` 下的固定文件（如 favicon）**默认不发任何 `cache-control`**，必须手配。这个反直觉的差异值得单独记一笔。

### 2.3 传输压缩：静态走 Nitro 预压缩，动态走 Nginx

**这一层是本项目最值得讲的部分，因为它踩了一个「配了但没生效」的经典坑。**

分工是：

- **静态产物**（`/_nuxt/**`）：`nitro.compressPublicAssets: true`，构建时生成 `.br` / `.gz` 旁路文件，Nitro 按请求的 `Accept-Encoding` 直接发。**不经过 Nginx 压缩。**
- **SSR 动态响应**（HTML、`/_payload.json`）：Nitro 发明文，压缩得靠 Nginx。

实测静态 JS 三档（同一个 chunk）：

| 客户端 `Accept-Encoding` | 实际传输 | `content-encoding` |
|---|---|---|
| `br` | 26533 B | `br` |
| `gzip` | 29677 B | `gzip` |
| 无 / `identity` | 81658 B | 无 |

**动态响应这条曾经是漏的。** 线上实测：带 `Accept-Encoding: gzip, deflate, br` 请求首页，返回 `content-length: 27921` 且**没有** `content-encoding`，也没有 `vary`。也就是说 HTML 和 hydration 用的 payload 一直在明文发。

修法是在 Nginx 的 `ssr.vunbo.com.conf` 里加：

```nginx
gzip on;
gzip_vary on;
gzip_proxied any;      # ← 关键，默认值是 off
gzip_comp_level 5;
gzip_min_length 1024;
```

**`gzip_proxied` 是这里唯一的坑**：它的默认值是 `off`，含义是「不压缩来自上游的响应」。这个站所有响应都来自上游 Node，所以只写 `gzip on` 等于白开——**配置合法、`nginx -t` 通过、但完全不生效**。实测对比（在 Docker 里用 nginx 1.31.6 搭了个不发压缩的上游）：

| 配置 | 带 `Accept-Encoding: gzip` 请求 | 结果 |
|---|---|---|
| `gzip on` + `gzip_proxied any` | ✅ | `content-encoding: gzip` |
| 只有 `gzip on`（等价线上现状） | ❌ | 明文，无 `content-encoding` |

修复后收益（HTML 用 gzip 现算，因为线上还未部署这条改动）：

| 资源 | 明文 | gzip | 省 |
|---|---|---|---|
| 首页 HTML | 27921 B | 5354 B | 81% |
| 首页 `/_payload.json` | 28552 B | 11194 B | 61% |
| `/articles` 列表 HTML | 16965 B | 4485 B | 74% |

一次访问两份文档：**56 KB → 16 KB**。

顺带记住：**别在反向代理里重置 `Accept-Encoding`**（`proxy_set_header Accept-Encoding ""` 是常见的「防双重压缩」误操作）。一旦重置，Nitro 就收不到客户端的编码能力，`/_nuxt/**` 的 br 预压缩产物全部拿不到，反而更快不起来。

### 2.4 图片：改写 URL，不做代理

**决策：图片走 `@nuxt/image`，但用自定义 provider 改写 URL，不经过 Nuxt 代理。**

自己写的 provider（`app/providers/aliyun-oss.ts`）只做一件事：对白名单内的自家 OSS 域名，拼上 `?x-oss-process=image/resize,w_640,h_360/format,webp`；白名单外的域名、本地 `/uploads`、相对路径原样返回。

**追问：为什么不直接用 `@nuxt/image` 内置的 aliyun provider？**

因为内置那个拼的是 `?image_process=`（阿里云 CDN / 全站加速的格式），**不能**用于 OSS 直链。OSS 直链必须用 `?x-oss-process=...`。这类「文档里写的和实际环境对不上」的问题只能靠读源码/实测发现。

**追问：为什么不做代理？**

让 Nuxt 代理远程图片，等于对外提供了一个**开放图片服务**——任何人可以拿这套服务处理任意远程图，白送带宽和 CPU。改写 URL 把处理交给 OSS 自己做，省一层跳转、不占 Node、还能吃到 OSS 的缓存与防盗链。

**收益（同一张封面图实测）：**

| 形态 | 字节 | 说明 |
|---|---|---|
| OSS 原图（jpeg） | 281416 B | Lighthouse 报 274.8 KiB，与截图对得上 |
| `resize,w_640,h_360` + `format,webp` | **9164 B** | 省 96.7%，且显示尺寸本来就是缩略图 |

**追问：`sizes` 为什么必须给？**

`<NuxtPicture>` 不给 `sizes` 时，浏览器按默认 **100vw** 选图——卡片实际只显示 312~474px，却可能去下 2048w / 3072w。SSR 输出实测：初版 srcset 一路生成到 `w_3072`；补了 `sizes` 后收窄成 **312 / 320 / 624 / 640w**，同时 preload 的 `imagesizes` 也才正确。

```vue
<!-- 组件默认值：3 列网格 -->
sizes="320:100vw sm:50vw lg:312px"
<!-- 纯 2 列网格要显式传 -->
sizes="320:100vw sm:50vw lg:474px"
```

**追问：为什么首图 `fetchpriority` 不直接写在 `<NuxtPicture>` 上？**

因为 `fetchpriority` 不在 `@nuxt/image` 的属性透传白名单里，直接写会落到 `<picture>` 元素上，浏览器不生效。正确做法是用 `preload` prop，SSR 时会注入：

```html
<link rel="preload" as="image" imagesrcset="... 312w, ... 320w, ... 624w, ... 640w"
      imagesizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 312px"
      fetchpriority="high">
```

实测首页 HTML 里**恰好 1 条**这样的 preload，`imagesrcset` 只有 4 档——不多不少。

**追问：LCP 图能 `loading="lazy"` 吗？**

不能。懒加载图会被浏览器**延迟发现**，LCP 元素懒加载等于自己把 LCP 往后推。本项目的做法是给 `ArticleCard` 加 `priority` prop，只有首屏推荐第一张传 `priority`（`eager` + preload），其余保持 `lazy`。

**顺带：OSS 侧还挂了 Referer 防盗链**（实测不带 `Referer` 请求返回 403，带 `Referer: https://ssr.vunbo.com/` 返回 200）。这不算性能手段，但省的是同一笔带宽。

### 2.5 CSS / 字体 / 主线程

| 手段 | 数字 / 依据 |
|---|---|
| 全站 CSS 合并为单文件（`vite.build.cssCodeSplit: false`） | `render-blocking` 样式请求 3 → 1；实测 `style.BqDwiKgX.css` 35514B，**br 后 6537B** |
| 纯系统字体栈，不加载中文字体 | 实测 HTML 中 `fonts.googleapis` 出现 **0 次**。中文 webfont 动辄数 MB，且样式表挡在首屏前面 |
| 首屏动画只做 `translateY`，不从 `opacity: 0` 起 | 从透明淡入会推迟 LCP（Lighthouse 不模拟「减少动态效果」时按最坏情况算） |
| `prefers-reduced-motion: reduce` 关掉动画与页面过渡 | 可访问性 + 低端机流畅度 |
| 列表页组件缓存（`definePageMeta({ keepalive: true })`） | 文章/作文/搜索三个列表；详情**不**缓存，换 id 必须重新取数 |
| 无任何第三方脚本 | 实测首页只有 1 个 `<script type="module">` |

**`cssCodeSplit: false` 说得出适用条件才算懂：** 它把全站 CSS 合成一个文件，好处是 `render-blocking` 请求数下降 + 一次 immutable 缓存全站复用；代价是**首屏会带上其他页面的 CSS**。本项目适用是因为全站 CSS 只有 6.5KB（br）。如果站点有几十个重样式页面，这个开关就是错的——正确做法是保持默认拆包 + 首屏关键 CSS 内联。

### 2.6 SSR 正确性与可缓存性

这几条不是「性能技巧」，但面试里属于加分项，因为它们体现**你意识到 SSR 和 CSR 的约束不一样**：

- **年级偏好只存 `localStorage`**，只在 `onMounted` 之后读取；服务端渲染的 HTML 永远是「全部年级」。理由：SWR 的缓存 key 是 URL，服务端读个人偏好会把 A 的页面发给 B。
- **水合一致性**：水合完成前年级按钮保持「全部年级」、链接不带年级参数，避免服务端 HTML 和客户端首屏不一致（hydration mismatch）。
- **切换年级不换 URL**，另发 `GET /home?grade=`，且**保留上一屏**等新数据回来再替换，避免布局跳动（CLS）。
- **SSR 与浏览器取数路径不同**：服务端直连 `NUXT_API_ORIGIN`（SSR 里没有浏览器那种相对路径主机名），浏览器走同源 `/api/v1` 由 Nitro 反代。这样浏览器侧没有跨域，也就没有额外的 preflight。
- **`useAsyncData` 用 `dedupe: 'cancel'`**：筛选条件快速切换时取消上一个请求，只认最后一次。
- **超时兜底**：`AbortSignal.timeout(15000)` 与业务 `AbortController` 用 `AbortSignal.any` 组合，组件 `onScopeDispose` 时 abort。

---

## 3. 做得不好 / 没做的

按「收益 ÷ 成本」排序。每条给：现象 → 实测证据 → 原因 → 怎么改。

### 🔴 3.1 HTML 与 `_payload.json` 明文传输（已定位，待部署）

- **现象**：带 `Accept-Encoding: gzip, deflate, br` 请求首页，`content-length: 27921`，无 `content-encoding`、无 `vary`。
- **原因**：Nginx 站点配置里根本没开 gzip；且这类配置**从未进过 Git**，只在服务器上——所以代码 review 永远发现不了。
- **改法**：`ssr.vunbo.com.conf` 加 `gzip on` + **`gzip_proxied any`**（见 §2.3）。已在 Docker 里端到端验证。
- **面试价值**：这是「**你怎么发现一个配了但不生效的优化**」的完美案例。答案是别信配置、信响应头。

### 🔴 3.2 HTML 只有 `s-maxage`，没有 `max-age`

实测：

```text
/            cache-control: s-maxage=60, stale-while-revalidate
/articles    cache-control: s-maxage=120, stale-while-revalidate
/articles/1  cache-control: s-maxage=600, stale-while-revalidate
```

`s-maxage` **只对共享缓存有意义**，浏览器不认。结果是回访用户每次都要拿 ETag 去复验，进不了强缓存。

更根本的问题是：**这层缓存到底落在哪？** 如果前面的 Nginx 没配 `proxy_cache`，那这套 SWR 只是 Nitro 进程内存里的缓存——进程重启就冷、多实例不共享。配置里预留了 `proxy_cache` 的注释块和开启前提，但默认关闭（它引入 cache key / `Vary` / `Set-Cookie` 的坑，需要单独验证）。

- **改法**：要么在 Nuxt 侧补 `max-age`（用 `routeRules` 的 `headers` 覆盖），要么明确「只有共享缓存」并真的配上 Nginx `proxy_cache`。
- **面试价值**：能区分 `max-age` / `s-maxage` / `stale-while-revalidate` 各自对谁生效，是缓存题的常见分水岭。

### 🟠 3.3 `og:image` 用原图，且对象带「强制下载」

实测详情页：

```html
<meta property="og:image" content=".../1783345514868_0a827jdy.jpg">  <!-- 281 KB 原图 -->
<meta name="twitter:card" content="summary_large_image">
```

该 OSS 对象响应头里还有：

```text
Content-Disposition: attachment
x-oss-force-download: true
```

`<img>` / `<picture>` 走 srcset 是 9KB 的 webp，不受影响；但**社交爬虫抓的是 281KB 原图，还被标成附件下载**。抓取超时、预览不出图都可能从这儿来。

- **改法**：给 OG 单独出一张 1200×630；把封面对象的 `Content-Disposition` 去掉。
- **面试价值**：说明你分得清「页面内的图」和「被外部消费者抓的图」是两条路径。

### 🟠 3.4 首页 TTFB 被 `await` 阻塞

`pages/index.vue` 里 `await useAsyncData('home', ...)`——SSR 要等 `/home` 返回才吐第一个字节，**接口慢一页就慢**，`swr: 60` 只能覆盖缓存命中的情况。

- **改法**：Nuxt 的流式渲染（`<Suspense>` 分段吐），或把「推荐 / 热门 / 优秀作文」拆成独立 async 组件各自 Suspense。
- **权衡**：流式渲染会牺牲部分可缓存性（HTML 分块到达，共享缓存按整响应缓存的行为会变），要按页面价值决定，不是无脑上。

### 🟠 3.5 SWR 会把失败的首渲染一起缓存

代码里自己标了注释（`nuxt.config.ts` 的 `ponytail:`）：用 `swr: 60` 时，首次渲染失败（后端挂了返回错误页）的结果也会被缓存到 TTL——**接下来 60 秒所有访客都看失败页**。

- **改法**：只缓存 HTTP 200（Nitro 的 `cache` 规则 / 自定义 handler 判断状态码）。

### 🟡 3.6 favicon 是 512×512 PNG，显示 32×32

实测 `favicon.png` 11232 B / 512×512，Header 里 `width="32" height="32"`，`<link rel="icon">` 也指向它。Lighthouse 报按显示尺寸可省约 10.9 KiB。

- **改法**：导出 `favicon.svg`（首选，矢量）+ 32/48/180 多尺寸；换文件名后可把缓存升到一年 immutable。

### 🟡 3.7 页面过渡与固定背景（INP / 滚动流畅度）

- `pageTransition: { mode: 'out-in' }` + CSS 180ms/220ms：每次路由切换都要等旧页淡出约 200ms 才看到新页。内容站这笔收益不值得。
- `body` 上 `background-attachment: fixed` + 渐变 + SVG noise：低端机滚动时持续 repaint。
- **改法**：过渡压到 100ms 以内或改 `in-out`；移动端 `@media (max-width: 768px)` 关掉 `fixed`。

### ⚪ 3.8 完全没做的

| 项 | 为什么现在不做 / 需要什么 |
|---|---|
| **CDN** | 页面单机 Nginx 直供，图片直连 OSS。上 CDN 要处理回源、缓存刷新和 HTML 的 `s-maxage` 语义 |
| **AVIF** | 只出 webp。再省一档，但要先确认 OSS 的 `x-oss-process` 的 `format` 是否支持 `avif` |
| **Nitro storage / 跨进程持久缓存** | 没配，SWR 只在进程内存。多实例部署时必须补 |
| **Early Hints (103)** | 未用。可以在 Nginx 层对首图发 103，收益有限 |
| **Speculation Rules** | 未用。`NuxtLink` 自带的 prefetch 已覆盖大部分场景 |
| **Service Worker / 离线** | 内容站必要性低 |
| **critical CSS 内联** | 未做。全站就是一个 6.5KB(br) 的 CSS，做了收益也有限——**这一条要能说出「为什么不做」** |

---

## 4. 面试追问 Q&A

### Q1：`isr` 和 `swr` 你怎么选？

看部署环境。`isr` 在 Nitro 里是平台相关的（Vercel / Netlify 会把它写成 CDN 规则），自建 Node 上写 `isr` 等于没写。`swr` 在 `node-server` 上落成进程内整页缓存 + `s-maxage` / `stale-while-revalidate` 响应头，前面接共享缓存时能直接用。**结论：框架给的开关不等于你的环境支持。**

### Q2：为什么年级偏好不放 URL / 不让服务端读？

因为 SWR 的缓存 key 是 URL。服务端读个人偏好，缓存命中后会把 A 的年级内容发给 B。放 `localStorage` + 客户端二次请求，是拿「多一次请求」换「HTML 可全局共享」。这是 SSR 里非常典型的**「个性化 vs 可缓存」冲突**。

### Q3：`cssCodeSplit: false` 什么时候是错的？

当全站 CSS 大到「首屏带上无关样式」的成本超过「多一个请求」的成本时。本项目全站 CSS 只有 6.5KB(br)，所以合并划算；样式规模上到几十 KB 就该保持默认拆包，改用关键 CSS 内联。

### Q4：`sizes` 不给会怎样？

浏览器默认按 `100vw` 选 srcset。卡片实际显示 312px，却可能去下 3072w 的图——`srcset` 反而帮了倒忙，preload 也会预加载一张用不上的大图。本项目实测：补 `sizes` 后 3 列卡片的档位从一路到 3072w 收窄为 312/320/624/640w。

### Q5：`fetchpriority="high"` 写了没用，为什么？

看它落在哪个元素上。`@nuxt/image` 的属性白名单里没有 `fetchpriority`，直接写在 `<NuxtPicture>` 上会透传到 `<picture>` 上，浏览器不认。要用 `preload` prop，由 SSR 注入 `<link rel="preload" as="image" imagesrcset imagesizes fetchpriority="high">`。

### Q6：Nginx 开了 gzip 但响应还是明文，怎么查？

先看响应头有没有 `content-encoding` 和 `vary`。如果都没有，多半是 `gzip_proxied`——它的默认值是 `off`，会跳过所有来自上游的响应。这个站的 HTML 全部来自上游 Node，所以 `gzip on` 不配 `gzip_proxied any` 等于白开。**注意这种错不会让 `nginx -t` 失败**，只能靠抓响应头发现。

### Q7：为什么图片不改用 Nuxt 代理？

代理远程图 = 对外提供一个开放图片服务，白送带宽和 CPU，还多一层跳转。改写 URL 让 OSS 自己处理，省 Node 资源、吃 OSS 缓存。

### Q8：`s-maxage` 和 `max-age` 有什么区别？

`max-age` 对浏览器和共享缓存都生效；`s-maxage` **只**对共享缓存（CDN、Nginx `proxy_cache`）生效，并会覆盖 `max-age`。本站 HTML 只有 `s-maxage`，所以浏览器侧不吃缓存，回访只能靠 ETag 复验——这是当时的取舍，也是当前的缺口。

### Q9：SSR 站点优化 LCP，你先动哪一刀？

按因果顺序，不要跳步：

1. **TTFB**：HTML 能不能更快到（SWR/预渲染/别让 SSR 阻塞在接口上）
2. **压缩**：HTML + payload 有没有压（这一刀最便宜）
3. **首图发现时机**：`preload` + `fetchpriority=high`，绝不用 `lazy`
4. **首图体积**：格式（webp/avif）+ 按显示尺寸缩放 + `sizes` 正确
5. **连接建立**：对图片域名 `preconnect` / `dns-prefetch`

本站第 2 步曾经是漏的：56KB 的明文文档压完只剩 16KB，比任何 JS 拆包都划算。

### Q10：`preconnect` 要不要加 `crossorigin`？

看请求类型。本站封面的 `<img>`/`<picture>` 是普通图片请求（非 CORS），所以**刻意不加** `crossorigin`——加了会额外建一条用不上的连接、反而重复握手。webfont 因为一定是 CORS 请求，才需要加。

### Q11：你怎么证明优化真的生效了？

不看配置、不看代码，看字节和响应头。本项目的验证方式：

- `curl -sI -H 'Accept-Encoding: gzip' <url>` 看 `content-encoding` / `vary`
- `curl --compressed -o x.html` 后 `wc -c` 与 `gzip -9 -c x.html | wc -c` 对比
- 抓 SSR HTML 数一遍 `preload` / `picture` / `loading` 的出现次数
- Nginx 改动在 Docker 里用一个「明确不压缩的上游」搭对照组，先复现问题再验证修复

### Q12：你踩过最值钱的坑是什么？

**「配置合法但完全不生效」。** `gzip_proxied` 那个：`nginx -t` 通过、reload 成功、没有任何报错，唯一的症状是 HTML 比该有的大 5 倍。同类还有这次发现的根因——**那份 Nginx 配置从来没进过 Git**，所以代码 review 永远看不到它。教训：**性能问题必须在响应层验证，配置层通过不代表生效**。

---

## 5. 归因方法论（面试区分度最高的部分）

### 5.1 「大不大」先看分层账户

拿首页一次访问举例：

```text
文档（HTML）            27921 B  → gzip  5354 B   ← 曾经漏压缩
hydration payload       28552 B  → gzip 11194 B   ← 曾经漏压缩
CSS（单文件，br）         6537 B
主 JS chunk（br）       26533 B
LCP 封面图（640w webp）   9164 B   ← 原图是 281416 B
```

这张表能立刻指出优化顺序：**文档压缩 > 首图 > JS 拆包**。而多数人第一反应是去拆 JS。

### 5.2 「为什么慢」看指标归属

| 症状 | 归因层 | 先查什么 |
|---|---|---|
| TTFB 高 | 渲染策略 / 后端 | 有没有命中缓存；SSR 是否阻塞在接口；后端接口耗时 |
| FCP 晚但 TTFB 正常 | 关键路径 | `render-blocking` 的 CSS/JS；有没有 webfont |
| LCP 晚 | 首图 | LCP 元素是谁；有没有被 `lazy`；`preload` 有没有；`sizes` 对不对 |
| CLS | 布局 | 图片有没有 `width`/`height`；字体切换；异步内容插入位置 |
| INP 差 | 主线程 | JS 体积；第三方脚本；过渡动画时长；`background-attachment: fixed` |

### 5.3 「改了没效果」先怀疑没生效

三个最常见的「配了不生效」：

1. Nginx `gzip on` 但缺 `gzip_proxied any`（本项目的坑）
2. 代理里重置了 `Accept-Encoding`，预压缩产物拿不到
3. 缓存头配了但被上游的 `Cache-Control` 覆盖（或反之，上游的 `s-maxage` 让本地配置失效）

---

## 6. 一页速记

```text
渲染：SWR 分层（60/120/600）+ 预渲染静态页 + 关 crawlLinks
缓存：hash 产物 immutable（Nitro 自带）/ favicon 30d / HTML s-maxage
压缩：静态 → Nitro compressPublicAssets（br 优先）
      动态 → Nginx gzip，且必须 gzip_proxied any
图片：自定义 OSS provider 改写 URL（不代理）
      NuxtPicture + sizes 收窄 srcset（3072w → 640w）
      首图 priority + preload fetchpriority=high，其余 lazy
      OSS：webp + resize + 长效 Cache-Control + Referer 防盗链
CSS ：单文件（全站 6.5KB br）+ 系统字体栈（零 webfont）
主线程：无第三方脚本 + keepalive 列表 + 动画只位移
正确性：年级放 localStorage，HTML 全局可缓存
踩坑：配置合法 ≠ 生效；关键配置进了 Git 才算可 review
```

**真实数字（背下来）**：原图 281416B → 640w webp **9164B**；首页 HTML 27921B → gzip **5354B**；静态 JS 81658B → br **26533B**；全站 CSS 35514B → br **6537B**。

---

## 7. 诚实边界：本项目**没有**验证的

面试里主动划边界比硬撑可信。

| 项 | 状态 |
|---|---|
| Lighthouse 综合分 | 只有一次截图（性能 96，SEO/a11y/best-practices 99/100/100），**没有跑过 CLI 复核** |
| INP | 未实测，只有「无第三方脚本 + 体积小」的推断 |
| 真实移动端设备 | 未在低端真机跑过滚动帧率 |
| gzip 改动上线后效果 | 只在 Docker 里验证了配置与响应头，**尚未部署到生产** |
| `proxy_cache` 那一层 | 配置已写但默认关闭，未在同一环境验证过 |
| AVIF | 未验证 OSS 的 `format` 是否支持 |

---

## 8. 复现命令

### 8.1 看线上响应头与压缩

```bash
# HTML 压缩（应看到 content-encoding: gzip 和 vary: Accept-Encoding）
curl -sI -H 'Accept-Encoding: gzip' https://ssr.vunbo.com/ | grep -iE 'content-encoding|vary|content-length'

# hydration payload 的缓存头
curl -sI https://ssr.vunbo.com/_payload.json | grep -iE 'cache-control|content-length'

# 静态产物（br + immutable）
curl -sI -H 'Accept-Encoding: br' https://ssr.vunbo.com/_nuxt/<chunk>.js | grep -iE 'content-encoding|cache-control'

# 各页面缓存策略
for p in / /articles /articles/1; do curl -sI "https://ssr.vunbo.com$p" | grep -i cache-control; done
```

### 8.2 量一份文档的真实字节

```bash
curl -sS --compressed https://ssr.vunbo.com/ -o home.html
wc -c home.html            # 传输后的大小
gzip -9 -c home.html | wc -c   # 压完应该是多少
```

### 8.3 数 SSR HTML 里的图片策略

```bash
curl -sS --compressed https://ssr.vunbo.com/ -o home.html
grep -o '<picture' home.html | wc -l              # 图片组件数
grep -o 'loading="lazy"' home.html | wc -l        # 懒加载数
grep -o 'fetchpriority="high"' home.html | wc -l  # LCP 优先级数（应为 1）
grep -o '<link rel="preload" as="image"[^>]*>' home.html
grep -o 'imagesrcset="[^"]\{0,200\}' home.html
```

### 8.4 OSS 图片处理与缓存

```bash
U="https://essay-mvp.oss-cn-guangzhou.aliyuncs.com/<path>/cover.jpg"

# 不带 Referer → 403（防盗链生效）
curl -sI "$U" | head -1

# 带 Referer → 200，看 Cache-Control
curl -sI -H 'Referer: https://ssr.vunbo.com/' "$U" | grep -iE 'content-length|cache-control'

# 处理后的 webp 体积
curl -sI -H 'Referer: https://ssr.vunbo.com/' \
  "$U?x-oss-process=image/resize,w_640,h_360/format,webp" | grep -i content-length
```

### 8.5 本地验证 Nginx 改动（不碰生产）

用 Docker 起一个「明确不压缩的上游」+ 待测配置，跑对照组：

```bash
docker run --rm -v "$PWD/conf.d:/etc/nginx/conf.d:ro" \
  -v "$PWD/ssl:/etc/nginx/ssl:ro" nginx:alpine nginx -t
```

本项目的做法是同时挂两个 server 块：待测配置（开 gzip）和一个不带 gzip 的对照组，用 `curl -H 'Accept-Encoding: gzip'` 分别打——
**先复现问题，再验证修复**，这样才知道改的那一行真的管事。

### 8.6 项目内验证

```bash
cd Website-Nuxt
pnpm test        # node --test
pnpm typecheck
pnpm build       # 需要 NUXT_API_ORIGIN 可访问（预渲染会请求它）
node .output/server/index.mjs
```

---

## 9. 一句话总结

SSR 的性能账**大部分不在框架里，在响应头和图片上**。本项目最贵的一刀不是换框架、不是拆包，是发现 HTML 一直在明文传输——而那行配置之所以一直错着，是因为它没进版本控制。**能被 review 的配置才是配置。**
