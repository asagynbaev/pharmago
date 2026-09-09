<script setup lang="ts">
/**
 * Знак PharmaGO — пиксельный крест с «шлейфом» из уходящих вправо квадратов.
 * Геометрия общая с анимациями бренда, см. app/utils/logo-geometry.ts.
 */
const props = withDefaults(
  defineProps<{
    variant?: 'color' | 'white' | 'light' | 'footer'
    width?: number | string
    height?: number | string
    title?: string
  }>(),
  { variant: 'color', width: 46, height: 36, title: '' },
)

const palettes = {
  color: { cross: '#12A66B', trail1: '#0A7AFF', trail2: '#CFE2FB' },
  white: { cross: '#fff', trail1: '#fff', trail2: '#fff' },
  light: { cross: '#7FD9B4', trail1: '#8FC0FF', trail2: '#8FC0FF' },
  footer: { cross: '#fff', trail1: '#7FB8FF', trail2: 'rgba(207,226,251,.55)' },
} as const

const pixels = computed(() => {
  const palette = palettes[props.variant]

  const outline = OUTLINE.map(([c, r]) => ({
    ...cell(c!, r!),
    fill: palette.cross,
  }))

  const trail = trailCells().map(({ cell: p, depth }) => ({
    ...p,
    fill: depth === 1 ? palette.trail1 : palette.trail2,
  }))

  return [...outline, ...trail]
})
</script>

<template>
  <svg
    :viewBox="VIEWBOX_WIDE"
    :width="width"
    :height="height"
    :role="title ? 'img' : 'presentation'"
    :aria-hidden="title ? undefined : 'true'"
    focusable="false"
  >
    <title v-if="title">{{ title }}</title>
    <rect
      v-for="(p, i) in pixels"
      :key="i"
      :x="p.x"
      :y="p.y"
      :width="p.s"
      :height="p.s"
      :fill="p.fill"
    />
  </svg>
</template>
