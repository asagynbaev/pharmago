<script setup lang="ts">
/**
 * Осколки, разлетающиеся из центра слота. Оборачивает содержимое,
 * поэтому «взрыв» всегда привязан к иконке результата.
 */
const props = withDefaults(
  defineProps<{
    count?: number
    colors?: string[]
    /** Задержка перед вылетом — чтобы галочка успела собраться. */
    delay?: number
    active?: boolean
  }>(),
  {
    count: 14,
    colors: () => ['#12A66B', '#0A7AFF', '#CFE2FB', '#7FD9B4'],
    delay: 0.85,
    active: true,
  },
)

const shards = computed(() =>
  Array.from({ length: props.count }, (_, i) => {
    const angle = (i / props.count) * Math.PI * 2
    const distance = 70 + (i % 3) * 22
    const size = 8 + (i % 3) * 3
    return {
      style: {
        'width': `${size}px`,
        'height': `${size}px`,
        'marginLeft': `${-size / 2}px`,
        'marginTop': `${-size / 2}px`,
        'background': props.colors[i % props.colors.length],
        '--dx': `${(Math.cos(angle) * distance).toFixed(1)}px`,
        '--dy': `${(Math.sin(angle) * distance).toFixed(1)}px`,
        'animationDelay': `${(props.delay + (i % 4) * 0.04).toFixed(2)}s`,
      },
    }
  }),
)
</script>

<template>
  <div class="pg-burst">
    <slot />
    <i
      v-for="(shard, i) in (active ? shards : [])"
      :key="i"
      aria-hidden="true"
      :style="shard.style"
    />
  </div>
</template>
