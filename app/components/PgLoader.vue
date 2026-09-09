<script setup lang="ts">
/**
 * Фирменный лоадер: подсветка бежит по контуру креста,
 * шлейф уезжает вправо. Порядок клеток — угловой, поэтому
 * свет идёт по кругу, а не прыгает.
 */
const props = withDefaults(
  defineProps<{
    size?: number | string
    color?: string
    trail1?: string
    trail2?: string
    /** Длительность полного оборота, с. */
    speed?: number
    label?: string
  }>(),
  {
    size: 48,
    color: '#12A66B',
    trail1: '#0A7AFF',
    trail2: '#CFE2FB',
    speed: 1.6,
    label: 'Загрузка',
  },
)

const height = computed(() =>
  typeof props.size === 'number' ? Math.round((props.size * 280) / 360) : 'auto',
)

const outline = computed(() =>
  OUTLINE.map(([c, r], i) => {
    const p = cell(c!, r!)
    const delay = ((i / OUTLINE.length) * props.speed).toFixed(2)
    return {
      ...p,
      style: {
        transformOrigin: cellOrigin(p),
        animation: `pgPulse ${props.speed}s ease-in-out ${delay}s infinite`,
      },
    }
  }),
)

const trail = computed(() =>
  trailCells().map(({ cell: p, depth }) => ({
    ...p,
    fill: depth === 1 ? props.trail1 : props.trail2,
    style: {
      animation: `pgTrail ${props.speed}s ease-in-out ${(0.3 + depth * 0.15).toFixed(2)}s infinite`,
    },
  })),
)
</script>

<template>
  <svg
    :viewBox="VIEWBOX_WIDE"
    :width="size"
    :height="height"
    role="status"
    :aria-label="label"
    class="pg-loader"
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
      v-for="(p, i) in trail"
      :key="`t${i}`"
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
.pg-loader {
  display: block;
  overflow: visible;
}
</style>
