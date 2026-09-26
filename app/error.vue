<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()

const is404 = computed(() => props.error.statusCode === 404)
const title = computed(() => (is404.value ? '页面不存在' : '页面暂时无法打开'))
const hint = computed(() =>
  is404.value ? '链接可能已失效，或地址输入有误。' : '请稍后重试。若持续出现，确认 course_server 已启动。',
)

useSeoMeta({
  title: () => `${title.value} · 予初作文`,
  robots: 'noindex',
})

function goHome() {
  clearError({ redirect: '/' })
}
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <AppHeader />
    <main class="flex-1 py-6 sm:py-10">
      <PageShell>
        <div class="rounded-2xl border border-dashed border-border-strong/50 bg-parchment-card/80 px-5 py-10 sm:px-8">
          <h1 class="font-display text-2xl font-semibold text-ink-900">{{ title }}</h1>
          <p class="mt-3 max-w-xl text-sm leading-relaxed text-ink-muted">{{ hint }}</p>
          <button type="button" class="mt-6 text-sm text-jade-500 hover:text-jade-700" @click="goHome">
            返回首页
          </button>
        </div>
      </PageShell>
    </main>
    <AppFooter />
  </div>
</template>
