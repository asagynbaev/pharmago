<template>
  <div class="page">
    <a href="#main" class="skip-link">Перейти к содержанию</a>
    <AppHeader />
    <main id="main" class="layout__main">
      <slot />
    </main>
    <AppFooter />
    <PgToaster />
  </div>
</template>

<style scoped>
.layout__main {
  display: flex;
  flex-direction: column;
  gap: var(--gap);
}
</style>
