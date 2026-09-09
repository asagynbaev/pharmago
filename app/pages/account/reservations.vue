<script setup lang="ts">
import { formatPrice } from '#shared/utils/catalog'

const { data, status } = await useFetch('/api/reservations')

const items = computed(() => data.value?.items ?? [])
const active = computed(() => items.value.filter(r => !r.expired))
const expired = computed(() => items.value.filter(r => r.expired))

const timeLeft = (iso: string) => {
  const mins = Math.max(0, Math.round((new Date(iso).getTime() - Date.now()) / 60_000))
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (!mins) return 'время вышло'
  return h ? (m ? `${h} ч ${m} мин` : `${h} ч`) : `${m} мин`
}

const timeAt = (iso: string) =>
  new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })

const routeLink = (p: { lat: number, lng: number }) =>
  `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`

const holdMinutes = (iso: string) =>
  Math.max(Math.round((new Date(iso).getTime() - Date.now()) / 60_000), 1)

useSeoMeta({ title: 'Мои брони' })
</script>

<template>
  <div class="page-body">
    <template v-if="status === 'pending' && !items.length">
      <PgSkeletonCard v-for="i in 2" :key="i" />
    </template>

    <div v-else-if="!items.length" class="empty">
      <PgEmpty :size="150" />
      <b>Броней пока нет</b>
      <p>Найдите лекарство и нажмите «Забронировать» — аптека отложит его на 3 часа.</p>
      <NuxtLink to="/search" class="btn btn--primary">Найти лекарство</NuxtLink>
    </div>

    <template v-else>
      <article v-for="r in active" :key="r.code" class="res">
        <div class="res__side">
          <PgDrain
            :size="56"
            :duration="holdMinutes(r.expiresAt)"
            label="Сколько держится бронь"
          />
          <b class="res__code">{{ r.code }}</b>
        </div>

        <div class="res__body">
          <div class="res__title">
            <b>{{ r.medicine?.name }}</b>
            <span class="tag tag--in">Активна</span>
          </div>
          <span class="muted">{{ r.medicine?.form }}</span>
          <span class="res__where">
            <b>{{ r.pharmacy?.chain }}</b>, {{ r.pharmacy?.address }}
          </span>
          <span class="muted">
            Осталось {{ timeLeft(r.expiresAt) }} · до {{ timeAt(r.expiresAt) }} ·
            цена зафиксирована {{ formatPrice(r.price) }} сом
          </span>

          <div class="res__actions">
            <a
              v-if="r.pharmacy"
              class="btn btn--sm"
              :href="`tel:${r.pharmacy.phone.replace(/\s/g, '')}`"
            >Позвонить</a>
            <a
              v-if="r.pharmacy"
              class="btn btn--sm btn--blue"
              :href="routeLink(r.pharmacy)"
              target="_blank"
              rel="noopener noreferrer"
            >Маршрут</a>
            <NuxtLink
              v-if="r.medicine"
              class="btn btn--sm"
              :to="`/medicine/${r.medicine.slug}`"
            >К препарату</NuxtLink>
          </div>
        </div>
      </article>

      <section v-if="expired.length" class="past">
        <h2 class="past__title">Истёкшие</h2>
        <article v-for="r in expired" :key="r.code" class="res res--past">
          <div class="res__body">
            <div class="res__title">
              <b>{{ r.medicine?.name }}</b>
              <span class="tag">Истекла</span>
            </div>
            <span class="muted">
              {{ r.code }} · {{ r.pharmacy?.chain }}, {{ r.pharmacy?.address }}
            </span>
            <div class="res__actions">
              <NuxtLink
                v-if="r.medicine"
                class="btn btn--sm btn--blue"
                :to="`/medicine/${r.medicine.slug}`"
              >Забронировать снова</NuxtLink>
            </div>
          </div>
        </article>
      </section>
    </template>
  </div>
</template>

<style scoped>
.res {
  background: var(--surface);
  border-radius: var(--r-card);
  padding: 22px;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 20px;
  align-items: center;
}

.res--past {
  grid-template-columns: minmax(0, 1fr);
  opacity: 0.75;
}

.res__side {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.res__code {
  font-size: 16px;
  letter-spacing: 0.06em;
  white-space: nowrap;
}

.res__body {
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 0;
  font-size: 16px;
}

.res__title {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.res__title b {
  font-size: 17px;
}

.res__where {
  font-size: 15px;
}

.res__actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 8px;
}

.past {
  display: flex;
  flex-direction: column;
  gap: var(--gap);
}

.past__title {
  font-size: 16px;
  font-weight: 700;
  color: var(--ink-muted);
  padding: 8px 6px 0;
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

@media (width <= 560px) {
  .res {
    grid-template-columns: minmax(0, 1fr);
  }

  .res__side {
    flex-direction: row;
    justify-content: flex-start;
  }
}
</style>
