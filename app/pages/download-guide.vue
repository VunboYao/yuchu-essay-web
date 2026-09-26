<script setup lang="ts">
const webCan = ['浏览文章与优秀作文', '按年级 / 单元筛选', '关键词搜索', '阅读正文长图与范文']
const miniOnly = ['微信登录', '收藏与浏览历史', '资料下载（含签链）', '激励视频解锁下载']

useSiteSeo({
  title: '下载说明',
  description: '网页提供公开阅读与检索。收藏、登录与资料下载仅在微信小程序中完成。',
})
</script>

<template>
  <PageShell width="reading">
    <header class="mb-8">
      <p class="text-sm font-medium text-jade-500">能力边界说明</p>
      <h1 class="mt-2 font-display text-2xl font-semibold text-ink-900 sm:text-3xl">下载说明</h1>
      <p class="mt-3 text-base leading-relaxed text-ink-secondary">
        本站是内容门户：公开阅读与检索可在网页完成。收藏、登录与资料下载等完整能力仅在微信小程序中提供。
      </p>
    </header>

    <div class="grid gap-4 sm:grid-cols-2">
      <section class="rounded-2xl border border-border/70 bg-parchment-card px-5 py-5">
        <h2 class="font-display text-base font-semibold text-ink-900">网页可做</h2>
        <ul class="mt-3 space-y-2 text-sm text-ink-secondary">
          <li v-for="item in webCan" :key="item" class="flex gap-2">
            <span class="text-jade-500" aria-hidden="true">·</span>
            <span>{{ item }}</span>
          </li>
        </ul>
      </section>
      <section class="rounded-2xl border border-jade-400/30 bg-jade-soft/40 px-5 py-5">
        <h2 class="font-display text-base font-semibold text-ink-900">请到小程序</h2>
        <ul class="mt-3 space-y-2 text-sm text-ink-secondary">
          <li v-for="item in miniOnly" :key="item" class="flex gap-2">
            <span class="text-jade-700" aria-hidden="true">·</span>
            <span>{{ item }}</span>
          </li>
        </ul>
      </section>
    </div>

    <section class="mt-8 rounded-2xl border border-border/70 bg-parchment-card px-5 py-6 sm:px-7">
      <h2 class="font-display text-lg font-semibold text-ink-900">如何下载资料</h2>
      <ol class="mt-4 list-decimal space-y-3 pl-5 text-sm leading-relaxed text-ink-secondary">
        <li>在微信中打开「予初作文」小程序（见下方入口）。</li>
        <li>进入对应文章详情，在资料区选择文件。</li>
        <li>按小程序提示完成必要步骤（如激励视频）后获取下载链接。</li>
      </ol>
      <p class="mt-4 text-sm text-ink-muted">
        网页端不会提供假登录或假下载；详情页的「收藏 / 下载」按钮会导流至小程序。
      </p>
      <div class="mt-6 flex flex-wrap items-center gap-3">
        <OpenMiniProgramCTA label="打开小程序下载" />
        <NuxtLink to="/articles" class="text-sm text-jade-500 hover:text-jade-700">
          先浏览文章 →
        </NuxtLink>
      </div>
    </section>
  </PageShell>
</template>
