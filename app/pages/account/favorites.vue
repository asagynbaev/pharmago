<script setup lang="ts">
import { formatDistance } from '#shared/utils/catalog'

const { coords } = useUserLocation()
const toast = useToast()

const { data, refresh, status } = await useFetch('/api/favorites', {
  query: computed(() => ({ lat: coords.value.lat, lng: coords.value.lng })),
})

const items = computed(() => data.value?.items ?? [])

async function remove(id: string, chain: string) {
  await $fetch('/api/favorites', { method: 'POST', body: { pharmacyId: id } })
  toast.info('Убрано из избранного', chain)
  await refresh()
}

const routeLink = (p: { lat: number, lng: number }) =>
  `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`

const telLink = (phone: string) => `tel:${phone.replace(/\s/g, '')}`

useSeoMeta({ title: 'Избранные аптеки' })
</script>

<template>
  <div class="page-body">
    <template v-if="status === 'pending' && !items.length">
      <PgSkeletonCard v-for="i in 2" :key="i" />
    </template>

    <div v-else-if="!items.length" class="empty">
      <PgEmpty :size="150" />
      <b>Избранных аптек нет</b>
      <p>Отметьте аптеку звёздочкой на карте — она появится здесь.</p>
      <NuxtLink to="/map" class="btn btn--primary">Открыть карту</NuxtLink>
    </div>

    <template v-else>
      <div class="mapbox">
        <ClientOnly>
          <PharmacyMap
            :pharmacies="items"
            :user-coords="coords"
            min-height="300px"
          />
          <template #fallback>
            <div class="skeleton mapbox__skeleton" />
          </template>
        </ClientOnly>
      </div>

      <article v-for="p in items" :key="p.id" class="fav">
        <div class="fav__main">
          <div class="fav__title">
            <b>{{ p.chain }}</b>
            <span
              class="tag"
              :class="p.is24h ? 'tag--night' : p.isOpen ? 'tag--in' : 'tag--out'"
            >{{ p.statusLabel }}</span>
            <span class="tag">★ {{ p.rating }}</span>
          </div>
          <span class="muted">
            {{ p.address }} · {{ p.district }} · {{ formatDistance(p.distance) }}
          </span>
          <span class="muted">{{ p.hours }} · {{ p.phone }}</span>
        </div>

        <div class="fav__actions">
          <a class="btn btn--sm" :href="telLink(p.phone)">Позвонить</a>
          <a
            class="btn btn--sm btn--blue"
            :href="routeLink(p)"
            target="_blank"
            rel="noopener noreferrer"
          >Маршрут</a>
          <button class="btn btn--sm" type="button" @click="remove(p.id, p.chain)">
            Убрать
          </button>
        </div>
      </article>
    </template>
  </div>
</template>

<style scoped>
.mapbox {
  min-height: 300px;
  border-radius: var(--r-card);
  overflow: hidden;
}

.mapbox__skeleton {
  width: 100%;
  height: 300px;
}

.fav {
  background: var(--surface);
  border-radius: var(--r-card);
  padding: 20px 22px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.fav__main {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  font-size: 14px;
}

.fav__title {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.fav__title b {
  font-size: 17px;
}

.fav__actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.empty {
  background: var(--surface);
  border-radius: var(--r-card);
  padding: 48px;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: center;
  color: var(--ink-muted);
}

.empty b {
  font-size: 18px;
  color: var(--ink);
}
</style>
