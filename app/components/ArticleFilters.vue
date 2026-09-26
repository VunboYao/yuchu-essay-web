<script setup lang="ts">
interface FilterOption {
  readonly label: string
  readonly value: string
}

defineProps<{
  gradeOptions: readonly FilterOption[]
  semesterOptions: readonly FilterOption[]
  contentTypeOptions: readonly FilterOption[]
  unit?: string
}>()

defineEmits<{
  clearUnit: []
}>()

const grade = defineModel<string>('grade', { required: true })
const semester = defineModel<string>('semester', { required: true })
const contentType = defineModel<string>('contentType', { required: true })
</script>

<template>
  <div
    class="mb-6 flex flex-col gap-4 rounded-2xl border border-border/70 bg-parchment-card p-4 sm:p-5"
  >
    <div>
      <p class="mb-2 text-xs font-medium text-ink-muted">年级</p>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="option in gradeOptions"
          :key="option.value || 'all-grade'"
          type="button"
          class="rounded-full border px-3 py-1.5 text-sm"
          :class="
            grade === option.value
              ? 'border-jade-500 bg-jade-500 text-parchment-card'
              : 'border-border text-ink-secondary hover:border-jade-400'
          "
          @click="grade = option.value"
        >
          {{ option.label }}
        </button>
      </div>
    </div>

    <div>
      <p class="mb-2 text-xs font-medium text-ink-muted">册次</p>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="option in semesterOptions"
          :key="option.value || 'all-semester'"
          type="button"
          class="rounded-full border px-3 py-1.5 text-sm"
          :class="
            semester === option.value
              ? 'border-jade-500 bg-jade-soft font-medium text-jade-700'
              : 'border-border text-ink-secondary hover:border-jade-400'
          "
          @click="semester = option.value"
        >
          {{ option.label }}
        </button>
      </div>
    </div>

    <div>
      <p class="mb-2 text-xs font-medium text-ink-muted">内容类型</p>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="option in contentTypeOptions"
          :key="option.value || 'all-content-type'"
          type="button"
          class="rounded-full border px-3 py-1.5 text-sm"
          :class="
            contentType === option.value
              ? 'border-jade-500 bg-jade-soft font-medium text-jade-700'
              : 'border-border text-ink-secondary hover:border-jade-400'
          "
          @click="contentType = option.value"
        >
          {{ option.label }}
        </button>
      </div>
    </div>

    <p v-if="unit" class="text-sm text-jade-700">
      已锁定单元：第{{ unit }}单元
      <button type="button" class="ml-2 underline" @click="$emit('clearUnit')">清除</button>
    </p>
  </div>
</template>
