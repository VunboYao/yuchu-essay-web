import type { MaybeRefOrGetter } from 'vue'
import { absoluteSiteUrl } from '~/utils/text'

type JsonLd = Record<string, unknown>

/**
 * 站点默认分享图，随 public/og-default.png 一起发布（1200×630）。
 * 页面不传 image 时兜底，避免出现「ogImage is undefined」这种没有卡片图的分享。
 */
const DEFAULT_OG_IMAGE = '/og-default.png'

export function useSiteSeo(options: {
  title: MaybeRefOrGetter<string>
  description?: MaybeRefOrGetter<string>
  robots?: MaybeRefOrGetter<string | undefined>
  ogType?: MaybeRefOrGetter<'website' | 'article'>
  /** 站内路径（/og-articles.png）或完整 http(s) 地址；不传用默认分享图 */
  image?: MaybeRefOrGetter<string | undefined>
  imageAlt?: MaybeRefOrGetter<string | undefined>
  jsonLd?: MaybeRefOrGetter<JsonLd | JsonLd[] | null>
}) {
  const config = useRuntimeConfig()
  const route = useRoute()
  const siteUrl = String(config.public.siteUrl).replace(/\/$/, '')

  const title = computed(() => toValue(options.title))
  const description = computed(
    () => toValue(options.description) || config.public.siteDescription,
  )
  const canonical = computed(() => {
    const url = new URL(route.path, `${siteUrl}/`)
    for (const [key, value] of Object.entries(route.query)) {
      if (typeof value === 'string' && value) url.searchParams.set(key, value)
    }
    return url.href
  })
  // og:image / twitter:image 只认绝对地址：页面给的相对路径补域名，脏值退回默认图
  const image = computed(
    () => absoluteSiteUrl(siteUrl, toValue(options.image)) || `${siteUrl}${DEFAULT_OG_IMAGE}`,
  )
  const imageAlt = computed(() => toValue(options.imageAlt) || title.value)
  const robots = computed(() => toValue(options.robots))

  useSeoMeta({
    title,
    description,
    ogTitle: title,
    ogDescription: description,
    ogType: computed(() => toValue(options.ogType) || 'website'),
    ogUrl: canonical,
    ogSiteName: config.public.siteName,
    ogLocale: 'zh_CN',
    ogImage: image,
    ogImageAlt: imageAlt,
    // 分享图统一 1200×630，恒为宽卡
    twitterCard: 'summary_large_image',
    twitterTitle: title,
    twitterDescription: description,
    twitterImage: image,
    twitterImageAlt: imageAlt,
    robots,
  })

  useHead({
    link: computed(() => [{ rel: 'canonical', href: canonical.value }]),
    script: computed(() => {
      const data = toValue(options.jsonLd)
      if (!data) return []
      const payload = Array.isArray(data) ? data : [data]
      return payload.map((item, index) => ({
        key: `ld-json-${index}`,
        type: 'application/ld+json',
        innerHTML: JSON.stringify(item).replace(/</g, '\\u003c'),
      }))
    }),
  })

  return { canonical }
}
