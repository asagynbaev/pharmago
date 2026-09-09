<script setup lang="ts">
import type { OfferView } from '#shared/types'
import { formatDistance, formatPrice } from '#shared/utils/catalog'

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

/** Насколько дороже самого дешёвого предложения — словами, а не знаком «+». */
const overpay = computed(() => {
  if (!props.bestPrice || props.offer.price <= props.bestPrice) return null
  return props.offer.price - props.bestPrice
})

const isBest = computed(
  () => props.bestPrice !== null && props.offer.price === props.bestPrice,
)

/** Режим работы одной понятной фразой, без сокращений вроде «24/7». */
const hoursLabel = computed(() => {
  const p = props.offer.pharmacy
  if (p.is24h) return 'Работает круглосуточно'
  const [opens, closes] = p.hours.split('–')
  return p.isOpen ? `Открыто до ${closes}` : `Закрыто, откроется в ${opens}`
})

const mapsLink = computed(() => {
  const { lat, lng } = props.offer.pharmacy
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
})
</script>

<template>
  <article class="offer" :class="{ 'offer--hl': highlighted }">
    <div class="offer__head">
      <h3 class="offer__name">{{ offer.pharmacy.chain }}</h3>
      <span class="tag" :class="stockClass">{{ offer.stockLabel }}</span>
      <span v-if="isBest" class="tag tag--in">Самая низкая цена</span>
    </div>

    <p class="offer__where">
      {{ offer.pharmacy.address }} · {{ formatDistance(offer.pharmacy.distance) }} от вас
    </p>

    <p class="offer__hours" :data-status="offer.pharmacy.status">
      {{ hoursLabel }}
    </p>

    <div class="offer__price">
      <b class="num">{{ formatPrice(offer.price) }} сом</b>
      <span v-if="overpay" class="offer__over">
        дороже на {{ formatPrice(overpay) }} сом
      </span>
    </div>

    <button
      v-if="reservable"
      class="btn btn--primary offer__main-action"
      type="button"
      :disabled="offer.stock === 'out'"
      @click="emit('reserve', offer)"
    >
      Забронировать
    </button>

    <div class="offer__extra">
      <a class="offer__link" :href="mapsLink" target="_blank" rel="noopener noreferrer">
        Как доехать
      </a>
      <button
        v-if="reservable && offer.pharmacy.delivery"
        class="offer__link"
        type="button"
        :disabled="offer.stock === 'out'"
        @click="emit('order', offer)"
      >
        Привезти домой
      </button>
    </div>
  </article>
</template>

<style scoped>
.offer {
  background: var(--surface);
  border-radius: var(--r-item);
  padding: 22px 24px;
  border: 2px solid transparent;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
  transition: box-shadow 0.15s var(--ease), border-color 0.15s var(--ease);
}

.offer:hover {
  box-shadow: var(--shadow-md);
}

.offer--hl {
  border-color: var(--green);
}

.offer__head {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.offer__name {
  font-size: 22px;
  letter-spacing: -0.02em;
  margin: 0;
}

.offer__where {
  font-size: var(--t-meta);
  color: var(--ink-muted);
}

.offer__hours {
  font-size: var(--t-meta);
  font-weight: 600;
  color: var(--green-deep);
}

.offer__hours[data-status='night'] {
  color: var(--blue-deep);
}

.offer__hours[data-status='closed'] {
  color: var(--ink-muted);
}

.offer__price {
  display: flex;
  align-items: baseline;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 6px;
}

.offer__price b {
  font-size: 30px;
  line-height: 1.1;
}

.offer__over {
  font-size: var(--t-meta);
  color: var(--ink-muted);
}

/* Одно очевидное действие на карточку — во всю ширину. */
.offer__main-action {
  width: 100%;
  margin-top: 10px;
  font-size: 18px;
}

/* Второстепенное — текстовыми ссылками, чтобы не спорить с главной кнопкой. */
.offer__extra {
  display: flex;
  gap: 22px;
  flex-wrap: wrap;
  margin-top: 4px;
}

.offer__link {
  border: 0;
  background: transparent;
  padding: 10px 0;
  min-height: 44px;
  cursor: pointer;
  font-size: var(--t-meta);
  font-weight: 600;
  color: var(--blue);
  text-align: left;
}

.offer__link:hover {
  color: #0059c9;
}

.offer__link:disabled {
  color: var(--ink-muted);
  cursor: not-allowed;
}

/* На широком экране карточка разворачивается в две колонки. */
@media (width >= 760px) {
  .offer {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(210px, auto);
    column-gap: 28px;
    align-items: start;
  }

  .offer__head,
  .offer__where,
  .offer__hours {
    grid-column: 1;
  }

  .offer__price {
    grid-column: 2;
    grid-row: 1 / 3;
    justify-content: flex-end;
    margin-top: 0;
  }

  .offer__main-action {
    grid-column: 2;
    grid-row: 3;
    margin-top: 0;
  }

  .offer__extra {
    grid-column: 1;
    grid-row: 4;
    margin-top: 8px;
  }
}
</style>
