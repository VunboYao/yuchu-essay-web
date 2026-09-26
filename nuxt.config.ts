import tailwindcss from '@tailwindcss/vite'

const apiOrigin = process.env.NUXT_API_ORIGIN || 'http://localhost:8080'

const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'SAMEORIGIN',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
}

export default defineNuxtConfig({
  compatibilityDate: '2026-09-26',
  css: ['~/assets/css/main.css'],
  vite: {
    plugins: [tailwindcss()],
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
        '单元指导、习作范文与素材积累，结构清晰、随时可查。完整收藏与资料下载请在微信小程序中使用。',
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
    '/api/**': { proxy: `${apiOrigin}/api/**` },
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
