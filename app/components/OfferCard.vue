<script setup lang="ts">
import type { OfferView } from '#shared/types'
import { formatDistance, formatFreshness, formatPrice } from '#shared/utils/catalog'

const props = withDefaults(
  defineProps<{
    offer: OfferView
    /** Показывать ли кнопку брони. */
    reservable?: boolean
    /** Цена, с которой сравниваем — обычно минимальная в выдаче. */
    bestPrice?: number | null
    highlighted?: boolean
  }>(),
  { reservable: true, bestPrice: null, highlighted: false },
)

const emit = defineEmits<{
  reserve: [offer: OfferView]
  order: [offer: OfferView]
}>()

const stockClass = computed(() => `tag--${props.offer.stock}`)

/** На сколько это дороже самого дешёвого предложения. */
const overpay = computed(() => {
  if (!props.bestPrice || props.offer.price <= props.bestPrice) return null
  return props.offer.price - props.bestPrice
})

const isBest = computed(
  () => props.bestPrice !== null && props.offer.price === props.bestPrice,
)

const freshness = computed(() => {
  const minutes = Math.max(
    1,
    Math.round((Date.now() - new Date(props.offer.updatedAt).getTime()) / 60_000),
  )
  return formatFreshness(minutes)
})

const mapsLink = computed(() => {
  const { lat, lng } = props.offer.pharmacy
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
})
</script>

<template>
  <article class="offer" :class="{ 'offer--hl': highlighted }">
    <div class="offer__main">
      <div class="offer__title">
        <NuxtLink :to="`/map?pharmacy=${offer.pharmacy.id}`" class="offer__name">
          {{ offer.pharmacy.chain }}
        </NuxtLink>
        <span class="tag" :class="stockClass">{{ offer.stockLabel }}</span>
        <span v-if="offer.pharmacy.is24h" class="tag tag--night">24/7</span>
        <span v-if="offer.pharmacy.delivery" class="tag">Доставка</span>
        <span v-if="isBest" class="tag tag--in">Лучшая цена</span>
      </div>

      <span class="offer__addr">
        {{ offer.pharmacy.address }} · {{ offer.pharmacy.district }} ·
        {{ formatDistance(offer.pharmacy.distance) }}
      </span>

      <span class="offer__hours" :data-status="offer.pharmacy.status">
        {{ offer.pharmacy.is24h ? 'Круглосуточно' : offer.pharmacy.isOpen
          ? `Открыто до ${offer.pharmacy.hours.split('–')[1]}`
          : `Закрыто · откроется в ${offer.pharmacy.hours.split('–')[0]}` }}
        <span class="offer__fresh">· обновлено {{ freshness }}</span>
      </span>
    </div>

    <div class="offer__side">
      <div class="offer__price">
        <b class="num">{{ formatPrice(offer.price) }} сом</b>
        <span v-if="overpay" class="offer__over">+{{ formatPrice(overpay) }} к лучшей</span>
      </div>
      <div class="offer__actions">
        <a
          class="btn btn--sm"
          :href="mapsLink"
          target="_blank"
          rel="noopener noreferrer"
        >Маршрут</a>
        <button
          v-if="reservable && offer.pharmacy.delivery"
          class="btn btn--sm"
          type="button"
          :disabled="offer.stock === 'out'"
          @click="emit('order', offer)"
        >
          Доставка
        </button>
        <button
          v-if="reservable"
          class="btn btn--sm btn--blue"
          type="button"
          :disabled="offer.stock === 'out'"
          @click="emit('reserve', offer)"
        >
          Забронировать
        </button>
      </div>
    </div>
  </article>
</template>

<style scoped>
.offer {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px 20px;
  align-items: center;
  background: var(--surface);
  border-radius: var(--r-item);
  padding: 18px 22px;
  border: 2px solid transparent;
  transition: box-shadow 0.15s var(--ease), border-color 0.15s var(--ease);
}

.offer:hover {
  box-shadow: var(--shadow-md);
}

.offer--hl {
  border-color: var(--green);
}

.offer__main {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.offer__title {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.offer__name {
  font-size: 17px;
  font-weight: 700;
  color: var(--ink);
}

.offer__name:hover {
  color: var(--blue);
}

.offer__addr {
  font-size: 14px;
  color: var(--ink-muted);
}

.offer__hours {
  font-size: 13px;
  color: var(--green-deep);
}

.offer__hours[data-status='night'] {
  color: var(--blue-deep);
}

.offer__hours[data-status='closed'] {
  color: var(--ink-muted);
}

.offer__fresh {
  color: var(--on-night-dim);
}

.offer__side {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 10px;
}

.offer__price {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}

.offer__price b {
  font-size: 22px;
  white-space: nowrap;
}

.offer__over {
  font-size: 12px;
  color: var(--ink-muted);
  white-space: nowrap;
}

.offer__actions {
  display: flex;
  gap: 6px;
}

@media (width <= 620px) {
  .offer {
    grid-template-columns: 1fr;
    padding: 16px 18px;
  }

  .offer__side {
    align-items: stretch;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }

  .offer__price {
    align-items: flex-start;
  }
}
</style>
