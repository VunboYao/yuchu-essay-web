export default defineEventHandler((event) => {
  const config = useRuntimeConfig()
  const site = String(config.public.siteUrl).replace(/\/$/, '')
  setHeader(event, 'content-type', 'text/plain; charset=utf-8')
  setHeader(event, 'cache-control', 'public, max-age=3600')
  return `User-agent: *\nAllow: /\nDisallow: /search\n\nSitemap: ${site}/sitemap.xml\n`
})
