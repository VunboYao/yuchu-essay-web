import type { MaybeRefOrGetter } from 'vue'

type JsonLd = Record<string, unknown>

export function useSiteSeo(options: {
  title: MaybeRefOrGetter<string>
  description?: MaybeRefOrGetter<string>
  robots?: MaybeRefOrGetter<string | undefined>
  ogType?: MaybeRefOrGetter<'website' | 'article'>
  image?: MaybeRefOrGetter<string | undefined>
  jsonLd?: MaybeRefOrGetter<JsonLd | JsonLd[] | null>
}) {
  const config = useRuntimeConfig()
  const route = useRoute()

  const title = computed(() => toValue(options.title))
  const description = computed(
    () => toValue(options.description) || config.public.siteDescription,
  )
  const canonical = computed(() => {
    const url = new URL(route.path, config.public.siteUrl)
    for (const [key, value] of Object.entries(route.query)) {
      if (typeof value === 'string' && value) url.searchParams.set(key, value)
    }
    return url.href
  })
  const image = computed(() => toValue(options.image))
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
    twitterCard: computed(() => (image.value ? 'summary_large_image' : 'summary')),
    twitterTitle: title,
    twitterDescription: description,
    twitterImage: image,
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
