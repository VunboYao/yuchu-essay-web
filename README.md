# Website-Nuxt · 予初作文内容官网

Nuxt 4 混合渲染版本，页面、文案和视觉对齐 [`Website-Vue`](../Website-Vue)。公开阅读继续走 `course_server` 的 C 端 `/api/v1`。收藏、登录、下载签链仍只在小程序完成。

渲染、首页性能和 SEO 的取舍见 [`docs/渲染与性能.md`](./docs/渲染与性能.md)。性能优化做了什么、漏了什么、每个数字怎么量出来的，见 [`docs/ssr-performance-interview.md`](./docs/ssr-performance-interview.md)。

## 快速开始

```bash
# 1. 启动后端（仓库根下）
cd course_server && air    # http://localhost:8080

# 2. 启动本站
cd Website-Nuxt
pnpm install
pnpm dev                   # http://localhost:5176
```

其它命令：`pnpm test` · `pnpm typecheck` · `pnpm build` · `pnpm preview`

构建期会预渲染分类、下载说明、打开小程序和搜索壳，需要能访问 `NUXT_API_ORIGIN`（默认 `http://localhost:8080`）。

## 环境变量

复制 [`.env.example`](./.env.example)。

| 变量 | 作用 |
|---|---|
| `NUXT_API_ORIGIN` | 服务端直连的 course_server，默认 `http://localhost:8080` |
| `NUXT_PUBLIC_API_BASE` | 浏览器请求前缀，默认 `/api/v1`，由 Nitro 反代 |
| `NUXT_PUBLIC_SITE_URL` | canonical、Open Graph、sitemap 的站点绝对地址 |

改 `NUXT_API_ORIGIN` 后需要重启，路由代理在启动时读取。

## 路由

| 路径 | 渲染 |
|---|---|
| `/` | SWR 60 秒。HTML 是「未选年级」的首页 |
| `/category` | 构建时预渲染 |
| `/articles`、`/essays` | SWR 120 秒，查询串各自缓存 |
| `/articles/:id`、`/essays/:id` | SWR 10 分钟 |
| `/search` | 预渲染搜索壳，结果只在浏览器请求，`noindex` |
| `/download-guide`、`/open-miniprogram` | 构建时预渲染 |
