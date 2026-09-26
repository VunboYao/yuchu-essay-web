<script setup lang="ts">
import { computed, onScopeDispose, ref, watch } from 'vue'
import { ApiError, isAbortError } from '~/utils/http'
import { apiGet } from '~/utils/api'
import { mapMiniPathToWeb } from '~/utils/nav'
import type { HomeData } from '~/types/content'
import { GRADE_OPTIONS, useSelectedGrade } from '~/composables/useSelectedGrade'

const { data, error, status, refresh } = await useAsyncData('home', () => apiGet<HomeData>('/home'))

const { grade, ready, setGrade } = useSelectedGrade()
const gradeFeed = ref<HomeData | null>(null)
const gradeError = ref('')
const gradeLoading = ref(false)
let gradeController: AbortController | null = null

const home = computed(() => {
  if (ready.value && grade.value && gradeFeed.value) return gradeFeed.value
  return data.value
})

const loadError = computed(() => {
  if (ready.value && grade.value && gradeError.value) return gradeError.value
  if (!data.value && error.value) {
    return error.value instanceof ApiError ? error.value.message : '网络异常，请稍后重试'
  }
  return ''
})

const loading = computed(() => status.value === 'pending' && !data.value)
const refreshing = computed(() => Boolean(ready.value && grade.value && gradeLoading.value))

const recommended = computed(() => home.value?.recommendedArticles || [])
const hot = computed(() => home.value?.hotArticles || [])
const essays = computed(() => home.value?.essayExamples || [])
const blocks = computed(() => home.value?.homeBlocks || [])

const linkGrade = computed(() => (ready.value ? grade.value : ''))

const gradeContentEmpty = computed(() => {
  if (loading.value || refreshing.value || !linkGrade.value || !home.value) return false
  return !recommended.value.length && !hot.value.length && !essays.value.length
})

const articlesMoreTo = computed(() =>
  linkGrade.value ? `/articles?grade=${linkGrade.value}` : '/articles',
)
const essaysMoreTo = computed(() =>
  linkGrade.value ? `/essays?grade=${linkGrade.value}` : '/essays',
)

async function loadGrade(value: string) {
  gradeController?.abort()
  const controller = new AbortController()
  gradeController = controller
  gradeLoading.value = true
  gradeError.value = ''
  try {
    const next = await apiGet<HomeData>('/home', {
      query: { grade: value },
      signal: controller.signal,
    })
    if (controller.signal.aborted) return
    gradeFeed.value = next
  } catch (reason) {
    if (controller.signal.aborted || isAbortError(reason)) return
    gradeError.value = reason instanceof ApiError ? reason.message : '网络异常，请稍后重试'
    gradeFeed.value = null
  } finally {
    if (gradeController === controller) {
      gradeController = null
      gradeLoading.value = false
    }
  }
}

watch([ready, grade], ([isReady, value]) => {
  if (!isReady || !value) {
    gradeFeed.value = null
    gradeError.value = ''
    return
  }
  void loadGrade(value)
})

onScopeDispose(() => gradeController?.abort())

function retry() {
  if (ready.value && grade.value) {
    void loadGrade(grade.value)
    return
  }
  void refresh()
}

const site = useRuntimeConfig().public

useHead({ titleTemplate: '%s' })
useSiteSeo({
  title: '予初作文 · 小学语文作文资料',
  description: site.siteDescription,
  jsonLd: {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: site.siteName,
    url: site.siteUrl,
    description: site.siteDescription,
    inLanguage: 'zh-CN',
  },
})
</script>

<template>
  <PageShell>
    <section class="mb-10 sm:mb-14">
      <div
        class="animate-hero-in overflow-hidden rounded-3xl border border-border/70 bg-parchment-card px-5 py-10 sm:px-10 sm:py-14"
      >
        <p class="text-sm font-medium tracking-wide text-jade-500">小学语文 · 作文资料</p>
        <h1 class="mt-3 font-display text-3xl font-semibold leading-tight text-ink-900 sm:text-4xl lg:text-5xl">
          予初作文
        </h1>
        <p class="animate-hero-in-delay mt-4 max-w-xl text-base leading-relaxed text-ink-secondary sm:text-lg">
          单元指导、习作范文与素材积累，结构清晰、随时可查。完整收藏与资料下载请在微信小程序中使用。
        </p>
        <div class="mt-8 flex flex-wrap items-center gap-3">
          <OpenMiniProgramCTA label="打开微信小程序" />
          <NuxtLink
            to="/category"
            class="inline-flex cursor-pointer items-center justify-center rounded-full border border-border-strong bg-transparent px-4 py-2.5 text-sm font-medium text-ink-700 transition hover:border-jade-500 hover:text-jade-700"
          >
            浏览分类
          </NuxtLink>
        </div>
      </div>
    </section>

    <section class="mb-8">
      <NuxtLink
        to="/search"
        class="flex cursor-pointer items-center gap-3 rounded-2xl border border-border bg-parchment-card px-4 py-3.5 text-ink-muted transition hover:border-jade-400/50 hover:text-ink-secondary"
      >
        <span class="flex h-8 w-8 items-center justify-center rounded-full bg-jade-soft text-jade-700" aria-hidden="true">⌕</span>
        <span>搜索作文题目、单元、写作技巧</span>
      </NuxtLink>
    </section>

    <section class="mb-10">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <h2 class="font-display text-lg font-semibold text-ink-900">年级选择</h2>
        <NuxtLink :to="articlesMoreTo" class="more-link">
          按年级看文章
          <IconChevronRight class="more-link-arrow" :size="15" />
        </NuxtLink>
      </div>
      <div class="mt-4 flex flex-wrap gap-2" role="group" aria-label="年级">
        <button
          v-for="g in GRADE_OPTIONS"
          :key="g.value === '' ? 'all' : g.value"
          type="button"
          class="cursor-pointer rounded-full border px-4 py-2 text-sm transition hover:shadow-sm"
          :class="
            (ready ? grade : '') === g.value
              ? 'border-jade-500 bg-jade-500 text-parchment-card'
              : 'border-border bg-parchment-card text-ink-secondary hover:border-jade-400 hover:text-jade-700'
          "
          :aria-pressed="(ready ? grade : '') === g.value"
          @click="setGrade(g.value)"
        >
          {{ g.label }}
        </button>
      </div>
    </section>

    <p v-if="refreshing" class="sr-only" aria-live="polite">正在按年级刷新</p>

    <div v-if="loading" class="space-y-4 py-8" aria-busy="true">
      <div
        v-for="i in 3"
        :key="i"
        class="h-28 animate-pulse rounded-2xl bg-parchment-200/80"
      />
    </div>

    <div
      v-else-if="loadError"
      class="rounded-2xl border border-dashed border-border-strong bg-parchment-card px-6 py-10 text-center"
    >
      <p class="font-display text-lg text-ink-900">首页加载失败</p>
      <p class="mt-2 text-sm text-ink-muted">{{ loadError }}</p>
      <p class="mt-1 text-xs text-ink-muted">请确认 course_server 已启动（:8080）</p>
      <button
        type="button"
        class="mt-6 rounded-full bg-jade-500 px-5 py-2 text-sm text-parchment-card hover:bg-jade-700"
        @click="retry"
      >
        重新加载
      </button>
    </div>

    <div v-else :aria-busy="refreshing">
      <section v-if="blocks.length" class="mb-12">
        <h2 class="font-display text-lg font-semibold text-ink-900">精选入口</h2>
        <div class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <NuxtLink
            v-for="block in blocks"
            :key="block.id"
            :to="mapMiniPathToWeb(block.path, linkGrade || undefined)"
            class="group flex cursor-pointer flex-col items-center gap-2 rounded-2xl border border-border bg-parchment-card p-4 text-center transition duration-300 ease-out hover:-translate-y-1 hover:border-jade-500 hover:bg-jade-soft/50 hover:shadow-[0_10px_24px_-12px_rgba(45,106,79,0.3)]"
          >
            <img
              v-if="block.icon"
              :src="block.icon"
              :alt="block.title"
              width="40"
              height="40"
              class="h-10 w-10 rounded-xl object-cover transition duration-300 ease-out group-hover:scale-110 group-hover:shadow-sm"
              loading="lazy"
              decoding="async"
            />
            <p class="font-medium text-ink-900 transition-colors duration-200 group-hover:text-jade-700">
              {{ block.title }}
            </p>
          </NuxtLink>
        </div>
      </section>

      <p
        v-if="gradeContentEmpty"
        class="mb-8 rounded-2xl bg-jade-soft/50 px-4 py-3 text-sm text-jade-700"
      >
        当前年级暂无推荐内容，可切换「全部年级」或前往分类浏览。
        <NuxtLink to="/category" class="ml-1 underline underline-offset-2">去分类</NuxtLink>
      </p>

      <section v-if="recommended.length" class="mb-12">
        <div class="mb-4 flex items-end justify-between gap-4">
          <h2 class="font-display text-lg font-semibold text-ink-900">推荐文章</h2>
          <NuxtLink :to="articlesMoreTo" class="more-link">
            查看全部
            <IconChevronRight class="more-link-arrow" :size="15" />
          </NuxtLink>
        </div>
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <ArticleCard
            v-for="item in recommended"
            :key="item.id"
            kind="article"
            :item="item"
          />
        </div>
      </section>

      <section v-if="hot.length" class="mb-12">
        <div class="mb-4 flex items-end justify-between gap-4">
          <h2 class="font-display text-lg font-semibold text-ink-900">热门文章</h2>
          <NuxtLink :to="articlesMoreTo" class="more-link">
            查看全部
            <IconChevronRight class="more-link-arrow" :size="15" />
          </NuxtLink>
        </div>
        <div class="grid gap-3 sm:grid-cols-2">
          <ArticleCard v-for="item in hot" :key="item.id" kind="article" :item="item" />
        </div>
      </section>

      <section v-if="essays.length" class="mb-6">
        <div class="mb-4 flex items-end justify-between gap-4">
          <h2 class="font-display text-lg font-semibold text-ink-900">优秀作文</h2>
          <NuxtLink :to="essaysMoreTo" class="more-link">
            查看全部
            <IconChevronRight class="more-link-arrow" :size="15" />
          </NuxtLink>
        </div>
        <div class="grid gap-3 sm:grid-cols-2">
          <ArticleCard v-for="item in essays" :key="item.id" kind="essay" :item="item" />
        </div>
      </section>

      <section
        v-if="!blocks.length && !recommended.length && !hot.length && !essays.length"
        class="rounded-2xl border border-dashed border-border bg-parchment-card px-6 py-12 text-center"
      >
        <p class="font-display text-lg text-ink-900">暂无内容</p>
        <p class="mt-2 text-sm text-ink-muted">后台发布文章与首页入口后将显示在这里</p>
        <NuxtLink to="/category" class="mt-4 inline-block text-sm text-jade-500">去分类看看</NuxtLink>
      </section>
    </div>
  </PageShell>
</template>

<style scoped>
.more-link {
  display: inline-flex;
  cursor: pointer;
  align-items: center;
  gap: 0.15rem;
  font-size: 0.875rem;
  line-height: 1.25;
  color: var(--color-jade-500);
  transition: color 0.2s ease;
}

.more-link:hover {
  color: var(--color-jade-700);
}

.more-link-arrow {
  position: relative;
  top: 0.06em;
  transition: transform 0.2s ease;
}

.more-link:hover .more-link-arrow {
  transform: translateX(4px);
}
</style>
