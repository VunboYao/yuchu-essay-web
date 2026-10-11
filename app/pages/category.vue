<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ApiError } from '~/utils/http'
import { apiGet } from '~/utils/api'
import { buildCategoryTree, gradeLabel, semesterShortLabel } from '~/utils/categoryTree'
import type { CategoryUnitNode, TaxonomyUnit } from '~/types/content'
import { useSelectedGrade } from '~/composables/useSelectedGrade'

const { data, error, status, refresh } = await useAsyncData('categories', () =>
  apiGet<TaxonomyUnit[]>('/categories'),
)

const tree = computed(() => buildCategoryTree(data.value || []))
const loading = computed(() => status.value === 'pending' && !data.value)
const loadError = computed(() => {
  if (data.value || !error.value) return ''
  return error.value instanceof ApiError ? error.value.message : '加载分类失败'
})

const { grade, ready, setGrade } = useSelectedGrade()
const activeGrade = ref(0)
const activeSemester = ref('')

const currentNode = computed(() => tree.value.find((n) => n.grade === activeGrade.value) || null)
const semesterOptions = computed(() => currentNode.value?.semesters || [])
const units = computed<CategoryUnitNode[]>(() => {
  const sem = semesterOptions.value.find((s) => s.semester === activeSemester.value)
  return sem?.units || semesterOptions.value[0]?.units || []
})

function pickDefaultSemester(semesters: { semester: string }[], preferred = '') {
  if (!semesters.length) return ''
  if (preferred) {
    const exact = semesters.find((s) => s.semester === preferred)
    if (exact) return exact.semester
  }
  const up = semesters.find((s) => s.semester.includes('上'))
  return (up || semesters[0])?.semester || ''
}

function applyGrade(nextGrade: number, preferredSemester = '', persist = false) {
  activeGrade.value = nextGrade
  const node = tree.value.find((n) => n.grade === nextGrade)
  activeSemester.value = pickDefaultSemester(node?.semesters || [], preferredSemester)
  if (persist && nextGrade) setGrade(String(nextGrade))
}

function syncGrade(persist = false) {
  const preferred = ready.value ? Number(grade.value) || 0 : 0
  const initial = tree.value.find((n) => n.grade === preferred)?.grade || tree.value[0]?.grade || 0
  if (!initial) return
  applyGrade(initial, activeSemester.value, persist)
}

syncGrade(false)

watch([ready, grade, tree], () => {
  if (!tree.value.length) return
  const preferred = ready.value ? Number(grade.value) || 0 : 0
  if (preferred && preferred !== activeGrade.value && tree.value.some((n) => n.grade === preferred)) {
    applyGrade(preferred, activeSemester.value, false)
  }
})

function chooseGrade(nextGrade: number) {
  if (nextGrade === activeGrade.value) return
  applyGrade(nextGrade, activeSemester.value, true)
}

function chooseSemester(semester: string) {
  activeSemester.value = semester
}

function unitLink(unit: CategoryUnitNode) {
  const q = new URLSearchParams({
    grade: String(activeGrade.value),
    semester: activeSemester.value,
    unit: String(unit.unit),
  })
  return `/articles?${q.toString()}`
}

useSiteSeo({
  title: '教材分类',
  description: '按年级、册次和单元浏览小学语文作文资料。',
  image: '/og-category.png',
})
</script>

<template>
  <PageShell>
    <header class="mb-8">
      <h1 class="font-display text-2xl font-semibold text-ink-900 sm:text-3xl">教材分类</h1>
      <p class="mt-2 text-sm text-ink-muted">年级 → 册次 → 单元，进入对应文章列表</p>
    </header>

    <div v-if="loading" class="space-y-3" aria-busy="true">
      <div v-for="i in 4" :key="i" class="h-12 animate-pulse rounded-xl bg-parchment-200/80" />
    </div>

    <div
      v-else-if="loadError"
      class="rounded-2xl border border-dashed border-border-strong bg-parchment-card px-6 py-10 text-center"
    >
      <p class="font-display text-lg text-ink-900">分类加载失败</p>
      <p class="mt-2 text-sm text-ink-muted">{{ loadError }}</p>
      <button
        type="button"
        class="mt-6 rounded-full bg-jade-500 px-5 py-2 text-sm text-parchment-card hover:bg-jade-700"
        @click="refresh()"
      >
        重新加载
      </button>
    </div>

    <template v-else-if="tree.length">
      <section class="mb-6">
        <h2 class="mb-3 text-sm font-medium text-ink-secondary">年级</h2>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="node in tree"
            :key="node.grade"
            type="button"
            class="rounded-full border px-4 py-2 text-sm transition"
            :class="
              activeGrade === node.grade
                ? 'border-jade-500 bg-jade-500 text-parchment-card'
                : 'border-border bg-parchment-card text-ink-secondary hover:border-jade-400'
            "
            @click="chooseGrade(node.grade)"
          >
            {{ gradeLabel(node.grade) }}
          </button>
        </div>
      </section>

      <section v-if="semesterOptions.length" class="mb-6">
        <h2 class="mb-3 text-sm font-medium text-ink-secondary">册次</h2>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="sem in semesterOptions"
            :key="sem.semester"
            type="button"
            class="rounded-full border px-4 py-2 text-sm transition"
            :class="
              activeSemester === sem.semester
                ? 'border-jade-500 bg-jade-soft font-medium text-jade-700'
                : 'border-border bg-parchment-card text-ink-secondary hover:border-jade-400'
            "
            @click="chooseSemester(sem.semester)"
          >
            {{ semesterShortLabel(sem.semester) }}
          </button>
        </div>
      </section>

      <section>
        <h2 class="mb-3 text-sm font-medium text-ink-secondary">
          {{ gradeLabel(activeGrade) }} · {{ semesterShortLabel(activeSemester) }} · 单元
        </h2>
        <ul v-if="units.length" class="grid gap-2 sm:grid-cols-2">
          <li v-for="u in units" :key="`${u.semester}-${u.unit}`">
            <NuxtLink
              :to="unitLink(u)"
              class="flex items-center justify-between gap-3 rounded-2xl border border-border/80 bg-parchment-card px-4 py-3.5 transition hover:border-jade-400/60 hover:bg-jade-soft/30"
            >
              <span>
                <span class="font-medium text-ink-900">第{{ u.unit }}单元</span>
                <span v-if="u.unitTitle" class="mt-0.5 block text-sm text-ink-muted">{{ u.unitTitle }}</span>
              </span>
              <span class="text-sm text-jade-500">查看 →</span>
            </NuxtLink>
          </li>
        </ul>
        <p v-else class="rounded-2xl border border-dashed border-border bg-parchment-card px-4 py-8 text-center text-sm text-ink-muted">
          当前册次暂无单元
        </p>
      </section>
    </template>

    <p
      v-else
      class="rounded-2xl border border-dashed border-border bg-parchment-card px-6 py-12 text-center text-ink-muted"
    >
      暂无分类数据，请先在后台配置教材单元
    </p>
  </PageShell>
</template>
