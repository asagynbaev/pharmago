<script setup lang="ts">
import type { PharmacyView } from '#shared/types'

/**
 * Схематичная карта на случай, когда ключ Google Maps не задан
 * или API не загрузился. Аптеки раскладываются по своим настоящим
 * координатам в равнопромежуточной проекции — взаимное расположение
 * точек сохраняется, теряется только подложка.
 */
const props = withDefaults(
  defineProps<{
    pharmacies: PharmacyView[]
    selectedId?: string | null
    userCoords?: { lat: number, lng: number } | null
    showUser?: boolean
    note?: string
    /** Своя подпись для маркера: id аптеки → текст. */
    labels?: Record<string, string>
  }>(),
  { selectedId: null, userCoords: null, showUser: false, note: '', labels: undefined },
)

const emit = defineEmits<{ select: [id: string] }>()

const bounds = computed(() => {
  const points = [
    ...props.pharmacies.map(p => ({ lat: p.lat, lng: p.lng })),
    ...(props.showUser && props.userCoords ? [props.userCoords] : []),
  ]
  if (!points.length) {
    return { minLat: 42.81, maxLat: 42.9, minLng: 74.51, maxLng: 74.66 }
  }

  const lats = points.map(p => p.lat)
  const lngs = points.map(p => p.lng)
  // Поля, чтобы крайние маркеры не липли к границам блока.
  const padLat = Math.max((Math.max(...lats) - Math.min(...lats)) * 0.14, 0.006)
  const padLng = Math.max((Math.max(...lngs) - Math.min(...lngs)) * 0.14, 0.006)

  return {
    minLat: Math.min(...lats) - padLat,
    maxLat: Math.max(...lats) + padLat,
    minLng: Math.min(...lngs) - padLng,
    maxLng: Math.max(...lngs) + padLng,
  }
})

/** Точка в процентах от размеров блока. */
function projectRaw(point: { lat: number, lng: number }) {
  const b = bounds.value
  return {
    x: ((point.lng - b.minLng) / (b.maxLng - b.minLng)) * 100,
    // Широта растёт вверх, а координата Y на экране — вниз.
    y: (1 - (point.lat - b.minLat) / (b.maxLat - b.minLat)) * 100,
  }
}

function project(point: { lat: number, lng: number }) {
  const { x, y } = projectRaw(point)
  return { left: `${x.toFixed(2)}%`, top: `${y.toFixed(2)}%` }
}

const userPos = computed(() =>
  props.showUser && props.userCoords ? project(props.userCoords) : null,
)

const root = useTemplateRef<HTMLElement>('root')

/**
 * Аптеки в центре города стоят вплотную, и подписи налезают друг на друга.
 *
 * Прячем те, что перекрывают уже размещённые. Прямоугольники меряем прямо
 * в DOM, а не оцениваем по длине строки: скрытые подписи остаются в потоке
 * (гасим только opacity), поэтому измерения стабильны от прохода к проходу.
 */
const quiet = ref(new Set<string>())

function relayoutLabels() {
  const host = root.value
  if (!host) return

  const pins = [...host.querySelectorAll<HTMLElement>('[data-pin]')]
  const byId = new Map(props.pharmacies.map(p => [p.id, p]))

  // Выбранная аптека получает подпись всегда, дальше — по близости.
  const ordered = pins.slice().sort((a, b) => {
    const ida = a.dataset.pin!
    const idb = b.dataset.pin!
    if (ida === props.selectedId) return -1
    if (idb === props.selectedId) return 1
    return (byId.get(ida)?.distance ?? 0) - (byId.get(idb)?.distance ?? 0)
  })

  const placed: DOMRect[] = []
  const hidden = new Set<string>()

  for (const pin of ordered) {
    const label = pin.querySelector<HTMLElement>('.fb__label')
    if (!label) continue

    const rect = label.getBoundingClientRect()
    const collides = placed.some(
      r => rect.left < r.right && rect.right > r.left
        && rect.top < r.bottom && rect.bottom > r.top,
    )

    if (collides) hidden.add(pin.dataset.pin!)
    else placed.push(rect)
  }

  quiet.value = hidden
}

const schedule = () => nextTick(relayoutLabels)

onMounted(schedule)
watch(
  () => [props.pharmacies.map(p => p.id).join(','), props.selectedId, props.labels],
  schedule,
  { deep: true },
)
useResizeObserver(root, schedule)
</script>

<template>
  <div ref="root" class="fb dotted-map">
    <span v-if="note" class="fb__note">{{ note }}</span>

    <button
      v-for="p in pharmacies"
      :key="p.id"
      :data-pin="p.id"
      type="button"
      class="fb__pin"
      :class="{
        'fb__pin--active': p.id === selectedId,
        'fb__pin--quiet': quiet.has(p.id),
      }"
      :style="project(p)"
      :aria-label="`${p.chain}, ${p.address}`"
      :aria-pressed="p.id === selectedId"
      @click="emit('select', p.id)"
    >
      <span class="fb__label">{{ labels?.[p.id] ?? p.chain }}</span>
      <span class="fb__dot" :data-status="p.status" />
    </button>

    <span v-if="userPos" class="fb__user" :style="userPos" aria-hidden="true">
      <span class="fb__user-dot" />
    </span>
  </div>
</template>

<style scoped>
.fb {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: inherit;
  border-radius: inherit;
  overflow: hidden;
}

.fb__note {
  position: absolute;
  left: 14px;
  top: 14px;
  z-index: 3;
  font-size: 12px;
  font-weight: 600;
  color: #3b5473;
  background: #fff;
  border-radius: 6px;
  padding: 5px 9px;
  box-shadow: var(--shadow-sm);
  max-width: calc(100% - 28px);
}

.fb__pin {
  position: absolute;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  border: 0;
  background: transparent;
  cursor: pointer;
  padding: 0;
  z-index: 1;
  transition: z-index 0s;
}

.fb__pin:hover,
.fb__pin:focus-visible,
.fb__pin--active {
  z-index: 4;
}

.fb__label {
  font-size: 11px;
  font-weight: 600;
  background: #fff;
  color: var(--ink);
  padding: 4px 8px;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgb(0 0 0 / 10%);
  white-space: nowrap;
  transition:
    background 0.15s var(--ease),
    color 0.15s var(--ease),
    opacity 0.15s var(--ease);
}

/* Подпись спрятана, потому что перекрыла бы соседнюю — вернём по наведению. */
.fb__pin--quiet .fb__label {
  opacity: 0;
  pointer-events: none;
}

.fb__pin--quiet:hover .fb__label,
.fb__pin--quiet:focus-visible .fb__label,
.fb__pin--quiet.fb__pin--active .fb__label {
  opacity: 1;
}

.fb__pin--active .fb__label {
  background: var(--ink);
  color: #fff;
}

.fb__dot {
  width: 14px;
  height: 14px;
  background: var(--green);
  transition: transform 0.15s var(--ease);
}

.fb__dot[data-status='night'] {
  background: var(--blue);
}

.fb__dot[data-status='closed'] {
  background: #b0bac4;
}

.fb__pin:hover .fb__dot {
  transform: scale(1.2);
}

.fb__pin--active .fb__dot {
  transform: scale(1.4);
}

.fb__user {
  position: absolute;
  transform: translate(-50%, -50%);
  z-index: 2;
}

.fb__user-dot {
  display: block;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--blue);
  border: 3px solid #fff;
  box-shadow: 0 0 0 4px rgb(10 122 255 / 25%);
}
</style>
