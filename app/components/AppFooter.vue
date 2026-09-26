<script setup lang="ts">
const ICP_BEIAN = '黔ICP备2026011427号-1'
const ICP_URL = 'https://beian.miit.gov.cn/'
</script>

<template>
  <footer class="mt-auto border-t border-border/50 bg-parchment-200/40">
    <div
      class="mx-auto flex w-full max-w-5xl flex-col gap-3 px-4 py-8 text-sm text-ink-muted sm:px-6 lg:px-8"
    >
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p class="font-display text-ink-700">予初作文 · 内容门户</p>
        <div class="flex flex-wrap gap-4">
          <NuxtLink to="/download-guide" class="hover:text-jade-500">下载说明</NuxtLink>
          <NuxtLink to="/open-miniprogram" class="hover:text-jade-500">打开小程序</NuxtLink>
        </div>
        <p class="text-xs">完整收藏、下载与登录请在微信小程序中使用</p>
      </div>
      <p class="text-center text-xs sm:text-left">
        <a
          :href="ICP_URL"
          target="_blank"
          rel="noopener noreferrer"
          class="hover:text-jade-500"
        >
          {{ ICP_BEIAN }}
        </a>
      </p>
    </div>
  </footer>
</template>
