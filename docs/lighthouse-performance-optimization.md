# Lighthouse 性能优化建议（Website-Nuxt）

> 基于 Lighthouse 报告截图（性能 96，SEO / 可访问性 / 最佳实践 99/100/100）
> 范围：
> `/Users/vunbo/Desktop/course/Website-Nuxt`
> ，仅给建议，不动代码。
> 截图中已暴露的两条主审计：
> **Use efficient cache lifetimes（省 287 KiB）**
> 、
> **Improve image delivery（省 267 KiB）**
> ，以及折叠起来的
> **Network dependency tree（Document request latency 省 17 KiB、Render-blocking requests）**
> 。



***

## 一、现状速览



| 项    | 现状                                                                               |
| ---- | -------------------------------------------------------------------------------- |
| 框架   | Nuxt 4.1 + Vue 3.5 + Tailwind v4（Vite 插件）                                        |
| 渲染模式 | 混合渲染：首页 `/` SWR 60s、`/articles/**` SWR 600s、`/category` 等预渲染                     |
| 静态资源 | `.output/public/_nuxt` 共 680 KB（含 gzip/br），主 JS chunk \~97 KB /gzip 37 KB，体量本身健康 |
| 图片   | 全部裸 `<img>`，未接入 `@nuxt/image`；OSS 域名 `essay-mvp.oss-cn-guangzhou.aliyuncs.com`   |
| 字体   | 纯系统字体栈（PingFang / Songti SC），无 webfont，✅ 好                                       |
| 缓存头  | 代码里只给 `/**` 加了安全头；**没有给静态资源、favicon、OSS 图片任何 Cache-Control**                     |



***

## 二、问题清单与优化建议（按收益排序）

### 🔴 P0-1 封面图过大、格式落后（Lighthouse 报省 256 KiB）

**证据**



* Lighthouse：`...covers/178...0a827jdy.jpg`，源图 **970×546，274.8 KiB**，实际只显示 **310×372**（约卡片缩略图尺寸）。


  * 换 WebP/AVIF 可再省 **188.6 KiB**

  * 按显示尺寸缩放可再省 **215.1 KiB**

* 代码：`app/components/ArticleCard.vue:37-45`



```
<img :src="article.coverImg" width="640" height="360"
     loading="lazy" decoding="async" />
```

图片直链 OSS 原图，没有任何尺寸 / 格式协商。

**建议（任选其一，推荐第 1 个）**



1. **接入&#x20;**`@nuxt/image`：配合阿里云 OSS provider（或自定义 ipx），把 `<img>` 换成 `<NuxtImg>` / `<NuxtPicture>`：

* 自动按 `sizes` 输出多档 srcset（如 320/640/960）；

* 自动按浏览器 Accept 头输出 WebP/AVIF；

* 占位、懒加载、`fetchpriority` 全部内置。

1. **不装模块，直接用 OSS 图片处理参数**（最便宜的改法）：在拼 URL 时给 `coverImg` 追加 `?x-oss-process=image/resize,w_640/format,webp/quality,q_80`。文章详情页大图再放大一档。

2. **后端出图时直接存一份缩略图**：文章表新增 `coverImgThumb` 字段，列表页用小图，详情页用原图。

> 预计收益：首屏传输 -200~250 KiB，LCP 显著提前。



***

### 🔴 P0-2 首屏 LCP 图被 `loading="lazy"` 拖慢

**证据**



* Lighthouse 报告里那张 `article-card-img` 就是首屏「推荐文章」第一张卡，它就是当前 LCP 候选元素。

* 代码里它被统一加了 `loading="lazy"`（`ArticleCard.vue:43`、`pages/index.vue:211` 的 `block.icon`）。

* 浏览器对懒加载图会**延迟发现**，LCP 元素绝对不能 lazy。

**建议**



* 对首屏可见的第一张推荐卡图片：`loading="eager"` + `fetchpriority="high"`，并在 `<head>` 里加 `<link rel="preload" as="image" href="...">`（可在服务端拿到 `recommended[0].coverImg` 后注入）。

* 其余卡片保持 `loading="lazy"`。

* `ArticleCard` 加一个 prop `eager?: boolean`，首页首屏那两张（推荐第一张、热门第一张）传 `eager`。



***

### 🔴 P0-3 OSS 图片没有 Cache-Control（省 287 KiB 重复访问）

**证据**



* Lighthouse：`essay-mvp.oss-cn-guangzhou.aliyuncs.com` 那张图 **Cache TTL = None**，重复访问每次都重下 275 KiB。

* 本站 `/favicon.png` 同样 **Cache TTL = None**，11 KiB。

**建议**



1. **OSS Bucket 侧**（最关键，一次性配置）：

* 在 OSS 控制台对 `covers/` 目录（或整个 bucket）设置 HTTP 头：



```
Cache-Control: public, max-age=31536000, immutable
```



* 或在上传 / 写对象时带上该头。

* ⚠️ 如果用了 P0-1 第 2 条的 `x-oss-process` 版本化 URL，URL 里带参数当版本，长缓存才安全；不然换图会被 CDN / 浏览器卡住。

1. **Nuxt 侧给 public 资源加缓存**（`nuxt.config.ts` 的 `routeRules`）：



```
'/favicon.png': { headers: { 'Cache-Control': 'public, max-age=604800' } },
'/_nuxt/**':    { headers: { 'Cache-Control': 'public, max-age=31536000, immutable' } },
```

Nuxt 哈希命名的 JS/CSS 本来就适合 immutable。



***

### 🟠 P1-1 favicon 是 512×512 PNG，只显示 32×32（省 10.9 KiB）

**证据**



* `public/favicon.png` 实际尺寸 **512×512，11.2 KB**；页面里 `<img>` 显示 32×32（`AppHeader.vue:18-24`），`<link rel="icon">` 也是它（`nuxt.config.ts:43-44`）。

* Lighthouse：按显示尺寸可省 10.9 KiB。

**建议**



* 导出一组尺寸：`favicon-32.png`、`favicon-48.png`、`apple-touch-icon-180.png`；

* 主 favicon 优先用 **SVG**（矢量，任意尺寸都清晰，体积更小）；

* `nuxt.config.ts` 里 `head.link` 改成多档：



```
{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
{ rel: 'icon', sizes: '32x32', href: '/favicon-32.png' },
{ rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
```



* Header 里那个 32×32 的 logo 直接用 SVG 内联或 `<img src="/favicon.svg">`。



***

### 🟠 P1-2 缺少 OSS 域名的 preconnect /dns-prefetch

**证据**



* 首屏要从 `essay-mvp.oss-cn-guangzhou.aliyuncs.com` 拉封面图，但 `nuxt.config.ts` 里没有任何对该域名的提示。

* 浏览器要先 DNS → TLS → 才能发请求，对 LCP 图这种关键资源等于多了 1\~2 个 RTT。

**建议**（`nuxt.config.ts` 的 `app.head.link`）



```
{ rel: 'dns-prefetch', href: 'https://essay-mvp.oss-cn-guangzhou.aliyuncs.com' },
{ rel: 'preconnect',  href: 'https://essay-mvp.oss-cn-guangzhou.aliyuncs.com', crossOrigin: 'anonymous' },
```



***

### 🟠 P1-3 Document request latency（省 17 KiB / 更快 TTFB）

**证据**



* Lighthouse：文档请求延迟 17 KiB 可省。

* 代码：`pages/index.vue:9`



```
const { data } = await useAsyncData('home', () => apiGet<HomeData>('/home'))
```

SSR 时**先等&#x20;**`/home`**&#x20;接口返回再吐 HTML**，接口慢一页就慢。



* `/` 已配置 `swr: 60`，但首次冷启动、SWR 回源时仍然要等后端。

**建议**



1. **后端**：确认 `/home` 接口响应时间（应 < 200ms）；能加缓存就加；

2. **Nuxt 侧**：

* 把 `/home` 改成 `server/components` 或 `useAsyncApi` 之外的「流式」输出（Nuxt 3+ 支持 `<Suspense>` 流式，目前 `await` 会阻塞整页）；

* 或把首页改成**预渲染 + 客户端水合后再拉年级数据**（当前年级切换本来就是客户端拉的，默认首屏数据可以直接预生成）；

1. 检查 HTML 体积：gzip 前是否有大量内联 JSON（`payload`），过大时考虑精简 `HomeData` 字段。



***

### 🟡 P2-1 页面切换动画拖慢 INP / 导航

**证据**



* `nuxt.config.ts:47`：`pageTransition: { name: 'page', mode: 'out-in' }`。

* `main.css:79-94`：每次路由切换，旧页 opacity 0（180ms）→ 新页 translateY 6px 入（220ms）。

* 对内容站来说，这个动画收益小、代价是每次点链接都要等约 200ms 才能看到新页。

**建议**



* 改成 `mode: 'in-out'`，或直接关闭 `pageTransition: false`；

* 至少把时长压到 100ms 以内。



***

### 🟡 P2-2 body 多重渐变 + `background-attachment: fixed`

**证据**



* `main.css:47-58`：body 上叠了 90° 线性渐变 + SVG noise data URI，且 `background-attachment: fixed`。

* 在低端手机上，fixed 背景 + 滚动会持续 repaint，容易掉帧（影响 INP / CLS 体感）。

**建议**



* 移动端（`@media (max-width: 768px)`）关掉 `background-attachment: fixed`，或把这层背景降到 `::before` 上；

* SVG noise 体积不大（已 inline），可保留。



***

### 🟡 P2-3 Render-blocking requests（未展开，需要复测）

Lighthouse 折叠了这条。从代码看：



* CSS 由 Nuxt/Vite 自动注入，一般会被抽到 `<link>` 并带 hash，本身不阻塞太久；

* 没有外部字体、没有第三方脚本，理论上没有明显阻塞。

**建议**：优化完上面几项后重新跑一次 Lighthouse，看这条是否还在；如果还在，展开截图发我，再定位具体是哪段 CSS/JS。



***

## 三、预期收益汇总



| 优化项                           | 预估传输节省            | 对指标影响             |
| ----------------------------- | ----------------- | ----------------- |
| P0-1 封面图缩放 + WebP/AVIF        | **-200\~250 KiB** | LCP 显著提前          |
| P0-2 LCP 图 fetchpriority=high | 0（提前发现）           | LCP -0.5\~1.5s    |
| P0-3 静态资源长缓存                  | 重复访问 **-287 KiB** | 回访性能分拉满           |
| P1-1 favicon 瘦身               | -10 KiB           | 首屏小项              |
| P1-2 preconnect OSS           | 0（省 RTT）          | LCP 提前 100\~300ms |
| P1-3 TTFB 优化                  | HTML -17 KiB      | FCP/LCP 提前        |
| P2-1/P2-2 动画与背景               | 0                 | INP、滚动流畅度         |

全部落地后，性能分从 96 → 99\~100 是合理预期；其中 **P0-1 + P0-3** 是最划算的两件事。



***

## 四、落地顺序建议



1. **OSS Bucket 配 Cache-Control**（运维侧，5 分钟，立即消掉「efficient cache lifetimes」）；

2. **OSS 图片 URL 加&#x20;**`x-oss-process`**&#x20;出 WebP / 缩放图**（或装 `@nuxt/image`，1\~2 小时）；

3. **favicon 改 SVG + 多尺寸**（10 分钟）；

4. **nuxt.config 加 preconnect + 静态资源长缓存 headers**（5 分钟）；

5. **ArticleCard 支持&#x20;**`eager`**&#x20;prop，首屏第一张 fetchpriority=high**（30 分钟）；

6. 复测 Lighthouse，再决定是否做 P1-3 / P2 项。



***

## 五、不动代码也能先做的事（运维侧）



* [ ] 阿里云 OSS 控制台：`essay-mvp` bucket → 文件管理 → `covers/` 目录 → 设置 HTTP 头：`Cache-Control: public, max-age=31536000`。

* [ ] 确认 OSS 已开 CDN（如已绑域名 `ssr.vunbo.com` 或自有 CDN），CDN 层同样配长缓存。

* [ ] 用 `cURL -I` 验证：



```
curl -I "https://essay-mvp.oss-cn-guangzhou.aliyuncs.com/covers/178/...jpg"
curl -I "https://ssr.vunbo.com/favicon.png"
```

应看到 `cache-control: public, max-age=...`。



***

## 六、已实施改动记录（实际落地）

> 本节为
>
> **已经写进代码并验证**
>
> 的改动，代码均取自当前工作区真实文件（仅整理了缩进排版，属性、取值、逻辑与实际一致，未编造）。
> 实施日期：2026-10-09。方案选型：图片优化采用 
>
> `@nuxt/image`
>
> **（方案 B）**
>
> 。
> 涉及两个仓库：前端 
>
> `Website-Nuxt`
>
> 、后端 
>
> `course_server`
>
> （后端改动已提交 
>
> `649c475 feat(api): 优化 OSS 引用解析逻辑`
>
> ）。

### 6.0 新增依赖

`Website-Nuxt/package.json` 新增（实际安装版本 **@nuxt/image 2.1.0**）：



```
"dependencies": {
  "@nuxt/image": "^2.1.0",
  "nuxt": "^4.1.3",
  ...
}
```



***

### 6.1 P0-1 图片优化：接入 @nuxt/image + 阿里云 OSS 自定义 provider

#### （1）新建 `app/providers/aliyun-oss.ts`（新文件，全文）

内置 `aliyun` provider 拼的是 `?image_process=`（CDN / 全站加速格式），**不能**用于 OSS 直链；OSS 直链必须用 `?x-oss-process=...`，因此自定义 provider。要点：用 `defineProvider` 包装；modifiers 字段名是 `width/height/quality/format`（不是 `w/q`）；只对白名单内自家 OSS 域名加处理参数，本地 `/uploads`、外链、相对路径原样返回。



```
import {defineProvider} from "@nuxt/image/runtime";

// 只有这些自家 OSS/CDN 域名支持 x-oss-process；其余图片原样返回
const PROCESSABLE_HOSTS = [
  'essay-mvp.oss-cn-guangzhou.aliyuncs.com',
  // 以后若给 OSS 绑了 CDN 域名（如 cdn.vunbo.com），加到这里
]

function hostOf(url: string): string {
  try {
    return new URL(url).host
  } catch {
    return '' // 相对路径（/uploads/...）会落到这里
  }
}

export default defineProvider({
  getImage(src, {modifiers}) {
    // 本地 /uploads、外链、相对路径 —— 不加任何处理参数，原样返回
    if (!PROCESSABLE_HOSTS.includes(hostOf(src))) {
      return { url: src }
    }

    const operations: string[] = []
    const resize: string[] = []
    if (modifiers.width) resize.push(`w_${modifiers.width}`)
    if (modifiers.height) resize.push(`h_${modifiers.height}`)
    if (resize.length) operations.push(`resize,${resize.join(',')}`)

    if (modifiers.quality) operations.push(`quality,q_${modifiers.quality}`)
    if (modifiers.format) operations.push(`format,${modifiers.format}`)

    const query = operations.length
        ? `?x-oss-process=image/${operations.join('/')}`
        : ''

    return { url: src + query }
  }
})
```

#### （2）`nuxt.config.ts` 注册模块与 provider



```
export default defineNuxtConfig({
  compatibilityDate: '2026-09-26',
  modules: ['@nuxt/image'],
  css: ['~/assets/css/main.css'],
  image: {
    provider: 'aliyunoss',
    providers: {
      aliyunoss: {
        provider: '~/providers/aliyun-oss'
      }
    },
    domains: ['essay-mvp.oss-cn-guangzhou.aliyuncs.com'],
  },
  ...
})
```

> Nuxt 4 中别名 
>
> `~`
>
> /
>
> `@`
>
>  指向 
>
> `app/`
>
> （srcDir），所以 provider 放在 
>
> `app/providers/aliyun-oss.ts`
>
> 。

#### （3）4 处裸 `<img>` 替换为 `<NuxtPicture format="webp">`

`NuxtPicture` 会自动输出 `<picture>`：一套 WebP `<source>` + 原格式（jpeg/png）回退 `<img>`，并按 `sizes` 生成多档 `srcset`。

**a.&#x20;**`app/components/ArticleCard.vue`**（文章 / 范文卡片封面，16:9）**



```
<NuxtPicture
  provider="aliyunoss"
  :src="article.coverImg"
  :alt="item.title"
  width="640"
  height="360"
  :modifiers="{ width: 640, quality: 80 }"
  format="webp"
  :sizes="sizes"
  class="article-card-img"
  :loading="priority ? 'eager' : 'lazy'"
  :preload="priority ? { fetchPriority: 'high' } : false"
  decoding="async"
/>
```

**b.&#x20;**`app/pages/index.vue`**&#x20;区块入口图标（显示 40×40）**



```
<NuxtPicture
  v-if="block.icon"
  provider="aliyunoss"
  :src="block.icon"
  :alt="block.title"
  width="80"
  height="80"
  :modifiers="{ width: 80, quality: 80 }"
  format="webp"
  sizes="40px"
  class="h-10 w-10 rounded-xl object-cover ..."
  loading="lazy"
  decoding="async"
/>
```

**c.&#x20;**`app/pages/search.vue`**&#x20;结果列表缩略图（显示 96×64 容器）**



```
<NuxtPicture
  provider="aliyunoss"
  :src="item.coverImg"
  :alt="item.title"
  width="200"
  height="140"
  :modifiers="{ width: 200, quality: 80 }"
  format="webp"
  sizes="96px"
  class="h-full w-full object-cover"
  loading="lazy"
  decoding="async"
/>
```

**d.&#x20;**`app/pages/articles/[id].vue`**&#x20;正文插图（阅读区全宽，max-w-3xl）**



```
<NuxtPicture
  v-for="(src, idx) in article.bodyImages"
  :key="`${src}-${idx}`"
  provider="aliyunoss"
  :src="src"
  :alt="`${article.title} · 图 ${idx + 1}`"
  :modifiers="{ width: 1080, quality: 80 }"
  format="webp"
  sizes="sm:100vw md:720px"
  class="w-full rounded-xl border border-border/40 bg-parchment-card"
  loading="lazy"
  decoding="async"
/>
```



***

### 6.2 P0-2 首屏 LCP 图优先加载 + 响应式 sizes（关键补漏）

#### 为什么必须补 `sizes`

初版只换了组件、没传 `sizes`。实测 SSR 输出发现：NuxtPicture 按默认断点把 `srcset` 一直生成到 **w\_3072**，而浏览器在缺少 `sizes` 时默认按 **100vw** 选图，卡片实际只显示约 310\~474px，却可能下载 2048/3072 的大图，preload 还会帮倒忙预加载大图。补 `sizes` 后浏览器才会按真实显示宽度选档。

#### （1）`ArticleCard.vue` 新增 `priority`、`sizes` 两个 prop



```
const props = withDefaults(
  defineProps<{
    kind: 'article' | 'essay'
    item: ArticleSummary | EssaySummary
    // 首屏 LCP 候选图：立即加载并注入高优先级 preload；其余图片懒加载
    priority?: boolean
    // 响应式显示宽度提示，决定浏览器从 srcset 选哪一档。
    // 默认对应 1/2/3 列网格（sm:2 列、lg:3 列）；纯 2 列网格传 '320:100vw sm:50vw lg:474px'。
    sizes?: string
  }>(),
  {
    priority: false,
    // <640 单列 100vw；640~1023 两列 50vw；≥1024 容器封顶后三列约 312px
    sizes: '320:100vw sm:50vw lg:312px',
  },
)
```

> `fetchpriority`
>
>  不在 @nuxt/image 的属性透传白名单，直接写会落到 
>
> `<picture>`
>
>  上无效；正确做法是用 
>
> `preload`
>
>  prop（SSR 时注入 
>
> `<link rel="preload" as="image" imagesrcset imagesizes fetchpriority="high">`
>
> ）。

#### （2）首页推荐列表仅首张高优先（`app/pages/index.vue`）



```
<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
  <ArticleCard
    v-for="(item, index) in recommended"
    :key="item.id"
    kind="article"
    :item="item"
    :priority="index === 0"
  />
</div>
```

#### （3）纯 2 列网格显式传 2 列 sizes

`index.vue` 的「热门」「优秀作文」、`articles/[id].vue` 的「优秀作文」「相关推荐」（均为 `sm:grid-cols-2`，lg 下卡片约 474px）：



```
<ArticleCard
  v-for="item in hot"
  :key="item.id"
  kind="article"
  :item="item"
  sizes="320:100vw sm:50vw lg:474px"
/>
```

> 3 列网格（首页推荐、
>
> `articles/index.vue`
>
> 、
>
> `essays/index.vue`
>
> ）不传，用组件默认值 
>
> `320:100vw sm:50vw lg:312px`
>
> 。

#### （4）各场景 sizes 与实际生成档位（SSR 实测）



| 场景        | sizes（源码写法）                  | 浏览器解析后的 sizes                                             | webp srcset 宽度档           |
| --------- | ---------------------------- | --------------------------------------------------------- | ------------------------- |
| 3 列卡片（默认） | `320:100vw sm:50vw lg:312px` | `(max-width:639px) 100vw, (max-width:1023px) 50vw, 312px` | 312 / 320 / 624 / **640** |
| 2 列卡片     | `320:100vw sm:50vw lg:474px` | `(max-width:639px) 100vw, (max-width:1023px) 50vw, 474px` | 至～948（2x）                 |
| 区块图标      | `40px`                       | `40px`                                                    | 40 / 80                   |
| 搜索缩略图     | `96px`                       | `96px`                                                    | 96 / 192                  |
| 正文全宽图     | `sm:100vw md:720px`          | `(max-width:767px) 100vw, 720px`                          | 640 / 720 / 1280 / 1440   |

3 列卡片最大档由原来的 **3072w 收窄到 640w**。OSS 图同时输出 webp 与原格式（png/jpeg）两套 source。



***

### 6.3 P0-3 缓存策略

#### （1）OSS 侧（运维，已在控制台完成）

对 bucket `essay-mvp` 的 `covers/` 目录设置 HTTP 头：



```
Cache-Control: public, max-age=31536000, immutable
```

#### （2）favicon 补缓存头（`nuxt.config.ts` → `routeRules`）

生产构建实测：根 `public/` 下的固定文件**默认不发任何 cache-control**，故 favicon 需要手动配；而带内容 hash 的 `/_nuxt/**` 由 Nitro **自动**发 `public, max-age=31536000, immutable`，无需配置（配了是冗余）。



```
routeRules: {
  '/**': { headers: securityHeaders },
  // favicon 文件名固定、极少变更：缓存 30 天，达到 Lighthouse 静态资源缓存阈值。
  // 更换图标时请改文件名或在引用处加 ?v= 破缓存。
  // 注意：带内容 hash 的 /_nuxt/** 构建产物由 Nitro 自动发 public,max-age=31536000,immutable，无需在此配置。
  '/favicon.png': {
    headers: {
      ...securityHeaders,
      'cache-control': 'public, max-age=2592000',
    },
  },
  '/api/**': { proxy: `${apiOrigin}/api/**` },
  ...
}
```



***

### 6.4 P1-2 OSS 域名 preconnect /dns-prefetch（`nuxt.config.ts`）



```
// 首屏封面图所在的 OSS 直链域名，用于 preconnect 提前建连
const ossOrigin = 'https://essay-mvp.oss-cn-guangzhou.aliyuncs.com'
```



```
link: [
  // 首屏封面图来自 OSS：提前完成 DNS/TCP/TLS 建连，缩短首个图片请求（利好 LCP）。
  // 普通 <img>/<picture> 不是 CORS 请求，这里切勿加 crossorigin，否则会建一条用不上的连接、反而重复握手。
  { rel: 'preconnect', href: ossOrigin },
  { rel: 'dns-prefetch', href: ossOrigin },
  { rel: 'icon', type: 'image/png', href: '/favicon.png' },
  { rel: 'apple-touch-icon', href: '/favicon.png' },
],
```

> 原建议稿里写过 
>
> `crossOrigin: 'anonymous'`
>
> ，那适用于 webfont；封面图是普通图片请求，
>
> **落地时刻意不加 crossorigin**
>
> 。



***

### 6.5 本地开发配套修复（让本地 /uploads 图片能正常显示）

> 这部分不是线上性能优化，而是接入图片组件 + 本地联调时的必要修复，一并记录。

**（1）前端&#x20;**`nuxt.config.ts`**&#x20;增加本地后端静态资源代理：**



```
'/uploads/**': { proxy: `${apiOrigin}/uploads/**` },
```

**（2）后端&#x20;**`course_server/internal/pkg/ossutil/client.go`**（已提交 649c475）：**

`ResolvePublicURL` 原先会把任何不含 `://` 的字符串都当作裸 OSS key 拼 OSS URL，导致本地 `/uploads/covers/x.jpg` 被错误拼成 OSS 地址。新增前缀短路：



```
// ResolvePublicURL 读时解析：OSS 引用 → 当前配置的 PublicURL；外链与本地静态资源原样返回。
func (c *Client) ResolvePublicURL(ref string) string {
	ref = strings.TrimSpace(ref)
	if ref == "" {
		return ""
	}
	// 本地静态资源（r.Static("/uploads", ...)，如头像、本地开发占位封面）不走 OSS，
	// 原样返回相对路径，交给前端同源访问 / 反代。
	if strings.HasPrefix(ref, "/uploads/") {
		return ref
	}
	if key, ok := c.parseObjectKey(ref); ok {
		return c.PublicURL(key)
	}
	...
}
```

该改动对生产安全：生产封面存的是 OSS key，不以 `/uploads/` 开头。

**（3）本地测试数据（不进生产逻辑）：** 后端 `course_server/uploads/covers/1..5.jpg` 放了 5 张 640×360 占位图，并把本地库 articles 表 id 1\~12 的 `cover_img` 临时指向 `/uploads/covers/*.jpg`，仅用于本地开发看到图片。



***

### 6.6 验证结果（均为实测，非推断）

**类型检查：** `pnpm typecheck` 退出码 0，无 TS 错误（日志中的 `ERR_PACKAGE_PATH_NOT_EXPORTED` 为 vue-router/volar 既有工具链 warning，与本次无关）。

**SSR HTML（dev，首页&#x20;**`/`**）：**



* 图片 preload 恰好 **1 个**，`fetchpriority="high"`，并带正确 `imagesizes`；其 `imagesrcset` 档位收窄为 `312/320/624/640w`（不再有 3072w）。

* `loading` 分布：**eager 1 / lazy 11**（仅推荐首张立即加载）。

* 卡片 sizes 三种并存：`40px`（图标）、`...312px`（3 列）、`...474px`（2 列）。

**OSS 图（**`/articles`**&#x20;列表中真实 OSS 封面）：** 同一图输出 webp 与 png 两套 `<source>`，srcset 各断点为 `resize,w_640 ... w_3072` → 补 sizes 后 3 列卡片收窄为 `w_312/320/624/640`，处理参数形如：



```
https://essay-mvp.oss-cn-guangzhou.aliyuncs.com/.../xxx.png?x-oss-process=image/resize,w_640,h_360/format,webp
```

**生产构建（**`pnpm build`**&#x20;后&#x20;**`node .output/server/index.mjs`**）实测响应头：**



| 资源                    | 实测 Cache-Control                                     |
| --------------------- | ---------------------------------------------------- |
| `/_nuxt/*.js`（带 hash） | `public, max-age=31536000, immutable`（Nitro 默认，未手动配） |
| `/favicon.png`        | `public, max-age=2592000`（本次新增，安全头 nosniff 等仍在）      |
| 首页 HTML               | `s-maxage=60, stale-while-revalidate`（SWR，未被污染）      |

`<head>` 实测输出（无 crossorigin）：



```
<link rel="preconnect" href="https://essay-mvp.oss-cn-guangzhou.aliyuncs.com">
<link rel="dns-prefetch" href="https://essay-mvp.oss-cn-guangzhou.aliyuncs.com">
```



***

### 6.7 本次改动文件清单

**前端&#x20;**`Website-Nuxt`**（未提交）**



* `package.json` / `pnpm-lock.yaml`：新增 `@nuxt/image ^2.1.0`

* `nuxt.config.ts`：注册 @nuxt/image 与自定义 provider、OSS 域名 preconnect/dns-prefetch、favicon 缓存头、`/uploads/**` 代理

* `app/providers/aliyun-oss.ts`：新增，OSS x-oss-process 自定义 provider

* `app/components/ArticleCard.vue`：`<img>`→`<NuxtPicture>`，新增 `priority`/`sizes` prop

* `app/pages/index.vue`：区块图标换 NuxtPicture（40px）、推荐首张 priority、热门 / 优秀作文传 2 列 sizes

* `app/pages/search.vue`：缩略图换 NuxtPicture（96px）

* `app/pages/articles/[id].vue`：正文图换 NuxtPicture（720px）、优秀作文 / 相关推荐传 2 列 sizes

* `docs/lighthouse-performance-optimization.md`：本文档

**后端&#x20;**`course_server`**（已提交 649c475，scope=api）**



* `internal/pkg/ossutil/client.go`：`ResolvePublicURL` 增加 `/uploads/` 前缀原样返回

* `uploads/covers/1..5.jpg`：本地开发占位图（未跟踪）

> 提交时按仓库 AGENTS.md 分批：后端 
>
> `course_server`
>
>  用 scope 
>
> `api`
>
> ，前端 
>
> `Website-Nuxt`
>
>  用 scope 
>
> `common`
>
> ，不要合并为一次提交。



***

### 6.8 尚未实施（沿用第二～五章建议）



* **P1-1 favicon 瘦身**：当前仍是 512×512 PNG 显示 32×32，待改 SVG + 多尺寸（32/48/180）；换新文件名后可把缓存升级为 immutable 一年。

* **P1-3 TTFB / SSR 数据阻塞**：首页 `await useAsyncData('home', ...)` 仍阻塞首字节，待评估流式渲染或预渲染。

* **P2-1** 页面切换 `pageTransition out-in` 时长、**P2-2** 移动端 `background-attachment: fixed` repaint、**P2-3** render-blocking 复测。

* 全部上线后重跑一次 Lighthouse 复核分数与残留审计。