<script setup lang="ts">
/** Скелетон карточки аптеки — держит ту же сетку, что и OfferCard. */
withDefaults(defineProps<{ dark?: boolean }>(), { dark: false })
</script>

<template>
  <div class="pg-skeleton-card" aria-hidden="true">
    <div class="row">
      <span class="pg-shimmer" :class="{ 'pg-shimmer--dark': dark }" style="width: 90px; height: 14px" />
      <span class="pg-shimmer" :class="{ 'pg-shimmer--dark': dark }" style="width: 56px; height: 12px; border-radius: 4px" />
    </div>
    <span class="pg-shimmer" :class="{ 'pg-shimmer--dark': dark }" style="width: 64px; height: 18px" />
    <span class="pg-shimmer" :class="{ 'pg-shimmer--dark': dark }" style="width: 70%; height: 11px" />
    <span class="pg-shimmer" :class="{ 'pg-shimmer--dark': dark }" style="width: 48px; height: 11px" />
  </div>
</template>

<style scoped>
.row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.pg-skeleton-card span {
  display: block;
}
</style>
