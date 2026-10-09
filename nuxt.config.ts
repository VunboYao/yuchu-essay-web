import tailwindcss from '@tailwindcss/vite'

const apiOrigin = process.env.NUXT_API_ORIGIN || 'http://localhost:8080'

// 首屏封面图所在的 OSS 直链域名，用于 preconnect 提前建连
const ossOrigin = 'https://essay-mvp.oss-cn-guangzhou.aliyuncs.com'

const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'SAMEORIGIN',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
}

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
  vite: {
    plugins: [tailwindcss()],
    build: {
      // 全站 CSS 合并为单个文件：首屏 render-blocking 样式请求由 3 个降为 1 个，
      // 一次 immutable 缓存后全站复用；本站全站 CSS（brotli 后约 6.5KB）很小，适用。
      cssCodeSplit: false,
    },
  },
  devServer: {
    port: 5176,
  },
  runtimeConfig: {
    apiOrigin,
    public: {
      apiBase: '/api/v1',
      siteUrl: 'http://localhost:5176',
      siteName: '予初作文',
      siteDescription:
        'AI批改,单元指导、习作范文与素材积累，结构清晰、随时可查。完整收藏与资料下载请在微信小程序中使用。',
    },
  },
  app: {
    head: {
      htmlAttrs: { lang: 'zh-CN' },
      title: '予初作文',
      titleTemplate: '%s · 予初作文',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'theme-color', content: '#f5f1e8' },
        { name: 'format-detection', content: 'telephone=no' },
      ],
      link: [
        // 首屏封面图来自 OSS：提前完成 DNS/TCP/TLS 建连，缩短首个图片请求（利好 LCP）。
        // 普通 <img>/<picture> 不是 CORS 请求，这里切勿加 crossorigin，否则会建一条用不上的连接、反而重复握手。
        { rel: 'preconnect', href: ossOrigin },
        { rel: 'dns-prefetch', href: ossOrigin },
        { rel: 'icon', type: 'image/png', href: '/favicon.png' },
        { rel: 'apple-touch-icon', href: '/favicon.png' },
      ],
    },
    pageTransition: { name: 'page', mode: 'out-in' },
  },
  nitro: {
    compressPublicAssets: true,
    prerender: {
      // 只生成下面列出的路由。打开 crawlLinks 会顺着分类页把文章详情全部抓进构建。
      crawlLinks: false,
      routes: ['/category', '/download-guide', '/open-miniprogram', '/search'],
    },
  },
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
    '/uploads/**': { proxy: `${apiOrigin}/uploads/**` },
    // 首页 HTML 缓存 60 秒。年级筛选不进这个 URL，见 app/pages/index.vue。
    // ponytail: SWR 会把首次渲染结果（含失败页）缓存到 TTL。升级路径是只缓存 HTTP 200。
    '/': { swr: 60 },
    '/category': { prerender: true },
    '/articles': { swr: 120 },
    '/articles/**': { swr: 600 },
    '/essays': { swr: 120 },
    '/essays/**': { swr: 600 },
    '/search': {
      prerender: true,
      headers: {
        ...securityHeaders,
        'X-Robots-Tag': 'noindex, follow',
      },
    },
    '/download-guide': { prerender: true },
    '/open-miniprogram': { prerender: true },
  },
})
