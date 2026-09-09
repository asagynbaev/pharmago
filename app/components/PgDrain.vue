<script setup lang="ts">
/**
 * Таймер брони: крест «стекает» по часовой стрелке за `duration` секунд.
 * Первые восемь клеток окрашены акцентом — видно, откуда начинается отсчёт.
 */
const props = withDefaults(
  defineProps<{
    size?: number
    color?: string
    accent?: string
    /** Полный оборот, с. Для брони на 3 часа удобно брать минуты. */
    duration?: number
    label?: string
  }>(),
  {
    size: 56,
    color: '#12A66B',
    accent: '#0A7AFF',
    duration: 8,
    label: 'Обратный отсчёт',
  },
)

const cells = computed(() =>
  CLOCKWISE.map(([c, r], i) => ({
    ...cell(c!, r!),
    fill: i < 8 ? props.accent : props.color,
    style: {
      animation: `pgDrain ${props.duration}s linear ${((i / CLOCKWISE.length) * props.duration).toFixed(2)}s infinite`,
    },
  })),
)
</script>

<template>
  <svg
    :viewBox="VIEWBOX_SQUARE"
    :width="size"
    :height="size"
    role="img"
    :aria-label="label"
    class="pg-drain"
  >
    <rect
      v-for="(p, i) in cells"
      :key="i"
      :x="p.x"
      :y="p.y"
      :width="p.s"
      :height="p.s"
      :fill="p.fill"
      :style="p.style"
    />
  </svg>
</template>

<style scoped>
.pg-drain {
  display: block;
  overflow: visible;
}
</style>
