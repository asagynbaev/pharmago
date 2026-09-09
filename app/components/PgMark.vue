<script setup lang="ts">
/**
 * Результат операции: сплошной крест, поверх которого «выщёлкиваются»
 * клетки галочки или крестика. Неуспех дополнительно встряхивается.
 */
const props = withDefaults(
  defineProps<{
    kind?: 'check' | 'fail'
    size?: number
    color?: string
    /** Цвет самой галочки/крестика — должен контрастировать с крестом. */
    mark?: string
    label?: string
  }>(),
  { kind: 'check', size: 110, color: '', mark: '#0B1C2E', label: '' },
)

const baseColor = computed(
  () => props.color || (props.kind === 'check' ? '#12A66B' : '#E0567F'),
)

const path = computed(() => (props.kind === 'check' ? CHECK_PATH : FAIL_PATH))

const cells = computed(() => {
  let markIndex = 0
  return FILLED.map(([c, r]) => {
    const p = cell(c!, r!)
    const onPath = path.value.some(([pc, pr]) => pc === c && pr === r)
    // Клетки пути появляются позже фона — сначала крест, потом знак.
    const delay = onPath
      ? 0.55 + markIndex++ * 0.05
      : (r! + c!) * 0.03
    return {
      ...p,
      fill: onPath ? props.mark : baseColor.value,
      style: {
        transformOrigin: cellOrigin(p),
        animation: `pgPop .5s cubic-bezier(.2,.9,.3,1.3) ${delay.toFixed(2)}s both`,
      },
    }
  })
})

const ariaLabel = computed(
  () => props.label || (props.kind === 'check' ? 'Готово' : 'Ошибка'),
)
</script>

<template>
  <div class="pg-mark" :class="{ 'pg-mark--shake': kind === 'fail' }">
    <svg
      :viewBox="VIEWBOX_SQUARE"
      :width="size"
      :height="size"
      role="img"
      :aria-label="ariaLabel"
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
  </div>
</template>

<style scoped>
.pg-mark {
  display: inline-flex;
}

.pg-mark svg {
  display: block;
  overflow: visible;
}

/* Встряска запускается после того, как крестик дособрался. */
.pg-mark--shake {
  animation: pgShake 0.45s ease-in-out 0.95s both;
}
</style>
