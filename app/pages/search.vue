<script setup lang="ts">
import { computed, onScopeDispose, ref, watch } from 'vue'
import { ApiError, isAbortError } from '~/utils/http'
import { apiGet } from '~/utils/api'
import { articleMeta } from '~/utils/nav'
import type { PageData, SearchResultItem } from '~/types/content'

definePageMeta({ keepalive: true })

const HOT_KEYWORDS = ['这样想象真有趣', '我的植物朋友', '游记作文', '写人作文']

const route = useRoute()
const router = useRouter()

const keyword = ref('')
const inputReady = ref(false)
const loading = ref(false)
const loadError = ref('')
const searched = ref(false)
const list = ref<SearchResultItem[]>([])
let requestSeq = 0
let debounceTimer: ReturnType<typeof setTimeout> | undefined

const trimmed = computed(() => keyword.value.trim())

function resultTo(item: SearchResultItem) {
  return item.targetType === 'essay' ? `/essays/${item.id}` : `/articles/${item.id}`
}

function resultMeta(item: SearchResultItem) {
  if (item.targetType === 'essay') {
    return `优秀作文 · ${item.grade}年级 · ${item.wordCount || 0} 字`
  }
  return articleMeta(item.grade, item.semester || '', item.unit || 0)
}

function syncRouteKeyword(q: string) {
  const next = q.trim()
  const current = String(route.query.keyword ?? '')
  if (next === current) return
  router.replace({
    path: '/search',
    query: next ? { keyword: next } : {},
  })
}

async function runSearch(raw: string) {
  const key = raw.trim()
  const seq = ++requestSeq
  if (!key) {
    list.value = []
    searched.value = false
    loadError.value = ''
    loading.value = false
    return
  }
  loading.value = true
  loadError.value = ''
  try {
    const data = await apiGet<PageData<SearchResultItem>>('/search', { query: { keyword: key } })
    if (seq !== requestSeq) return
    list.value = data.list || []
    searched.value = true
  } catch (reason) {
    if (seq !== requestSeq || isAbortError(reason)) return
    loadError.value = reason instanceof ApiError ? reason.message : '搜索失败'
    list.value = []
    searched.value = true
  } finally {
    if (seq === requestSeq) loading.value = false
  }
}

function scheduleSearch(q: string) {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    syncRouteKeyword(q)
    void runSearch(q)
  }, 300)
}

function submitImmediate() {
  clearTimeout(debounceTimer)
  syncRouteKeyword(keyword.value)
  void runSearch(keyword.value)
}

function quickSearch(word: string) {
  keyword.value = word
  submitImmediate()
}

function onSubmit(event: Event) {
  event.preventDefault()
  submitImmediate()
}

watch(keyword, (q) => {
  if (!inputReady.value) return
  scheduleSearch(q)
})

onMounted(() => {
  const q = String(route.query.keyword ?? '')
  keyword.value = q
  if (q) void runSearch(q)
  inputReady.value = true
})

watch(
  () => String(route.query.keyword ?? ''),
  (q) => {
    if (!import.meta.client) return
    if (q === keyword.value.trim()) return
    keyword.value = q
  },
)

onScopeDispose(() => clearTimeout(debounceTimer))

useSiteSeo({
  title: '搜索',
  description: '检索文章与优秀作文。',
  robots: 'noindex, follow',
})
</script>

<template>
  <PageShell>
    <header class="mb-6">
      <h1 class="font-display text-2xl font-semibold text-ink-900 sm:text-3xl">搜索</h1>
      <p class="mt-2 text-sm text-ink-muted">检索文章与优秀作文 · 输入后自动搜索</p>
    </header>

    <form class="mb-6" @submit="onSubmit">
      <label class="sr-only" for="site-search">关键词</label>
      <div
        class="flex items-center gap-2 rounded-2xl border border-border bg-parchment-card px-3 py-2 focus-within:border-jade-400"
      >
        <span class="pl-1 text-ink-muted" aria-hidden="true">⌕</span>
        <input
          id="site-search"
          v-model="keyword"
          type="search"
          placeholder="输入作文题目、单元、写作技巧…"
          class="min-w-0 flex-1 bg-transparent py-2 text-base text-ink-900 outline-none placeholder:text-ink-muted"
          autocomplete="off"
        />
        <button
          type="submit"
          class="shrink-0 rounded-full bg-jade-500 px-4 py-2 text-sm text-parchment-card disabled:opacity-50"
          :disabled="loading || !trimmed"
        >
          {{ loading ? '搜索中' : '搜索' }}
        </button>
      </div>
    </form>

    <section v-if="!searched && !loading" class="mb-8">
      <p class="mb-3 text-xs font-medium text-ink-muted">热门搜索</p>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="word in HOT_KEYWORDS"
          :key="word"
          type="button"
          class="rounded-full border border-border bg-parchment-card px-3 py-1.5 text-sm text-ink-secondary hover:border-jade-400 hover:text-jade-700"
          @click="quickSearch(word)"
        >
          {{ word }}
        </button>
      </div>
    </section>

    <div v-if="loading" class="space-y-3" aria-busy="true">
      <div v-for="i in 4" :key="i" class="h-20 animate-pulse rounded-2xl bg-parchment-200/80" />
    </div>

    <div
      v-else-if="loadError"
      class="rounded-2xl border border-dashed border-border-strong bg-parchment-card px-6 py-10 text-center"
    >
      <p class="font-display text-lg text-ink-900">搜索失败</p>
      <p class="mt-2 text-sm text-ink-muted">{{ loadError }}</p>
      <button
        type="button"
        class="mt-6 rounded-full bg-jade-500 px-5 py-2 text-sm text-parchment-card"
        @click="submitImmediate"
      >
        重试
      </button>
    </div>

    <template v-else-if="searched">
      <p class="mb-4 text-sm text-ink-muted">
        「{{ trimmed }}」共 {{ list.length }} 条结果
      </p>

      <ul v-if="list.length" class="space-y-3">
        <li v-for="item in list" :key="`${item.targetType}-${item.id}`">
          <NuxtLink
            :to="resultTo(item)"
            class="group flex gap-4 rounded-2xl border border-border/80 bg-parchment-card p-4 transition hover:border-jade-400/60 hover:bg-jade-soft/30"
          >
            <div
              v-if="item.coverImg"
              class="hidden h-16 w-24 shrink-0 overflow-hidden rounded-xl bg-parchment-200 sm:block"
            >
	            <NuxtPicture
			            provider="aliyunoss"
			            :src="item.coverImg"
			            :alt="item.title"
			            width="200"
			            height="140"
			            :modifiers="{ width: 200, quality: 80 }"
			            format="webp"
			            sizes="96px"
			            class="h-full w-full object-cover"
			            loading="lazy"
			            decoding="async"
	            />

            </div>
            <div class="min-w-0 flex-1">
              <div class="mb-1 flex flex-wrap items-center gap-2">
                <span
                  class="rounded-full px-2 py-0.5 text-xs"
                  :class="
                    item.targetType === 'essay'
                      ? 'bg-accent-soft text-accent'
                      : 'bg-jade-soft text-jade-700'
                  "
                >
                  {{ item.targetType === 'essay' ? '作文' : '文章' }}
                </span>
                <span class="text-xs text-ink-muted">{{ resultMeta(item) }}</span>
              </div>
              <p class="font-display text-base font-medium text-ink-900 group-hover:text-jade-700">
                {{ item.title }}
              </p>
              <p
                v-if="item.summary"
                class="mt-1 line-clamp-2 text-sm text-ink-secondary"
              >
                {{ item.summary }}
              </p>
            </div>
          </NuxtLink>
        </li>
      </ul>

      <div
        v-else
        class="rounded-2xl border border-dashed border-border bg-parchment-card px-6 py-12 text-center"
      >
        <p class="font-display text-lg text-ink-900">没有找到相关内容</p>
        <p class="mt-2 text-sm text-ink-muted">试试换个关键词，或从分类浏览</p>
        <div class="mt-6 flex flex-wrap justify-center gap-3">
          <NuxtLink
            to="/category"
            class="rounded-full border border-border px-4 py-2 text-sm text-ink-700 hover:border-jade-500"
          >
            去分类
          </NuxtLink>
          <NuxtLink
            to="/essays"
            class="rounded-full bg-jade-500 px-4 py-2 text-sm text-parchment-card"
          >
            看优秀作文
          </NuxtLink>
        </div>
      </div>
    </template>
  </PageShell>
</template>
