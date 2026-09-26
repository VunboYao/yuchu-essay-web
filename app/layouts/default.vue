<template>
  <div class="flex min-h-screen flex-col">
    <AppHeader />
    <main class="flex-1 py-6 sm:py-10">
      <slot />
    </main>
    <AppFooter />
  </div>
</template>
