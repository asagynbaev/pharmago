<script setup lang="ts">
/// <reference types="google.maps" />
import type { PharmacyView } from '#shared/types'
import { BISHKEK_CENTER } from '#shared/data/pharmacies'

/**
 * Карта аптек на Google Maps.
 *
 * Подложка очищена от чужих точек интереса: кафе, банки и торговые центры
 * спорили с маркерами аптек. Стили задаются в коде, поэтому Map ID карте
 * не передаётся — при заданном Map ID Google берёт оформление из облачной
 * консоли и `styles` игнорирует.
 */
const props = withDefaults(
  defineProps<{
    pharmacies: PharmacyView[]
    selectedId?: string | null
    userCoords?: { lat: number, lng: number } | null
    /**
     * Своя подпись для маркера: id аптеки → текст. Используется на карточке
     * препарата, чтобы на карте были видны цены, а не названия сетей.
     */
    labels?: Record<string, string>
    showUser?: boolean
    /** Подгонять ли видимую область под набор маркеров. */
    fit?: boolean
    zoom?: number
    minHeight?: string
  }>(),
  {
    selectedId: null,
    userCoords: null,
    labels: undefined,
    showUser: true,
    fit: true,
    zoom: 12,
    minHeight: '640px',
  },
)

const emit = defineEmits<{ select: [id: string] }>()

const { status, error, mapId, hasKey, load } = useGoogleMaps()

const host = useTemplateRef<HTMLElement>('host')
const map = shallowRef<google.maps.Map | null>(null)
const markers = new Map<string, google.maps.Marker>()
let userMarker: google.maps.Marker | null = null
let idleListener: google.maps.MapsEventListener | null = null

/** Спокойная светлая подложка без чужих POI — в тон палитре сайта. */
const MAP_STYLE: google.maps.MapTypeStyle[] = [
  // Главное: убираем чужие точки интереса и транспорт.
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ visibility: 'off' }] },
  // Парки оставляем — по ним удобно ориентироваться.
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ visibility: 'on' }, { color: '#e3f1e8' }] },
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#f3f5f7' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#cfe2fb' }] },
  { featureType: 'road', elementType: 'geometry.fill', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#e6eaee' }] },
  { featureType: 'road.highway', elementType: 'geometry.fill', stylers: [{ color: '#fdfdfd' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#e0e5ea' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#6b7c86' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#ffffff' }, { weight: 3 }] },
]

const STATUS_COLOR: Record<string, string> = {
  open: '#12A66B',
  night: '#0A7AFF',
  closed: '#B0BAC4',
}

/** На столько подпись поднята над квадратом маркера. */
const LABEL_OFFSET = 14

/** Квадратный маркер в стиле знака — SVG прямо в data-URI. */
function squareIcon(color: string, size: number): google.maps.Icon {
  const svg
    = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">`
      + `<rect width="${size}" height="${size}" fill="${color}"/></svg>`

  return {
    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
    scaledSize: new google.maps.Size(size, size),
    anchor: new google.maps.Point(size / 2, size / 2),
    // Подпись висит над квадратом.
    labelOrigin: new google.maps.Point(size / 2, -LABEL_OFFSET),
  }
}

/**
 * Чем ближе аптека, тем выше её маркер и тем больше шансов, что подпись
 * останется видимой при разведении перекрытий.
 */
const priorityOf = (pharmacy: PharmacyView) =>
  Math.max(1, 90 - Math.round(pharmacy.distance * 4))

function labelFor(pharmacy: PharmacyView, active: boolean): google.maps.MarkerLabel {
  return {
    text: props.labels?.[pharmacy.id] ?? pharmacy.chain,
    // Класс с id позволяет найти подпись в DOM и померить её прямоугольник.
    className: `gpin-label gpin-label--${pharmacy.id}${active ? ' is-active' : ''}`,
    color: active ? '#ffffff' : '#0F1D17',
    fontSize: '11px',
    fontWeight: '600',
  }
}

async function initMap() {
  const maps = await load()
  if (!maps || !host.value) return

  const { Map } = (await maps.importLibrary('maps')) as google.maps.MapsLibrary

  map.value = new Map(host.value, {
    center: BISHKEK_CENTER,
    zoom: props.zoom,
    // Map ID подключаем, только если он задан осознанно: тогда оформление
    // берётся из облачной консоли, а наши стили Google проигнорирует.
    ...(mapId ? { mapId } : { styles: MAP_STYLE }),
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: false,
    zoomControl: true,
    clickableIcons: false,
    gestureHandling: 'greedy',
    // Без дробного зума fitBounds округляет вниз и город оказывается
    // сильно мельче, чем нужно.
    isFractionalZoomEnabled: true,
  })

  // Пан и зум меняют взаимное расположение подписей — пересчитываем.
  idleListener = map.value.addListener('idle', scheduleRelayout)

  syncMarkers()
}

function syncMarkers() {
  const maps = window.google?.maps
  if (!map.value || !maps) return

  const seen = new Set<string>()

  for (const pharmacy of props.pharmacies) {
    seen.add(pharmacy.id)
    const active = pharmacy.id === props.selectedId
    const size = active ? 18 : 14
    const color = STATUS_COLOR[pharmacy.status] ?? STATUS_COLOR.open!

    const existing = markers.get(pharmacy.id)
    if (existing) {
      existing.setIcon(squareIcon(color, size))
      existing.setLabel(labelFor(pharmacy, active))
      existing.setZIndex(active ? 1000 : priorityOf(pharmacy))
      existing.setPosition({ lat: pharmacy.lat, lng: pharmacy.lng })
      continue
    }

    const marker = new maps.Marker({
      map: map.value,
      position: { lat: pharmacy.lat, lng: pharmacy.lng },
      icon: squareIcon(color, size),
      label: labelFor(pharmacy, active),
      title: `${pharmacy.chain}, ${pharmacy.address}`,
      zIndex: active ? 1000 : priorityOf(pharmacy),
      // Без оптимизации каждый маркер — отдельный узел, иначе подпись
      // не найти в DOM и не померить.
      optimized: false,
    })
    marker.addListener('click', () => emit('select', pharmacy.id))
    markers.set(pharmacy.id, marker)
  }

  // Аптеки, выпавшие из фильтра, убираем с карты.
  for (const [id, marker] of markers) {
    if (!seen.has(id)) {
      marker.setMap(null)
      markers.delete(id)
    }
  }

  syncUserMarker()
  if (props.fit) fitToMarkers()
  scheduleRelayout()
}

let relayoutTimer: ReturnType<typeof setTimeout> | undefined

/**
 * Google дорисовывает подписи уже после события idle, поэтому меряем их
 * с небольшой задержкой — иначе querySelector не находит ни одной
 * и разведение молча ничего не делает.
 */
function scheduleRelayout() {
  clearTimeout(relayoutTimer)
  relayoutTimer = setTimeout(relayoutLabels, 150)
}

function syncUserMarker() {
  const maps = window.google?.maps
  if (!map.value || !maps) return

  if (!props.showUser || !props.userCoords) {
    userMarker?.setMap(null)
    userMarker = null
    return
  }

  if (userMarker) {
    userMarker.setPosition(props.userCoords)
    return
  }

  const dot
    = '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22">'
      + '<circle cx="11" cy="11" r="8" fill="#0A7AFF" stroke="#fff" stroke-width="3"/></svg>'

  userMarker = new maps.Marker({
    map: map.value,
    position: props.userCoords,
    title: 'Вы здесь',
    zIndex: 2000,
    icon: {
      url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(dot),
      scaledSize: new maps.Size(22, 22),
      anchor: new maps.Point(11, 11),
    },
  })
}

/**
 * Аптеки в центре стоят вплотную, и подписи налезают друг на друга.
 * Меряем реальные прямоугольники в DOM и гасим те, что перекрывают уже
 * размещённые. Выбранная аптека подписана всегда.
 */
interface Box { left: number, right: number, top: number, bottom: number }

const overlaps = (a: Box, b: Box) =>
  a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top

/**
 * Квадрат маркера лежит в отдельном контейнере Google, добраться до него
 * из подписи нельзя. Зато его положение однозначно выводится из подписи:
 * labelOrigin поднимает её ровно на LABEL_OFFSET над верхом иконки.
 */
function iconBoxFrom(labelRect: DOMRect, size: number): Box {
  const cx = labelRect.left + labelRect.width / 2
  const top = labelRect.top + labelRect.height / 2 + LABEL_OFFSET
  return { left: cx - size / 2, right: cx + size / 2, top, bottom: top + size }
}

function relayoutLabels() {
  const container = host.value
  if (!container) return

  const ordered = [...props.pharmacies].sort((a, b) => {
    if (a.id === props.selectedId) return -1
    if (b.id === props.selectedId) return 1
    return a.distance - b.distance
  })

  // Сначала собираем прямоугольники всех подписей и их квадратов: скрытые
  // подписи остаются в потоке, поэтому меряются наравне с видимыми.
  const measured = new Map<string, { el: HTMLElement, label: DOMRect, icon: Box }>()

  for (const pharmacy of ordered) {
    const el = container.querySelector<HTMLElement>(`.gpin-label--${pharmacy.id}`)
    if (!el) continue
    el.classList.remove('is-quiet')
    const label = el.getBoundingClientRect()
    const size = pharmacy.id === props.selectedId ? 18 : 14
    measured.set(pharmacy.id, { el, label, icon: iconBoxFrom(label, size) })
  }

  // Подпись не должна накрывать чужой маркер — квадраты тоже препятствия.
  const obstacles: Box[] = [...measured.values()].map(m => m.icon)
  const placed: Box[] = []

  for (const pharmacy of ordered) {
    const item = measured.get(pharmacy.id)
    if (!item) continue

    const own = item.icon
    const hit
      = placed.some(r => overlaps(item.label, r))
        || obstacles.some(r => r !== own && overlaps(item.label, r))

    if (hit) item.el.classList.add('is-quiet')
    else placed.push(item.label)
  }
}

function fitToMarkers() {
  const maps = window.google?.maps
  if (!map.value || !maps || !props.pharmacies.length) return

  const bounds = new maps.LatLngBounds()
  for (const p of props.pharmacies) bounds.extend({ lat: p.lat, lng: p.lng })
  if (props.showUser && props.userCoords) bounds.extend(props.userCoords)

  map.value.fitBounds(bounds, 48)

  // Одна точка растягивается в бесконечно малую область — вернём разумный зум.
  if (props.pharmacies.length === 1) {
    maps.event.addListenerOnce(map.value, 'idle', () => {
      map.value?.setZoom(Math.min(map.value.getZoom() ?? 15, 15))
    })
  }
}

onMounted(() => {
  if (hasKey) initMap()
})

watch(
  () => props.pharmacies.map(p => p.id).join(','),
  () => { if (map.value) syncMarkers() },
)

watch(
  () => props.selectedId,
  (id) => {
    if (!map.value) return
    syncMarkers()
    const pharmacy = props.pharmacies.find(p => p.id === id)
    if (pharmacy) map.value.panTo({ lat: pharmacy.lat, lng: pharmacy.lng })
  },
)

watch(() => props.userCoords, () => { if (map.value) syncMarkers() }, { deep: true })
watch(() => props.labels, () => { if (map.value) syncMarkers() }, { deep: true })

onBeforeUnmount(() => {
  clearTimeout(relayoutTimer)
  idleListener?.remove()
  for (const marker of markers.values()) marker.setMap(null)
  markers.clear()
  userMarker?.setMap(null)
  userMarker = null
  map.value = null
})

const showFallback = computed(() =>
  ['no-key', 'error', 'denied'].includes(status.value),
)

const fallbackNote = computed(() => {
  switch (status.value) {
    case 'denied':
      return 'Google Maps отклонил ключ — схема аптек Бишкека'
    case 'error':
      return 'Google Maps недоступен — схема аптек Бишкека'
    default:
      return 'Схема аптек Бишкека · добавьте ключ Google Maps для интерактивной карты'
  }
})
</script>

<template>
  <div class="pmap" :style="{ '--pmap-min-h': minHeight }">
    <template v-if="showFallback">
      <MapFallback
        :pharmacies="pharmacies"
        :selected-id="selectedId"
        :user-coords="userCoords"
        :show-user="showUser"
        :labels="labels"
        :note="fallbackNote"
        @select="emit('select', $event)"
      />
      <div v-if="status === 'error' || status === 'denied'" class="pmap__offline">
        <PgOffline :size="110" label="Google Maps недоступен" />
        <b>{{ status === 'denied' ? 'Ключ Google Maps не принят' : 'Карта не загрузилась' }}</b>
        <span v-if="status === 'denied'">
          В Google Cloud Console разрешите ключу
          <b>Maps JavaScript API</b> и проверьте биллинг.
        </span>
        <span v-else>Показываем схему аптек — она работает без сети.</span>
      </div>
    </template>

    <template v-else>
      <div ref="host" class="pmap__canvas" />
      <Transition name="pmap-fade">
        <div v-if="status !== 'ready'" class="pmap__loading">
          <PgLoader :size="56" label="Загружаем карту" />
          <span>Загружаем карту…</span>
          <div class="pg-progress pmap__progress"><i /></div>
        </div>
      </Transition>
    </template>

    <p v-if="error" class="visually-hidden" role="status">{{ error }}</p>
  </div>
</template>

<style scoped>
.pmap {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: var(--pmap-min-h, 640px);
  border-radius: var(--r-card-lg);
  overflow: hidden;
  background: #eaf2fb;
}

/* На узком экране высокая карта даёт много пустоты сверху и снизу:
   аптеки Бишкека вытянуты по горизонтали. Ограничиваем рост. */
@media (width <= 900px) {
  .pmap {
    min-height: min(var(--pmap-min-h, 640px), 380px);
  }
}

.pmap__canvas {
  position: absolute;
  inset: 0;
}

.pmap__loading {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: var(--ink-muted);
  font-size: 16px;
  font-weight: 500;
  background: #eaf2fb;
  z-index: 2;
}

.pmap__progress {
  width: 120px;
}

.pmap-fade-leave-active {
  transition: opacity 0.3s var(--ease);
}

.pmap-fade-leave-to {
  opacity: 0;
}

/* Плашка поверх схемы, когда Google Maps не отвечает. */
.pmap__offline {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  z-index: 4;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  text-align: center;
  background: rgb(255 255 255 / 92%);
  backdrop-filter: blur(2px);
  border-radius: var(--r-card);
  padding: 22px 26px;
  box-shadow: var(--shadow-md);
  max-width: min(320px, calc(100% - 32px));
}

.pmap__offline b {
  font-size: 16px;
}

.pmap__offline span {
  font-size: 15px;
  color: var(--ink-muted);
  line-height: 1.45;
}
</style>

<!--
  Подписи маркеров живут в собственном слое Google, до них не достают
  scoped-стили — эти правила намеренно глобальные.
-->
<style>
.gpin-label {
  background: #fff;
  padding: 4px 8px;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgb(0 0 0 / 18%);
  white-space: nowrap;
  font-family: Onest, ui-sans-serif, system-ui, sans-serif;
  transition: opacity 0.15s ease;
}

.gpin-label.is-active {
  background: #0f1d17;
}

/* Подпись перекрыла бы соседнюю — прячем, квадрат остаётся на месте. */
.gpin-label.is-quiet {
  opacity: 0;
}
</style>
