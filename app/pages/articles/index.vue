<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ApiError } from '~/utils/http'
import { apiGet } from '~/utils/api'
import { gradeLabel, semesterShortLabel } from '~/utils/categoryTree'
import type { ArticleSummary, PageData } from '~/types/content'
import { GRADE_OPTIONS } from '~/composables/useSelectedGrade'

definePageMeta({ keepalive: true })

const route = useRoute()
const router = useRouter()
const pageSize = 12

const SEMESTER_OPTIONS = [
  { label: '全册', value: '' },
  { label: '上册', value: '上册' },
  { label: '下册', value: '下册' },
]

const CONTENT_TYPE_OPTIONS = [
  { label: '全部类型', value: '' },
  { label: '作文指导', value: 'unit_guide' },
  { label: '同步单元习作', value: 'unit_writing' },
  { label: '写作素材', value: 'material' },
]

const queryGrade = computed(() => String(route.query.grade ?? ''))
const querySemester = computed(() => String(route.query.semester ?? ''))
const queryUnit = computed(() => String(route.query.unit ?? ''))
const queryContentType = computed(() => String(route.query.contentType ?? ''))
const filterKey = computed(() =>
  [queryGrade.value, querySemester.value, queryUnit.value, queryContentType.value].join('|'),
)

const resultTitle = computed(() => {
  const parts: string[] = []
  if (queryGrade.value) parts.push(gradeLabel(queryGrade.value))
  if (querySemester.value) parts.push(semesterShortLabel(querySemester.value))
  if (queryUnit.value) parts.push(`第${queryUnit.value}单元`)
  const contentType = CONTENT_TYPE_OPTIONS.find((item) => item.value === queryContentType.value)
  if (contentType?.value) parts.push(contentType.label)
  if (!parts.length) return '全部文章'
  return `${parts.join(' · ')}文章`
})

function patchQuery(patch: Record<string, string>) {
  const next: Record<string, string> = {
    grade: queryGrade.value,
    semester: querySemester.value,
    unit: queryUnit.value,
    contentType: queryContentType.value,
    ...patch,
  }
  const cleaned: Record<string, string> = {}
  for (const [key, value] of Object.entries(next)) {
    if (value) cleaned[key] = value
  }
  router.replace({ path: '/articles', query: cleaned })
}

const filterGrade = computed({
  get: () => queryGrade.value,
  set: (grade) => patchQuery({ grade, unit: '' }),
})
const filterSemester = computed({
  get: () => querySemester.value,
  set: (semester) => patchQuery({ semester, unit: '' }),
})
const filterContentType = computed({
  get: () => queryContentType.value,
  set: (contentType) => patchQuery({ contentType }),
})

const { data, error, status, refresh } = await useAsyncData(
  () => `articles:${filterKey.value}`,
  () =>
    apiGet<PageData<ArticleSummary>>('/articles', {
      query: {
        page: 1,
        pageSize,
        grade: queryGrade.value,
        semester: querySemester.value,
        unit: queryUnit.value,
        contentType: queryContentType.value,
      },
    }),
  { watch: [filterKey], dedupe: 'cancel' },
)

const extras = ref<ArticleSummary[]>([])
const moreLoading = ref(false)
const morePage = ref(2)

watch(filterKey, () => {
  extras.value = []
  morePage.value = 2
})

const list = computed(() => [...(data.value?.list || []), ...extras.value])
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
    const page = await apiGet<PageData<ArticleSummary>>('/articles', {
      query: {
        page: morePage.value,
        pageSize,
        grade: queryGrade.value,
        semester: querySemester.value,
        unit: queryUnit.value,
        contentType: queryContentType.value,
      },
    })
    extras.value = extras.value.concat(page.list || [])
    morePage.value += 1
  } catch {
    /* 与 CSR 站一致：加载更多失败保留已有列表 */
  } finally {
    moreLoading.value = false
  }
}

useSiteSeo({
  title: resultTitle,
  description: '按年级、册次和单元浏览小学作文文章。',
})
</script>

<template>
  <PageShell>
    <header class="mb-6">
      <h1 class="font-display text-2xl font-semibold text-ink-900 sm:text-3xl">{{ resultTitle }}</h1>
      <p class="mt-2 text-sm text-ink-muted">共 {{ total }} 篇 · 筛选条件与小程序文章列表对齐</p>
    </header>

    <ArticleFilters
      v-model:grade="filterGrade"
      v-model:semester="filterSemester"
      v-model:content-type="filterContentType"
      :grade-options="GRADE_OPTIONS"
      :semester-options="SEMESTER_OPTIONS"
      :content-type-options="CONTENT_TYPE_OPTIONS"
      :unit="queryUnit"
      @clear-unit="patchQuery({ unit: '' })"
    />

    <div v-if="loading" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
      <div v-for="i in 6" :key="i" class="h-40 animate-pulse rounded-2xl bg-parchment-200/80" />
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
        <ArticleCard v-for="item in list" :key="item.id" kind="article" :item="item" />
      </div>
      <p
        v-else
        class="rounded-2xl border border-dashed border-border bg-parchment-card px-6 py-12 text-center text-ink-muted"
      >
        暂无文章
        <NuxtLink to="/category" class="ml-2 text-jade-500">去分类选单元</NuxtLink>
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
