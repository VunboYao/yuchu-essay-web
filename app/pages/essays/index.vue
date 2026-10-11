<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ApiError } from '~/utils/http'
import { apiGet } from '~/utils/api'
import { gradeLabel } from '~/utils/categoryTree'
import type { EssayListPageData, EssaySummary } from '~/types/content'
import { GRADE_OPTIONS } from '~/composables/useSelectedGrade'

definePageMeta({ keepalive: true })

const route = useRoute()
const router = useRouter()
const pageSize = 12

const queryGrade = computed(() => String(route.query.grade ?? ''))
const queryTagId = computed(() => String(route.query.tagId ?? ''))
const filterKey = computed(() => [queryGrade.value, queryTagId.value].join('|'))

const resultTitle = computed(() => {
  if (!queryGrade.value) return '优秀作文'
  return `${gradeLabel(queryGrade.value)}优秀作文`
})

function patchQuery(patch: Record<string, string>) {
  const next: Record<string, string> = {
    grade: queryGrade.value,
    tagId: queryTagId.value,
    ...patch,
  }
  const cleaned: Record<string, string> = {}
  for (const [key, value] of Object.entries(next)) {
    if (value) cleaned[key] = value
  }
  router.replace({ path: '/essays', query: cleaned })
}

const { data, error, status, refresh } = await useAsyncData(
  () => `essays:${filterKey.value}`,
  () =>
    apiGet<EssayListPageData>('/essays', {
      query: {
        page: 1,
        pageSize,
        grade: queryGrade.value,
        tagId: queryTagId.value,
      },
    }),
  { watch: [filterKey], dedupe: 'cancel' },
)

const extras = ref<EssaySummary[]>([])
const moreLoading = ref(false)
const morePage = ref(2)

watch(filterKey, () => {
  extras.value = []
  morePage.value = 2
})

const list = computed(() => [...(data.value?.list || []), ...extras.value])
const filterTags = computed(() => data.value?.filterTags || [])
const total = computed(() => Number(data.value?.total) || 0)
const hasMore = computed(() => list.value.length < total.value)
const loading = computed(() => status.value === 'pending' && !data.value)
const loadError = computed(() => {
  if (data.value || !error.value) return ''
  return error.value instanceof ApiError ? error.value.message : '加载失败'
})

async function loadMore() {
  if (moreLoading.value || !hasMore.value) return
  moreLoading.value = true
  try {
    const page = await apiGet<EssayListPageData>('/essays', {
      query: {
        page: morePage.value,
        pageSize,
        grade: queryGrade.value,
        tagId: queryTagId.value,
      },
    })
    extras.value = extras.value.concat(page.list || [])
    morePage.value += 1
  } catch {
    /* 加载更多失败时保留已有列表 */
  } finally {
    moreLoading.value = false
  }
}

useSiteSeo({
  title: resultTitle,
  description: '公开阅读的小学优秀作文，收藏请在微信小程序完成。',
  image: '/og-essays.png',
})
</script>

<template>
  <PageShell>
    <header class="mb-6">
      <h1 class="font-display text-2xl font-semibold text-ink-900 sm:text-3xl">{{ resultTitle }}</h1>
      <p class="mt-2 text-sm text-ink-muted">共 {{ total }} 篇 · 公开阅读，收藏请在小程序完成</p>
    </header>

    <div class="mb-6 flex flex-col gap-4 rounded-2xl border border-border/70 bg-parchment-card p-4 sm:p-5">
      <div>
        <p class="mb-2 text-xs font-medium text-ink-muted">年级</p>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="g in GRADE_OPTIONS"
            :key="g.value === '' ? 'all' : g.value"
            type="button"
            class="rounded-full border px-3 py-1.5 text-sm"
            :class="
              queryGrade === g.value
                ? 'border-jade-500 bg-jade-500 text-parchment-card'
                : 'border-border text-ink-secondary hover:border-jade-400'
            "
            @click="patchQuery({ grade: g.value, tagId: '' })"
          >
            {{ g.label }}
          </button>
        </div>
      </div>
      <div v-if="filterTags.length">
        <p class="mb-2 text-xs font-medium text-ink-muted">标签</p>
        <div class="flex flex-wrap gap-2">
          <button
            type="button"
            class="rounded-full border px-3 py-1.5 text-sm"
            :class="
              !queryTagId
                ? 'border-jade-500 bg-jade-soft font-medium text-jade-700'
                : 'border-border text-ink-secondary hover:border-jade-400'
            "
            @click="patchQuery({ tagId: '' })"
          >
            全部
          </button>
          <button
            v-for="tag in filterTags"
            :key="tag.id"
            type="button"
            class="rounded-full border px-3 py-1.5 text-sm"
            :class="
              queryTagId === String(tag.id)
                ? 'border-jade-500 bg-jade-soft font-medium text-jade-700'
                : 'border-border text-ink-secondary hover:border-jade-400'
            "
            @click="patchQuery({ tagId: String(tag.id) })"
          >
            {{ tag.name }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="loading" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
      <div v-for="i in 6" :key="i" class="h-28 animate-pulse rounded-2xl bg-parchment-200/80" />
    </div>

    <div
      v-else-if="loadError"
      class="rounded-2xl border border-dashed border-border-strong bg-parchment-card px-6 py-10 text-center"
    >
      <p class="font-display text-lg text-ink-900">列表加载失败</p>
      <p class="mt-2 text-sm text-ink-muted">{{ loadError }}</p>
      <button
        type="button"
        class="mt-6 rounded-full bg-jade-500 px-5 py-2 text-sm text-parchment-card"
        @click="refresh()"
      >
        重新加载
      </button>
    </div>

    <template v-else>
      <div v-if="list.length" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <ArticleCard v-for="item in list" :key="item.id" kind="essay" :item="item" />
      </div>
      <p
        v-else
        class="rounded-2xl border border-dashed border-border bg-parchment-card px-6 py-12 text-center text-ink-muted"
      >
        暂无优秀作文
      </p>

      <div v-if="hasMore" class="mt-8 flex justify-center">
        <button
          type="button"
          class="rounded-full border border-border bg-parchment-card px-6 py-2.5 text-sm text-ink-700 hover:border-jade-500 disabled:opacity-60"
          :disabled="moreLoading"
          @click="loadMore"
        >
          {{ moreLoading ? '加载中…' : '加载更多' }}
        </button>
      </div>
    </template>
  </PageShell>
</template>
