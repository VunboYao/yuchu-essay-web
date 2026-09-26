<script setup lang="ts">
withDefaults(
  defineProps<{
    width?: 'content' | 'reading'
  }>(),
  { width: 'content' },
)
</script>

<template>
  <div
    class="mx-auto w-full px-4 sm:px-6 lg:px-8"
    :class="width === 'reading' ? 'max-w-3xl' : 'max-w-5xl'"
  >
    <slot />
  </div>
</template>
