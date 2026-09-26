<script setup lang="ts">
import { computed } from 'vue'
import type { ArticleSummary, EssaySummary } from '~/types/content'
import { articleMeta } from '~/utils/nav'

const props = defineProps<{
  kind: 'article' | 'essay'
  item: ArticleSummary | EssaySummary
}>()

const to = computed(() =>
  props.kind === 'article' ? `/articles/${props.item.id}` : `/essays/${props.item.id}`,
)

const article = computed(() =>
  props.kind === 'article' ? (props.item as ArticleSummary) : null,
)

const essay = computed(() => (props.kind === 'essay' ? (props.item as EssaySummary) : null))

const subtitle = computed(() => {
  if (article.value) {
    return articleMeta(article.value.grade, article.value.semester, article.value.unit)
  }
  if (essay.value) {
    return `${essay.value.grade}年级 · ${essay.value.wordCount || 0} 字`
  }
  return ''
})

const ctaLabel = computed(() => (props.kind === 'essay' ? '读范文' : '阅读'))
</script>

<template>
  <NuxtLink :to="to" class="article-card group">
    <div v-if="article?.coverImg" class="article-card-media">
      <img
        :src="article.coverImg"
        :alt="item.title"
        width="640"
        height="360"
        class="article-card-img"
        loading="lazy"
        decoding="async"
      />
      <span class="article-card-media-veil" aria-hidden="true" />
    </div>
    <div v-else-if="essay" class="article-card-essay-mark" aria-hidden="true">
      <span class="article-card-essay-glyph">文</span>
    </div>

    <div class="article-card-body">
      <div v-if="article" class="mb-1.5 flex flex-wrap gap-1.5">
        <span
          v-if="article.isRecommended"
          class="rounded-full bg-jade-soft px-2 py-0.5 text-xs text-jade-700"
        >
          推荐
        </span>
        <span
          v-if="article.isHot"
          class="rounded-full bg-accent-soft px-2 py-0.5 text-xs text-accent"
        >
          热门
        </span>
      </div>
      <p class="article-card-title">{{ item.title }}</p>
      <p class="mt-1.5 text-sm text-ink-muted transition-colors duration-200 group-hover:text-ink-secondary">
        {{ subtitle }}
      </p>
      <p
        v-if="article?.summary"
        class="mt-2 line-clamp-2 text-sm text-ink-secondary transition-opacity duration-200 group-hover:text-ink-700"
      >
        {{ article.summary }}
      </p>
      <p class="article-card-cta">
        {{ ctaLabel }}
        <IconChevronRight class="article-card-cta-arrow" :size="14" />
      </p>
    </div>
  </NuxtLink>
</template>

<style scoped>
.article-card {
  position: relative;
  display: block;
  overflow: hidden;
  border-radius: 1rem;
  border: 1px solid color-mix(in srgb, var(--color-border) 80%, transparent);
  background: var(--color-parchment-card);
  cursor: pointer;
  transition:
    transform 0.28s cubic-bezier(0.22, 1, 0.36, 1),
    border-color 0.25s ease,
    box-shadow 0.28s ease,
    background-color 0.25s ease;
}

.article-card:hover {
  transform: translateY(-4px);
  border-color: var(--color-jade-400);
  background: color-mix(in srgb, var(--color-jade-soft) 55%, var(--color-parchment-card));
  box-shadow:
    0 10px 28px -12px rgba(45, 106, 79, 0.28),
    0 4px 10px -6px rgba(18, 26, 29, 0.08);
}

.article-card-media {
  position: relative;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  background: var(--color-parchment-200);
}

.article-card-img {
  height: 100%;
  width: 100%;
  object-fit: cover;
  transition:
    transform 0.45s cubic-bezier(0.22, 1, 0.36, 1),
    filter 0.35s ease;
}

.article-card:hover .article-card-img {
  transform: scale(1.06);
  filter: saturate(1.05) brightness(1.02);
}

.article-card-media-veil {
  pointer-events: none;
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to top,
    color-mix(in srgb, var(--color-parchment-card) 35%, transparent),
    transparent 45%
  );
  opacity: 0;
  transition: opacity 0.3s ease;
}

.article-card:hover .article-card-media-veil {
  opacity: 1;
}

.article-card-essay-mark {
  display: flex;
  height: 4.5rem;
  align-items: center;
  justify-content: flex-end;
  padding-right: 1.25rem;
  background:
    radial-gradient(circle at 85% 40%, color-mix(in srgb, var(--color-jade-soft) 80%, transparent), transparent 55%),
    linear-gradient(135deg, var(--color-parchment-200), var(--color-parchment-card));
  transition: background 0.3s ease;
}

.article-card:hover .article-card-essay-mark {
  background:
    radial-gradient(circle at 80% 45%, color-mix(in srgb, var(--color-jade-400) 28%, transparent), transparent 50%),
    linear-gradient(135deg, var(--color-jade-soft), var(--color-parchment-card));
}

.article-card-essay-glyph {
  font-family: var(--font-display);
  font-size: 1.75rem;
  font-weight: 600;
  color: color-mix(in srgb, var(--color-jade-500) 45%, transparent);
  transition:
    color 0.25s ease,
    transform 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}

.article-card:hover .article-card-essay-glyph {
  color: var(--color-jade-500);
  transform: translateX(-4px) scale(1.05);
}

.article-card-body {
  padding: 1rem;
}

.article-card-title {
  font-family: var(--font-display);
  font-size: 1rem;
  font-weight: 500;
  color: var(--color-ink-900);
  transition: color 0.2s ease;
}

.article-card:hover .article-card-title {
  color: var(--color-jade-700);
}

.article-card-cta {
  margin-top: 0.75rem;
  display: inline-flex;
  align-items: center;
  gap: 0.15rem;
  font-size: 0.8125rem;
  font-weight: 500;
  line-height: 1.25;
  color: var(--color-jade-500);
  opacity: 0;
  transform: translateY(6px);
  transition:
    opacity 0.25s ease,
    transform 0.28s cubic-bezier(0.22, 1, 0.36, 1),
    color 0.2s ease;
}

.article-card:hover .article-card-cta {
  opacity: 1;
  transform: translateY(0);
  color: var(--color-jade-700);
}

.article-card-cta-arrow {
  position: relative;
  top: 0.06em;
  transition: transform 0.2s ease;
}

.article-card:hover .article-card-cta-arrow {
  transform: translateX(3px);
}
</style>
