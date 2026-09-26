<script setup lang="ts">
import { computed } from 'vue'
import { ApiError } from '~/utils/http'
import { apiGet } from '~/utils/api'
import { articleMeta } from '~/utils/nav'
import { plainText } from '~/utils/text'
import type { EssayDetailPayload } from '~/types/content'

const route = useRoute()
const router = useRouter()
const id = computed(() => String(route.params.id || ''))

const { data, error, status, refresh } = await useAsyncData(
  () => `essay:${id.value}`,
  () => apiGet<EssayDetailPayload>(`/essays/${id.value}`),
  { watch: [id] },
)

const essay = computed(() => data.value?.essay)
const linkedArticle = computed(() => data.value?.article)
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
  void navigateTo('/essays')
}

const origin = useRuntimeConfig().public.siteUrl
function siteUrl(path: string) {
  return new URL(path, origin).href
}

useSiteSeo({
  title: () => essay.value?.title || '作文详情',
  description: () => plainText(essay.value?.body) || '小学优秀作文',
  ogType: 'article',
  jsonLd: () => {
    if (!essay.value) return null
    const pageUrl = siteUrl(route.path)
    return [
      {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: essay.value.title,
        description: plainText(essay.value.body) || undefined,
        wordCount: essay.value.wordCount || undefined,
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
          { '@type': 'ListItem', position: 2, name: '优秀作文', item: siteUrl('/essays') },
          { '@type': 'ListItem', position: 3, name: essay.value.title, item: pageUrl },
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
      <div class="h-4 w-1/3 animate-pulse rounded bg-parchment-200/80" />
      <div class="h-64 animate-pulse rounded-2xl bg-parchment-200/80" />
    </div>

    <div
      v-else-if="loadError"
      class="rounded-2xl border border-dashed border-border-strong bg-parchment-card px-6 py-10 text-center"
    >
      <p class="font-display text-lg text-ink-900">作文加载失败</p>
      <p class="mt-2 text-sm text-ink-muted">{{ loadError }}</p>
      <button
        type="button"
        class="mt-6 rounded-full bg-jade-500 px-5 py-2 text-sm text-parchment-card"
        @click="refresh()"
      >
        重新加载
      </button>
    </div>

    <article v-else-if="essay">
      <p class="text-sm text-jade-500">
        {{ essay.grade }}年级 · {{ essay.wordCount || 0 }} 字
      </p>
      <h1 class="mt-2 font-display text-2xl font-semibold leading-snug text-ink-900 sm:text-3xl">
        {{ essay.title }}
      </h1>

      <div
        class="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-jade-400/30 bg-jade-soft/40 px-4 py-3"
      >
        <OpenMiniProgramCTA label="去小程序收藏" size="sm" />
        <button
          type="button"
          class="cursor-pointer text-sm text-ink-muted hover:text-jade-600"
          @click="goBack"
        >
          返回上一页
        </button>
      </div>

      <!-- 正文来自后台编辑器，与小程序 rich-text 同源，不是访客输入 -->
      <div
        v-if="essay.body"
        class="essay-prose mt-8 rounded-2xl border border-border/70 bg-parchment-card px-5 py-6 sm:px-7 sm:py-8"
        v-html="essay.body"
      />
      <div
        v-else
        class="mt-8 rounded-2xl border border-dashed border-border bg-parchment-card px-4 py-10 text-center text-sm text-ink-muted"
      >
        暂无正文
      </div>

      <section
        v-if="essay.comment"
        class="mt-8 rounded-2xl border border-accent/20 bg-accent-soft/40 px-5 py-6 sm:px-7"
      >
        <h2 class="font-display text-lg font-semibold text-ink-900">范文点评</h2>
        <div class="essay-prose mt-3" v-html="essay.comment" />
      </section>

      <section
        v-if="linkedArticle"
        class="mt-8 rounded-2xl border border-border/70 bg-parchment-card px-5 py-5"
      >
        <h2 class="font-display text-base font-semibold text-ink-900">所属专题</h2>
        <NuxtLink
          :to="`/articles/${linkedArticle.id}`"
          class="group mt-3 flex items-center justify-between gap-3"
        >
          <div class="min-w-0">
            <p class="truncate font-medium text-ink-900 group-hover:text-jade-700">
              {{ linkedArticle.title }}
            </p>
            <p class="mt-1 text-sm text-ink-muted">
              {{ articleMeta(linkedArticle.grade, linkedArticle.semester, linkedArticle.unit) }}
            </p>
          </div>
          <span class="shrink-0 text-jade-500" aria-hidden="true">›</span>
        </NuxtLink>
      </section>

      <div class="mt-12 border-t border-border/50 pt-6 text-center">
        <OpenMiniProgramCTA label="在小程序中打开本篇" />
      </div>
    </article>
  </PageShell>
</template>
