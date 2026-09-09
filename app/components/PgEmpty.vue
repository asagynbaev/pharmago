<script setup lang="ts">
/** Пустое состояние: квадраты контура разлетаются от центра и возвращаются. */
const props = withDefaults(
  defineProps<{ size?: number, color?: string, label?: string }>(),
  { size: 154, color: '#B4C3D1', label: 'Ничего не найдено' },
)

const height = computed(() => Math.round((props.size * 280) / 360))

const cells = computed(() =>
  OUTLINE.map(([c, r], i) => {
    const p = cell(c!, r!)
    const angle = Math.atan2(r! - 3, c! - 3)
    return {
      ...p,
      style: {
        '--dx': `${(Math.cos(angle) * 26).toFixed(1)}px`,
        '--dy': `${(Math.sin(angle) * 26).toFixed(1)}px`,
        'animation': `pgDrift 3s ease-in-out ${(i * 0.07).toFixed(2)}s infinite`,
      },
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
    class="pg-empty"
  >
    <rect
      v-for="(p, i) in cells"
      :key="i"
      :x="p.x"
      :y="p.y"
      :width="p.s"
      :height="p.s"
      :fill="color"
      :style="p.style"
    />
  </svg>
</template>

<style scoped>
.pg-empty {
  display: block;
  overflow: visible;
}
</style>
