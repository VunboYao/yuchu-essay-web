<script setup lang="ts">
import { nextTick, useId, useTemplateRef, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    title?: string
    closeOnBackdrop?: boolean
  }>(),
  {
    title: '',
    closeOnBackdrop: true,
  },
)

const emit = defineEmits<{
  closed: []
}>()

const open = defineModel<boolean>({ required: true })
const titleId = useId()
const panel = useTemplateRef<HTMLElement>('panel')

function close() {
  if (!open.value) return
  open.value = false
  emit('closed')
}

function onBackdrop() {
  if (props.closeOnBackdrop) close()
}

watch(
  open,
  (isOpen, _, onCleanup) => {
    if (!isOpen || !import.meta.client) return

    const previousFocus = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    const onKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeydown)
    void nextTick(() => panel.value?.focus())

    onCleanup(() => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeydown)
      previousFocus?.focus()
    })
  },
  { flush: 'post', immediate: true },
)
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="open"
        class="fixed inset-0 z-[100] flex items-end justify-center bg-ink-900/45 px-3 py-4 backdrop-blur-sm sm:items-center sm:p-6"
        @mousedown.self="onBackdrop"
      >
        <section
          ref="panel"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="titleId"
          tabindex="-1"
          class="modal-panel relative max-h-[min(86vh,42rem)] w-full max-w-lg overflow-y-auto rounded-3xl border border-border/80 bg-parchment-card shadow-[0_24px_70px_-24px_rgba(18,26,29,0.65)] outline-none"
        >
          <header class="flex items-start justify-between gap-4 border-b border-border/50 px-5 py-4 sm:px-6">
            <div :id="titleId" class="font-display text-lg font-semibold text-ink-900">
              <slot name="header">{{ title }}</slot>
            </div>
            <button
              type="button"
              class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xl text-ink-muted transition hover:bg-parchment-200 hover:text-ink-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-jade-500"
              aria-label="关闭弹窗"
              @click="close"
            >
              ×
            </button>
          </header>

          <div class="px-5 py-6 sm:px-6">
            <slot />
          </div>

          <footer
            v-if="$slots.footer"
            class="border-t border-border/50 bg-parchment-100/60 px-5 py-4 sm:px-6"
          >
            <slot name="footer" :close="close" />
          </footer>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-active .modal-panel,
.modal-leave-active .modal-panel {
  transition:
    transform 0.24s cubic-bezier(0.22, 1, 0.36, 1),
    opacity 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-panel,
.modal-leave-to .modal-panel {
  opacity: 0;
  transform: translateY(18px) scale(0.98);
}

@media (prefers-reduced-motion: reduce) {
  .modal-enter-active,
  .modal-leave-active,
  .modal-enter-active .modal-panel,
  .modal-leave-active .modal-panel {
    transition-duration: 0.01ms;
  }
}
</style>
