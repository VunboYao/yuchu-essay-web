<script setup lang="ts">
const steps = [
  '打开微信，点击右上角「+」→ 搜一搜',
  '搜索「予初作文」并进入小程序',
  '在小程序内完成收藏、下载与登录',
]

useSiteSeo({
  title: '打开小程序',
  description: '收藏、资料下载与登录请在微信小程序「予初作文」中完成。',
})
</script>

<template>
  <PageShell width="reading">
    <div class="overflow-hidden rounded-3xl border border-border/70 bg-parchment-card">
      <div class="border-b border-border/50 bg-jade-soft/50 px-6 py-10 text-center sm:px-10">
        <p class="text-sm font-medium tracking-wide text-jade-500">微信小程序</p>
        <h1 class="mt-2 font-display text-2xl font-semibold text-ink-900 sm:text-3xl">
          予初作文
        </h1>
        <p class="mx-auto mt-4 max-w-md text-sm leading-relaxed text-ink-secondary sm:text-base">
          完整能力在小程序：收藏、资料下载、登录与激励解锁。网页站负责公开阅读与检索，并引导你回到小程序。
        </p>
      </div>

      <div class="px-6 py-8 sm:px-10">
        <div
          class="mx-auto flex h-44 w-44 flex-col items-center justify-center rounded-2xl border border-dashed border-border-strong bg-parchment-100 px-4 text-center"
        >
          <p class="text-sm font-medium text-ink-700">小程序码</p>
          <p class="mt-2 text-xs leading-relaxed text-ink-muted">
            正式环境可替换为微信小程序码图片；当前以搜索进入为主。
          </p>
        </div>

        <ol class="mx-auto mt-8 max-w-md space-y-3">
          <li
            v-for="(step, i) in steps"
            :key="step"
            class="flex gap-3 text-sm text-ink-secondary"
          >
            <span
              class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-jade-500 text-xs font-medium text-parchment-card"
            >
              {{ i + 1 }}
            </span>
            <span class="pt-0.5 leading-relaxed">{{ step }}</span>
          </li>
        </ol>

        <div class="mt-8 flex flex-wrap justify-center gap-4 border-t border-border/50 pt-6 text-sm">
          <NuxtLink to="/download-guide" class="text-jade-500 hover:text-jade-700">
            下载说明
          </NuxtLink>
          <NuxtLink to="/" class="text-ink-muted hover:text-jade-600">返回首页</NuxtLink>
        </div>
      </div>
    </div>
  </PageShell>
</template>
