<script setup lang="ts">
import { computed } from 'vue'
import { ApiError } from '~/utils/http'
import { apiGet } from '~/utils/api'
import { articleMeta } from '~/utils/nav'
import { absoluteHttpUrl } from '~/utils/text'
import type { ArticleDetailPayload } from '~/types/content'

const route = useRoute()
const router = useRouter()
const id = computed(() => String(route.params.id || ''))

const { data, error, status, refresh } = await useAsyncData(
  () => `article:${id.value}`,
  () => apiGet<ArticleDetailPayload>(`/articles/${id.value}`),
  { watch: [id] },
)

const article = computed(() => data.value?.article)
const related = computed(() => data.value?.relatedArticles || [])
const downloads = computed(() => data.value?.freeDownloads || [])
const essays = computed(() => data.value?.article?.essays || [])
const loading = computed(() => status.value === 'pending' && !data.value)
const loadError = computed(() => {
  if (data.value || !error.value) return ''
  return error.value instanceof ApiError ? error.value.message : '加载失败'
})

function goBack() {
  if (import.meta.client && window.history.state?.back != null) {
    router.back()
    return
  }
  void navigateTo('/articles')
}

const origin = useRuntimeConfig().public.siteUrl
function siteUrl(path: string) {
  return new URL(path, origin).href
}

useSiteSeo({
  title: () => article.value?.title || '文章详情',
  description: () => article.value?.summary || '小学语文作文文章',
  ogType: 'article',
  image: () => absoluteHttpUrl(article.value?.coverImg),
  jsonLd: () => {
    if (!article.value) return null
    const pageUrl = siteUrl(route.path)
    return [
      {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: article.value.title,
        description: article.value.summary || undefined,
        image: absoluteHttpUrl(article.value.coverImg),
        inLanguage: 'zh-CN',
        mainEntityOfPage: pageUrl,
        author: { '@type': 'Organization', name: '予初作文' },
        publisher: { '@type': 'Organization', name: '予初作文' },
      },
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: '首页', item: siteUrl('/') },
          { '@type': 'ListItem', position: 2, name: '文章', item: siteUrl('/articles') },
          { '@type': 'ListItem', position: 3, name: article.value.title, item: pageUrl },
        ],
      },
    ]
  },
})
</script>

<template>
  <PageShell width="reading">
    <div v-if="loading" class="space-y-4" aria-busy="true">
      <div class="h-8 w-2/3 animate-pulse rounded bg-parchment-200/80" />
      <div class="h-4 w-1/2 animate-pulse rounded bg-parchment-200/80" />
      <div class="aspect-[3/4] animate-pulse rounded-2xl bg-parchment-200/80" />
    </div>

    <div
      v-else-if="loadError"
      class="rounded-2xl border border-dashed border-border-strong bg-parchment-card px-6 py-10 text-center"
    >
      <p class="font-display text-lg text-ink-900">文章加载失败</p>
      <p class="mt-2 text-sm text-ink-muted">{{ loadError }}</p>
      <button
        type="button"
        class="mt-6 rounded-full bg-jade-500 px-5 py-2 text-sm text-parchment-card"
        @click="refresh()"
      >
        重新加载
      </button>
    </div>

    <article v-else-if="article">
      <p class="text-sm text-jade-500">
        {{ articleMeta(article.grade, article.semester, article.unit) }}
      </p>
      <h1 class="mt-2 font-display text-2xl font-semibold leading-snug text-ink-900 sm:text-3xl">
        {{ article.title }}
      </h1>
      <p v-if="article.summary" class="mt-3 text-base leading-relaxed text-ink-secondary">
        {{ article.summary }}
      </p>

      <div
        class="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-jade-400/30 bg-jade-soft/40 px-4 py-3"
      >
        <OpenMiniProgramCTA label="去小程序收藏 / 下载" size="sm" />
        <NuxtLink to="/download-guide" class="text-sm text-ink-muted hover:text-jade-600">
          下载说明
        </NuxtLink>
        <button
          type="button"
          class="cursor-pointer text-sm text-ink-muted hover:text-jade-600"
          @click="goBack"
        >
          返回上一页
        </button>
      </div>

      <div v-if="article.bodyImages?.length" class="mt-8 space-y-3">
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

      </div>
      <div
        v-else
        class="mt-8 rounded-2xl border border-dashed border-border bg-parchment-card px-4 py-10 text-center text-sm text-ink-muted"
      >
        暂无正文长图
      </div>

      <section v-if="downloads.length" class="mt-10">
        <h2 class="font-display text-lg font-semibold text-ink-900">相关资料</h2>
        <ul class="mt-3 space-y-2">
          <li
            v-for="f in downloads"
            :key="f.id"
            class="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-parchment-card px-4 py-3"
          >
            <span class="min-w-0 truncate text-sm text-ink-900">{{ f.fileName }}</span>
            <NuxtLink to="/open-miniprogram" class="shrink-0 text-sm text-jade-500">
              小程序下载
            </NuxtLink>
          </li>
        </ul>
      </section>

      <section v-if="essays.length" class="mt-10">
        <h2 class="font-display text-lg font-semibold text-ink-900">优秀作文</h2>
        <div class="mt-3 grid gap-3 sm:grid-cols-2">
          <ArticleCard
            v-for="e in essays"
            :key="e.id"
            kind="essay"
            :item="e"
            sizes="320:100vw sm:50vw lg:474px"
          />
        </div>
      </section>

      <section v-if="related.length" class="mt-10">
        <h2 class="font-display text-lg font-semibold text-ink-900">相关推荐</h2>
        <div class="mt-3 grid gap-3 sm:grid-cols-2">
          <ArticleCard
            v-for="a in related"
            :key="a.id"
            kind="article"
            :item="a"
            sizes="320:100vw sm:50vw lg:474px"
          />
        </div>
      </section>

      <div class="mt-12 border-t border-border/50 pt-6 text-center">
        <OpenMiniProgramCTA label="在小程序中打开本篇" />
      </div>
    </article>
  </PageShell>
</template>
