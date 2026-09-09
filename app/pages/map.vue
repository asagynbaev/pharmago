<script setup lang="ts">
import { formatDistance, plural } from '#shared/utils/catalog'

const route = useRoute()
const router = useRouter()
const { coords, label: locationLabel, status: locationStatus, locate } = useUserLocation()

const search = ref(String(route.query.q ?? ''))
const district = computed(() => String(route.query.district ?? ''))
const onlyOpen = computed(() => route.query.open === 'true')
const onlyNight = computed(() => route.query.night === 'true')
const onlyDelivery = computed(() => route.query.delivery === 'true')

const selected = ref<string | null>((route.query.pharmacy as string) ?? null)

function patch(next: Record<string, string | undefined>) {
  router.replace({
    query: Object.fromEntries(
      Object.entries({ ...route.query, ...next }).filter(
        ([, v]) => v !== undefined && v !== '',
      ),
    ),
  })
}

const debouncedSearch = refDebounced(search, 250)

const { data, pending } = await useFetch('/api/pharmacies', {
  query: computed(() => ({
    q: debouncedSearch.value,
    district: district.value,
    open: String(onlyOpen.value),
    night: String(onlyNight.value),
    delivery: String(onlyDelivery.value),
    lat: coords.value.lat,
    lng: coords.value.lng,
  })),
})

const list = computed(() => data.value?.items ?? [])
const selectedPharmacy = computed(
  () => list.value.find(p => p.id === selected.value) ?? null,
)

// Если выбранная аптека выпала из фильтра, снимаем выделение.
watch(list, (items) => {
  if (selected.value && !items.some(p => p.id === selected.value)) {
    selected.value = null
  }
})

watch(selected, (id) => {
  patch({ pharmacy: id ?? undefined })
})

const toast = useToast()
const { isAuthenticated } = useAuth()

/** Избранные аптеки — только для вошедших. */
const { data: favorites, refresh: refreshFavorites } = await useFetch('/api/favorites', {
  // Гостю эндпоинт вернёт 401, поэтому просто не зовём его.
  immediate: false,
  default: () => ({ ids: [] as string[], items: [] }),
})

watch(isAuthenticated, (yes) => { if (yes) refreshFavorites() }, { immediate: true })

const favoriteIds = computed(() => favorites.value?.ids ?? [])

async function toggleFavorite(id: string, chain: string) {
  if (!isAuthenticated.value) {
    toast.info('Нужен аккаунт', 'Войдите, чтобы сохранять аптеки')
    return navigateTo('/login?redirect=/map')
  }

  const result = await $fetch<{ ids: string[], added: boolean }>('/api/favorites', {
    method: 'POST',
    body: { pharmacyId: id },
  })
  await refreshFavorites()
  toast.info(result.added ? 'Добавлено в избранное' : 'Убрано из избранного', chain)
}

async function requestLocation() {
  const dismiss = toast.show({ title: 'Определяем местоположение…', duration: 0 })
  await locate()
  dismiss()
  if (locationStatus.value === 'granted') {
    toast.success('Готово', 'Аптеки отсортированы по близости к вам')
  }
  else {
    toast.error('Не удалось определить место', 'Считаем расстояния от центра города')
  }
}

const filters = [
  { key: 'all', label: 'Все' },
  { key: 'open', label: 'Открыто сейчас' },
  { key: 'night', label: 'Круглосуточно' },
  { key: 'delivery', label: 'С доставкой' },
]

const activeFilter = computed(() => {
  if (onlyNight.value) return 'night'
  if (onlyDelivery.value) return 'delivery'
  if (onlyOpen.value) return 'open'
  return 'all'
})

function setFilter(key: string) {
  patch({
    open: key === 'open' ? 'true' : undefined,
    night: key === 'night' ? 'true' : undefined,
    delivery: key === 'delivery' ? 'true' : undefined,
  })
}

function routeLink(p: { lat: number, lng: number }) {
  return `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`
}

useSeoMeta({
  title: 'Аптеки Бишкека на карте',
  description:
    'Все аптеки Бишкека на карте: режим работы, дежурные круглосуточные аптеки, доставка и маршрут до ближайшей.',
})
</script>

<template>
  <div class="page-body">
    <section class="head">
      <div class="head__text">
        <h1 class="h-section">Аптеки Бишкека</h1>
        <span class="muted">
          {{ data?.total ?? 0 }} {{ plural(data?.total ?? 0, 'аптека', 'аптеки', 'аптек') }}
          в базе · {{ data?.openNow ?? 0 }} открыты сейчас ·
          {{ data?.night ?? 0 }} круглосуточно
        </span>
      </div>

      <div class="head__filters">
        <button
          v-for="f in filters"
          :key="f.key"
          class="chip"
          type="button"
          :aria-pressed="activeFilter === f.key"
          @click="setFilter(f.key)"
        >
          {{ f.label }}
        </button>
      </div>
    </section>

    <div class="layout">
      <aside class="side">
        <div class="side__search">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
          <input
            v-model="search"
            type="search"
            placeholder="Название или адрес"
            aria-label="Поиск аптеки"
          >
        </div>

        <div class="side__geo">
          <button
            v-if="locationStatus !== 'granted'"
            class="btn btn--sm"
            type="button"
            @click="requestLocation"
          >
            📍 Найти ближайшие ко мне
          </button>
          <span class="muted side__geo-note">{{ locationLabel }}</span>
        </div>

        <div class="side__districts">
          <button
            v-for="d in ['Все', ...(data?.districts ?? [])]"
            :key="d"
            class="chip chip--onbg chip--sm"
            type="button"
            :aria-pressed="(district || 'Все') === d"
            @click="patch({ district: d === 'Все' ? undefined : d })"
          >
            {{ d }}
          </button>
        </div>

        <template v-if="pending && !list.length">
          <PgSkeletonCard v-for="i in 5" :key="i" />
        </template>

        <div v-else-if="!list.length" class="side__empty">
          <PgEmpty :size="140" />
          <b>Ничего не нашлось</b>
          <span>Аптек с такими условиями нет. Снимите часть фильтров.</span>
        </div>

        <div
          v-for="(p, i) in list"
          :key="p.id"
          class="pwrap pg-fade-up"
          :style="{ animationDelay: `${Math.min(i, 7) * 0.05}s` }"
        >
          <button
            class="pstar"
            type="button"
            :aria-pressed="favoriteIds.includes(p.id)"
            :aria-label="favoriteIds.includes(p.id) ? 'Убрать из избранного' : 'В избранное'"
            @click.stop="toggleFavorite(p.id, p.chain)"
          >
            {{ favoriteIds.includes(p.id) ? '★' : '☆' }}
          </button>

          <button
            class="pcard"
            :class="{ 'pcard--active': p.id === selected }"
            type="button"
            @click="selected = p.id"
          >
            <div class="pcard__top">
              <b>{{ p.chain }}</b>
              <span class="pcard__status" :data-status="p.status">
                <span class="pcard__dot" />
                {{ p.statusLabel }}
              </span>
            </div>
            <span class="pcard__addr">
              {{ p.address }} · {{ formatDistance(p.distance) }}
            </span>
            <div class="pcard__tags">
              <span class="tag">{{ p.district }}</span>
              <span v-if="p.is24h" class="tag tag--night">Круглосуточно</span>
              <span v-else class="tag">до {{ p.hours.split('–')[1] }}</span>
              <span v-if="p.delivery" class="tag">Доставка</span>
            </div>
          </button>
        </div>
      </aside>

      <section class="mapwrap">
        <ClientOnly>
          <PharmacyMap
            :pharmacies="list"
            :selected-id="selected"
            :user-coords="coords"
            :show-user="locationStatus === 'granted'"
            min-height="640px"
            @select="selected = $event"
          />
          <template #fallback>
            <div class="skeleton mapwrap__skeleton" />
          </template>
        </ClientOnly>

        <Transition name="detail">
          <div v-if="selectedPharmacy" class="detail">
            <div class="detail__text">
              <div class="detail__title">
                <b>{{ selectedPharmacy.chain }}</b>
                <span class="tag" :class="selectedPharmacy.is24h ? 'tag--night' : 'tag--in'">
                  {{ selectedPharmacy.statusLabel }}
                </span>
                <span class="tag">★ {{ selectedPharmacy.rating }}</span>
              </div>
              <span class="muted">
                {{ selectedPharmacy.address }} · {{ selectedPharmacy.hours }} ·
                {{ formatDistance(selectedPharmacy.distance) }}
              </span>
              <a :href="`tel:${selectedPharmacy.phone.replace(/\s/g, '')}`" class="detail__phone">
                {{ selectedPharmacy.phone }}
              </a>
            </div>

            <div class="detail__actions">
              <NuxtLink to="/search?q=Парацетамол" class="btn btn--sm">Лекарства здесь</NuxtLink>
              <a
                class="btn btn--sm btn--blue"
                :href="routeLink(selectedPharmacy)"
                target="_blank"
                rel="noopener noreferrer"
              >Маршрут</a>
              <button
                class="detail__close"
                type="button"
                aria-label="Закрыть карточку"
                @click="selected = null"
              >
                &times;
              </button>
            </div>
          </div>
        </Transition>
      </section>
    </div>
  </div>
</template>

<style scoped>
.head {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 16px;
  flex-wrap: wrap;
  padding: 20px 8px 6px;
}

.head__text {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.head__filters {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.layout {
  display: grid;
  grid-template-columns: minmax(0, 400px) minmax(0, 1fr);
  gap: var(--gap);
  align-items: start;
}

.side {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
  max-height: calc(100vh - 24px);
  overflow-y: auto;
  padding-right: 4px;
}

.side__search {
  display: flex;
  gap: 8px;
  background: var(--surface);
  border-radius: var(--r-pill);
  padding: 6px 6px 6px 18px;
  align-items: center;
  color: var(--ink-muted);
  position: sticky;
  top: 0;
  z-index: 3;
}

.side__search input {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: 0;
  font-size: 15px;
  padding: 9px 6px;
  background: transparent;
  color: var(--ink);
}

.side__search input::-webkit-search-cancel-button {
  appearance: none;
}

.side__geo {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: flex-start;
  padding: 2px 4px;
}

.side__geo-note {
  font-size: 12px;
}

.side__districts {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  padding: 0 2px 4px;
}

.chip--sm {
  font-size: 13px;
  font-weight: 500;
  padding: 7px 12px;
}

.side__empty {
  background: var(--surface);
  border-radius: var(--r-item);
  padding: 32px;
  text-align: center;
  color: var(--ink-muted);
  font-size: 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.side__empty b {
  font-size: 17px;
  color: var(--ink);
}

.pwrap {
  position: relative;
}

/* Звезда лежит поверх карточки: вкладывать кнопку в кнопку нельзя. */
.pstar {
  position: absolute;
  right: 10px;
  bottom: 10px;
  z-index: 2;
  width: 34px;
  height: 34px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
  color: var(--on-night-dim);
}

.pstar:hover {
  background: var(--bg);
  color: var(--amber-deep);
}

.pstar[aria-pressed='true'] {
  color: var(--amber);
}

.pcard {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 6px;
  text-align: left;
  border: 2px solid transparent;
  cursor: pointer;
  background: var(--surface);
  border-radius: var(--r-item);
  padding: 16px 18px;
  color: var(--ink);
  transition: border-color 0.15s var(--ease), box-shadow 0.15s var(--ease);
}

.pcard:hover {
  box-shadow: var(--shadow-md);
}

.pcard--active {
  border-color: var(--blue);
}

.pcard__top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  width: 100%;
}

.pcard__top b {
  font-size: 16px;
}

.pcard__status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: var(--green-deep);
  white-space: nowrap;
}

.pcard__status[data-status='night'] {
  color: var(--blue-deep);
}

.pcard__status[data-status='closed'] {
  color: var(--pink-deep);
}

.pcard__dot {
  width: 8px;
  height: 8px;
  background: currentcolor;
}

.pcard__addr {
  font-size: 14px;
  color: var(--ink-muted);
}

.pcard__tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  /* Справа снизу лежит кнопка избранного — оставляем ей место. */
  padding-right: 38px;
}

.mapwrap {
  position: relative;
  position: sticky;
  top: 12px;
  min-height: 640px;
  border-radius: var(--r-card-lg);
  overflow: hidden;
}

.mapwrap__skeleton {
  width: 100%;
  height: 640px;
}

.detail {
  position: absolute;
  left: 18px;
  right: 18px;
  bottom: 18px;
  z-index: 5;
  background: var(--surface);
  border-radius: var(--r-item);
  padding: 18px 20px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px 16px;
  align-items: center;
  box-shadow: var(--shadow-lg);
}

.detail__text {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  font-size: 14px;
}

.detail__title {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.detail__title b {
  font-size: 17px;
}

.detail__phone {
  font-size: 13px;
  font-weight: 600;
}

.detail__actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: flex-end;
  align-items: center;
}

.detail__close {
  width: 34px;
  height: 34px;
  border: 0;
  border-radius: 10px;
  background: var(--bg);
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
  color: var(--ink);
}

.detail__close:hover {
  background: var(--bg-2);
}

.detail-enter-active,
.detail-leave-active {
  transition: opacity 0.2s var(--ease), transform 0.2s var(--ease);
}

.detail-enter-from,
.detail-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

@media (width <= 900px) {
  .layout {
    grid-template-columns: 1fr;
  }

  .side {
    max-height: none;
    overflow: visible;
    order: 2;
  }

  .mapwrap {
    position: relative;
    top: auto;
    min-height: 380px;
    order: 1;
  }

  .mapwrap__skeleton {
    height: 380px;
  }

  .detail {
    grid-template-columns: 1fr;
  }

  .detail__actions {
    justify-content: flex-start;
  }
}
</style>
