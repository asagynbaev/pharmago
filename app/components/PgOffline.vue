<script setup lang="ts">
/** Нет сети: крест «дышит», шлейф мерцает как пропадающий сигнал. */
const props = withDefaults(
  defineProps<{ size?: number, color?: string, trail?: string, label?: string }>(),
  { size: 154, color: '#8FA3B5', trail: '#7FB8FF', label: 'Нет соединения' },
)

const height = computed(() => Math.round((props.size * 280) / 360))

const outline = computed(() =>
  OUTLINE.map(([c, r], i) => ({
    ...cell(c!, r!),
    style: {
      animation: `pgBreathe 2.4s ease-in-out ${(i * 0.05).toFixed(2)}s infinite`,
    },
  })),
)

const trailCellsList = computed(() =>
  trailCells().map(({ cell: p, depth }, i) => {
    const row = Math.floor(i / 2)
    return {
      ...p,
      style: {
        animation: `pgFlicker ${(1.3 + row * 0.17).toFixed(2)}s linear ${(row * 0.21).toFixed(2)}s infinite`,
      },
      depth,
    }
  }),
)
</script>

<template>
  <svg
    :viewBox="VIEWBOX_WIDE"
    :width="size"
    :height="height"
    role="img"
    :aria-label="label"
    class="pg-offline"
  >
    <rect
      v-for="(p, i) in outline"
      :key="`o${i}`"
      :x="p.x"
      :y="p.y"
      :width="p.s"
      :height="p.s"
      :fill="color"
      :style="p.style"
    />
    <rect
      v-for="(p, i) in trailCellsList"
      :key="`t${i}`"
      :x="p.x"
      :y="p.y"
      :width="p.s"
      :height="p.s"
      :fill="trail"
      :style="p.style"
    />
  </svg>
</template>

<style scoped>
.pg-offline {
  display: block;
  overflow: visible;
}
</style>
