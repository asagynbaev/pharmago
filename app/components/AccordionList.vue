<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    items: { title: string, text: string }[]
    /** Какой пункт раскрыт при первом показе. -1 — все закрыты. */
    initial?: number
    variant?: 'card' | 'flush'
  }>(),
  { initial: 0, variant: 'card' },
)

const openIndex = ref(props.initial)
const toggle = (i: number) => { openIndex.value = openIndex.value === i ? -1 : i }
const baseId = useId()
</script>

<template>
  <div class="acc" :class="`acc--${variant}`">
    <div v-for="(item, i) in items" :key="item.title" class="acc__item">
      <h3 class="acc__heading">
        <button
          :id="`${baseId}-btn-${i}`"
          class="acc__btn"
          type="button"
          :aria-expanded="openIndex === i"
          :aria-controls="`${baseId}-panel-${i}`"
          @click="toggle(i)"
        >
          {{ item.title }}
          <svg
            class="acc__chev"
            :class="{ 'acc__chev--open': openIndex === i }"
            width="18" height="18" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" stroke-width="2.2"
            stroke-linecap="round" aria-hidden="true"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      </h3>
      <div
        v-show="openIndex === i"
        :id="`${baseId}-panel-${i}`"
        class="acc__panel"
        role="region"
        :aria-labelledby="`${baseId}-btn-${i}`"
      >
        <p>{{ item.text }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.acc {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.acc--flush {
  gap: 0;
}

.acc__item {
  background: var(--surface);
  border-radius: var(--r-sm);
  overflow: hidden;
}

.acc--flush .acc__item {
  border-radius: 0;
  border-top: 1px solid #f0f2f4;
}

.acc__heading {
  margin: 0;
  font-size: inherit;
  font-weight: inherit;
  letter-spacing: normal;
}

.acc__btn {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  border: 0;
  background: transparent;
  cursor: pointer;
  text-align: left;
  font-weight: 600;
  font-size: 16px;
  padding: 20px 24px;
  color: var(--ink);
}

.acc--flush .acc__btn {
  font-size: 16px;
  padding: 14px 16px;
}

.acc__btn:hover {
  background: #fafbfc;
}

.acc__chev {
  flex: none;
  transition: transform 0.2s var(--ease);
}

.acc__chev--open {
  transform: rotate(180deg);
}

.acc__panel p {
  margin: 0;
  padding: 0 24px 22px;
  font-size: 15px;
  line-height: 1.55;
  color: var(--ink-muted);
}

.acc--flush .acc__panel p {
  padding: 0 16px 16px;
  font-size: 16px;
}
</style>
