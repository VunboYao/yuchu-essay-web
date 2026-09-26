<script setup lang="ts">
const route = useRoute()

const nav = [
  { to: '/', label: '首页', match: (p: string) => p === '/' },
  { to: '/category', label: '分类', match: (p: string) => p.startsWith('/category') },
  { to: '/essays', label: '优秀作文', match: (p: string) => p.startsWith('/essays') },
  { to: '/search', label: '搜索', match: (p: string) => p.startsWith('/search') },
] as const

const activePath = computed(() => route.path)
</script>

<template>
  <header class="sticky top-0 z-40 border-b border-border/60 bg-parchment-card/90 backdrop-blur-md">
    <div class="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-4 px-4 sm:h-16 sm:px-6 lg:px-8">
      <NuxtLink to="/" class="flex min-w-0 items-center gap-2.5">
        <img
          src="/favicon.png"
          alt=""
          width="32"
          height="32"
          class="h-8 w-8 shrink-0 rounded-lg"
        />
        <span class="font-display text-lg font-semibold tracking-tight text-ink-900 sm:text-xl">
          予初作文
        </span>
      </NuxtLink>

      <nav class="hidden items-center gap-8 md:flex" aria-label="主导航">
        <NuxtLink
          v-for="item in nav"
          :key="item.to"
          :to="item.to"
          class="nav-link"
          :class="{ 'is-active': item.match(activePath) }"
        >
          {{ item.label }}
        </NuxtLink>
      </nav>

      <div class="flex shrink-0 items-center gap-2">
        <NuxtLink
          to="/search"
          class="rounded-full px-2.5 py-1.5 text-sm text-ink-secondary hover:text-ink-900 md:hidden"
        >
          搜索
        </NuxtLink>
        <OpenMiniProgramCTA size="sm" />
      </div>
    </div>

    <nav
      class="flex gap-1 overflow-x-auto border-t border-border/40 px-4 py-2 md:hidden"
      aria-label="移动导航"
    >
      <NuxtLink
        v-for="item in nav"
        :key="item.to"
        :to="item.to"
        class="shrink-0 rounded-full px-3 py-1 text-sm"
        :class="
          item.match(activePath)
            ? 'bg-jade-soft font-medium text-jade-700'
            : 'text-ink-muted'
        "
      >
        {{ item.label }}
      </NuxtLink>
    </nav>
  </header>
</template>

<style scoped>
.nav-link {
  position: relative;
  padding: 0.4rem 0.25rem 0.5rem;
  font-size: 1rem;
  color: var(--color-ink-secondary);
  transition: color 0.2s ease;
}

.nav-link::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 2px;
  border-radius: 1px;
  background: var(--color-jade-700);
  transform: scaleX(0);
  transform-origin: center;
  transition: transform 0.25s ease;
}

.nav-link:hover {
  color: var(--color-ink-900);
}

.nav-link:hover::after,
.nav-link.is-active::after {
  transform: scaleX(1);
}

.nav-link.is-active {
  color: var(--color-ink-900);
  font-weight: 500;
}
</style>
