<script setup lang="ts">
import { ref } from 'vue'

withDefaults(
  defineProps<{
    label?: string
    to?: string
    size?: 'sm' | 'md'
  }>(),
  {
    label: '打开小程序',
    to: '/open-miniprogram',
    size: 'md',
  },
)

const sizeClass = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2.5 text-sm sm:text-base',
}

const open = ref(false)
</script>

<template>
  <button
    type="button"
    class="inline-flex items-center justify-center rounded-full bg-jade-500 font-medium text-parchment-card transition hover:bg-jade-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jade-500"
    :class="sizeClass[size]"
    @click="open = true"
  >
    {{ label }}
  </button>

  <BaseModal v-model="open" title="在微信中打开予初作文">
    <div class="flex flex-col gap-5 sm:flex-row sm:items-center">
      <div
        class="mx-auto flex h-32 w-32 shrink-0 flex-col items-center justify-center rounded-2xl border border-dashed border-jade-400/60 bg-jade-soft/50 text-center"
      >
        <span class="font-display text-3xl font-semibold text-jade-700" aria-hidden="true">予</span>
        <span class="mt-1 text-xs text-ink-muted">小程序码待配置</span>
      </div>
      <div>
        <p class="font-display text-base font-medium text-ink-900">完整能力请回到小程序</p>
        <ol class="mt-3 space-y-2 text-sm leading-relaxed text-ink-secondary">
          <li>1. 打开微信，进入顶部搜索。</li>
          <li>2. 搜索「予初作文」并进入小程序。</li>
          <li>3. 完成收藏、资料下载与登录。</li>
        </ol>
      </div>
    </div>

    <template #footer>
      <div class="flex flex-wrap items-center justify-end gap-3">
        <button
          type="button"
          class="rounded-full px-4 py-2 text-sm text-ink-muted hover:text-ink-900"
          @click="open = false"
        >
          稍后再说
        </button>
        <NuxtLink
          :to="to"
          class="rounded-full bg-jade-500 px-4 py-2 text-sm font-medium text-parchment-card hover:bg-jade-700"
          @click="open = false"
        >
          查看完整打开指引
        </NuxtLink>
      </div>
    </template>
  </BaseModal>
</template>
