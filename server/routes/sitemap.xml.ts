import type { ApiResponse, PageData } from '~/types/content'

const STATIC_PATHS = ['/', '/category', '/articles', '/essays', '/download-guide', '/open-miniprogram']
const PAGE_SIZE = 50
// ponytail: 最多 20 页 × 50 条。超过后 sitemap 会漏新内容，应改成索引 sitemap 分页。
const MAX_PAGES = 20

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

async function collectIds(endpoint: string) {
  const ids: number[] = []
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const body = await $fetch<ApiResponse<PageData<{ id: number }>>>(endpoint, {
      query: { page, pageSize: PAGE_SIZE },
    })
    if (!body || body.code !== 0) break
    const list = body.data?.list || []
    for (const item of list) ids.push(item.id)
    const total = Number(body.data?.total) || 0
    if (list.length < PAGE_SIZE || page * PAGE_SIZE >= total) break
  }
  return ids
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const site = String(config.public.siteUrl).replace(/\/$/, '')
  const paths = new Set(STATIC_PATHS)

  try {
    const [articles, essays] = await Promise.all([
      collectIds(`${config.apiOrigin}/api/v1/articles`),
      collectIds(`${config.apiOrigin}/api/v1/essays`),
    ])
    for (const id of articles) paths.add(`/articles/${id}`)
    for (const id of essays) paths.add(`/essays/${id}`)
  } catch {
    // 后端不可用时仍返回静态入口，避免爬虫拿到 500
  }

  const body = [...paths]
    .map((path) => `  <url><loc>${escapeXml(`${site}${path}`)}</loc></url>`)
    .join('\n')

  setHeader(event, 'content-type', 'application/xml; charset=utf-8')
  setHeader(event, 'cache-control', 'public, max-age=600')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`
})
