<script setup lang="ts">
import type { OfferView } from '#shared/types'
import { formatPrice, plural } from '#shared/utils/catalog'

const route = useRoute()
const router = useRouter()
const { coords, label: locationLabel, status: locationStatus, locate } = useUserLocation()

const slug = computed(() => String(route.params.slug))
const formId = computed(() => String(route.query.form ?? ''))
const sort = computed(() => (route.query.sort === 'distance' ? 'distance' : 'price'))

const { data, error } = await useFetch(() => `/api/medicines/${slug.value}`, {
  query: computed(() => ({
    form: formId.value,
    sort: sort.value,
    lat: coords.value.lat,
    lng: coords.value.lng,
  })),
})

if (error.value) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Препарат не найден',
    fatal: true,
  })
}

const medicine = computed(() => data.value!.medicine)
const offers = computed(() => data.value?.offers ?? [])
const stats = computed(() => data.value?.stats ?? null)
const activeForm = computed(() => data.value?.form ?? medicine.value.forms[0]!)

function patch(next: Record<string, string | undefined>) {
  router.replace({ query: { ...route.query, ...next } })
}

const toast = useToast()

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

/** Столбики цен по аптекам — от самой дешёвой к самой дорогой. */
const priceBars = computed(() => {
  const prices = [...offers.value.map(o => o.price)].sort((a, b) => a - b)
  const peak = Math.max(...prices, 1)
  return prices.slice(0, 12).map((price, i) => ({
    price,
    height: `${Math.round((price / peak) * 80) + 10}%`,
    color:
      i === 0
        ? 'var(--green)'
        : i === prices.length - 1
          ? 'var(--blue)'
          : '#B4C3D1',
  }))
})

const bestPrice = computed(() => (stats.value ? stats.value.min : null))
const reserving = ref<OfferView | null>(null)
const ordering = ref<OfferView | null>(null)

/** Аптеки, где препарат есть — их и показываем на карте. */
const mapPharmacies = computed(() => offers.value.map(o => o.pharmacy))

/** На маркерах вместо названия сети — цена, так карта полезнее. */
const mapLabels = computed(() =>
  Object.fromEntries(
    offers.value.map(o => [o.pharmacy.id, `${formatPrice(o.price)} сом`]),
  ),
)

const selectedPharmacy = ref<string | null>(null)

/** Клик по маркеру подсвечивает предложение и подводит к нему список. */
function pickOnMap(id: string) {
  selectedPharmacy.value = id
  if (!import.meta.client) return
  document.getElementById(`offer-${id}`)?.scrollIntoView({
    behavior: 'smooth',
    block: 'center',
  })
}

const config = useRuntimeConfig()

useSeoMeta({
  title: computed(() => `${medicine.value.name} — цены в аптеках Бишкека`),
  description: computed(() =>
    stats.value
      ? `${medicine.value.name} (${medicine.value.substance}) в ${stats.value.count} аптеках Бишкека: от ${stats.value.min} до ${stats.value.max} сом. Наличие, аналоги, бронь на 3 часа.`
      : `${medicine.value.name} — наличие и цены в аптеках Бишкека.`,
  ),
})

// Разметка товара для поисковых систем.
useHead({
  script: [
    {
      type: 'application/ld+json',
      innerHTML: computed(() =>
        JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Drug',
          'name': medicine.value.name,
          'activeIngredient': medicine.value.substance,
          'manufacturer': { '@type': 'Organization', 'name': medicine.value.manufacturer },
          'prescriptionStatus': medicine.value.prescription
            ? 'PrescriptionOnly'
            : 'OTC',
          'offers': stats.value
            ? {
                '@type': 'AggregateOffer',
                'priceCurrency': 'KGS',
                'lowPrice': stats.value.min,
                'highPrice': stats.value.max,
                'offerCount': stats.value.count,
              }
            : undefined,
          'url': `${config.public.siteUrl}/medicine/${medicine.value.slug}`,
        }),
      ),
    },
  ],
})
</script>

<template>
  <div class="page-body">
    <nav class="crumbs" aria-label="Хлебные крошки">
      <NuxtLink to="/">Главная</NuxtLink>
      <span aria-hidden="true">/</span>
      <NuxtLink :to="{ path: '/search', query: { q: medicine.substance } }">
        {{ medicine.substance }}
      </NuxtLink>
      <span aria-hidden="true">/</span>
      <span class="crumbs__now">{{ activeForm.label }}</span>
    </nav>

    <section class="head section section--white">
      <div class="head__art dotted-map">
        <PharmaLogo variant="light" :width="120" :height="94" />
        <span>{{ medicine.substance }}</span>
      </div>

      <div class="head__body">
        <div class="head__tags">
          <span class="tag" :class="medicine.prescription ? 'tag--rx' : 'tag--in'">
            {{ medicine.prescription ? 'По рецепту' : 'Без рецепта' }}
          </span>
          <span class="tag">{{ medicine.category }}</span>
        </div>

        <h1 class="head__title">{{ medicine.name }}, {{ activeForm.label.toLowerCase() }}</h1>

        <dl class="head__facts">
          <div>
            <dt>Действующее вещество</dt>
            <dd>{{ medicine.substance }}</dd>
          </div>
          <div>
            <dt>Производитель</dt>
            <dd>{{ medicine.manufacturer }}</dd>
          </div>
          <div>
            <dt>Форма выпуска</dt>
            <dd>{{ activeForm.label }}</dd>
          </div>
        </dl>

        <div class="head__forms">
          <button
            v-for="f in medicine.forms"
            :key="f.id"
            class="chip chip--onbg"
            type="button"
            :aria-pressed="activeForm.id === f.id"
            @click="patch({ form: f.id })"
          >
            {{ f.short }}
          </button>
        </div>

        <div class="head__buy">
          <div class="head__price">
            <span class="muted">Цена в аптеках города</span>
            <b class="num">
              {{ stats ? `${formatPrice(stats.min)}–${formatPrice(stats.max)} сом` : '—' }}
            </b>
          </div>
          <a href="#buy" class="btn btn--primary">Где купить рядом</a>
        </div>
      </div>
    </section>

    <div class="layout">
      <main class="main">
        <section id="buy" class="card buy">
          <div class="buy__head">
            <h2 class="h-block">Где купить</h2>
            <div class="seg">
              <button
                class="seg__btn"
                type="button"
                :class="{ 'seg__btn--on': sort === 'price' }"
                @click="patch({ sort: 'price' })"
              >
                Дешевле
              </button>
              <button
                class="seg__btn"
                type="button"
                :class="{ 'seg__btn--on': sort === 'distance' }"
                @click="patch({ sort: 'distance' })"
              >
                Ближе
              </button>
            </div>
          </div>

          <div v-if="stats" class="chart">
            <div class="chart__head">
              <span class="muted">
                Цены в {{ stats.count }}
                {{ plural(stats.count, 'аптеке', 'аптеках', 'аптеках') }}
              </span>
              <b class="num">медиана {{ formatPrice(stats.median) }} сом</b>
            </div>
            <div class="chart__bars">
              <div v-for="(bar, i) in priceBars" :key="i" class="chart__col">
                <span class="chart__value num">{{ bar.price }}</span>
                <div
                  class="chart__bar"
                  :style="{ height: bar.height, background: bar.color }"
                />
              </div>
            </div>
            <div class="chart__scale">
              <span>дешевле</span>
              <span>дороже</span>
            </div>
          </div>

          <button
            v-if="locationStatus !== 'granted'"
            class="btn btn--sm buy__geo"
            type="button"
            @click="requestLocation"
          >
            📍 Показать расстояния от меня
          </button>
          <span class="buy__note muted">{{ locationLabel }}</span>

          <div class="buy__list pg-stagger">
            <OfferCard
              v-for="offer in offers"
              :id="`offer-${offer.pharmacyId}`"
              :key="offer.pharmacyId"
              :offer="offer"
              :best-price="bestPrice"
              :highlighted="offer.price === bestPrice || offer.pharmacyId === selectedPharmacy"
              @reserve="reserving = $event"
              @order="ordering = $event"
            />
            <p v-if="!offers.length" class="muted">
              Сейчас препарата нет ни в одной подключённой аптеке.
            </p>
          </div>
        </section>

        <section v-if="mapPharmacies.length" class="card">
        <div class="buy__head">
          <h2 class="h-block">Где купить на карте</h2>
          <span class="muted">Цена показана прямо на метке</span>
        </div>
        <div class="mapbox">
          <ClientOnly>
            <PharmacyMap
              :pharmacies="mapPharmacies"
              :labels="mapLabels"
              :selected-id="selectedPharmacy"
              :user-coords="coords"
              :show-user="locationStatus === 'granted'"
              min-height="360px"
              @select="pickOnMap"
            />
            <template #fallback>
              <div class="skeleton mapbox__skeleton" />
            </template>
          </ClientOnly>
        </div>
      </section>

      <section v-if="data?.analogs?.length" class="card">
          <h2 class="h-block">Аналоги с тем же действующим веществом</h2>
          <div class="analogs pg-stagger">
            <NuxtLink
              v-for="a in data.analogs"
              :key="a.slug"
              :to="`/medicine/${a.slug}`"
              class="analog"
            >
              <b>{{ a.name }}</b>
              <span class="muted">{{ a.form }}</span>
              <span class="analog__price num">
                {{ a.minPrice ? `от ${formatPrice(a.minPrice)} сом` : 'нет в наличии' }}
              </span>
            </NuxtLink>
          </div>
        </section>
      </main>

      <aside class="aside">
        <section class="card card--flush">
          <h2 class="aside__title">Инструкция кратко</h2>
          <AccordionList :items="medicine.info" variant="flush" />
        </section>

        <p class="warn">
          Информация не заменяет консультацию врача. Перед применением прочитайте
          полную инструкцию.
        </p>

        <NuxtLink to="/map" class="card aside__map">
          <b>Все аптеки на карте</b>
          <span class="muted">Маршрут, режим работы и дежурные аптеки Бишкека</span>
        </NuxtLink>
      </aside>
    </div>

    <ReserveDialog
      :offer="reserving"
      :medicine-slug="medicine.slug"
      :medicine-name="medicine.name"
      :form-id="activeForm.id"
      :form-label="activeForm.label"
      @close="reserving = null"
    />

    <OrderDialog
      :offer="ordering"
      :medicine-slug="medicine.slug"
      :medicine-name="medicine.name"
      :form-id="activeForm.id"
      :form-label="activeForm.label"
      @close="ordering = null"
    />
  </div>
</template>

<style scoped>
.crumbs {
  display: flex;
  gap: 8px;
  font-size: 13px;
  color: var(--ink-muted);
  padding: 4px 8px;
  flex-wrap: wrap;
}

.crumbs a {
  color: var(--ink-muted);
}

.crumbs a:hover {
  color: var(--blue);
}

.crumbs__now {
  color: var(--ink);
}

.head {
  display: grid;
  grid-template-columns: minmax(0, 300px) minmax(0, 1fr);
  gap: 36px;
  align-items: center;
  padding: clamp(24px, 3vw, 36px);
}

.head__art {
  aspect-ratio: 1;
  border-radius: var(--r-card);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  color: #3b5473;
  font-size: 13px;
  font-weight: 600;
  text-align: center;
  padding: 20px;
}

.head__body {
  display: flex;
  flex-direction: column;
  gap: 18px;
  min-width: 0;
}

.head__tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.head__title {
  font-size: clamp(28px, 3.4vw, 44px);
}

.head__facts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px 24px;
  font-size: 14px;
  margin: 0;
}

.head__facts dt {
  color: var(--on-night-dim);
  margin-bottom: 3px;
}

.head__facts dd {
  margin: 0;
  font-weight: 700;
}

.head__forms {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.head__buy {
  display: flex;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
  padding-top: 6px;
}

.head__price {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 13px;
}

.head__price b {
  font-size: 30px;
}

.layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 360px);
  gap: var(--gap);
  align-items: start;
}

.main {
  display: flex;
  flex-direction: column;
  gap: var(--gap);
  min-width: 0;
}

.card {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 24px;
  border-radius: var(--r-card);
}

.card--flush {
  padding: 0;
  gap: 0;
}

.buy__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.buy__list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.buy__list :deep(.offer) {
  background: var(--bg);
}

.buy__geo {
  align-self: flex-start;
}

.buy__note {
  font-size: 12px;
  margin-top: -10px;
}

.seg {
  display: flex;
  background: var(--bg);
  border-radius: var(--r-pill);
  padding: 4px;
  gap: 2px;
}

.seg__btn {
  border: 0;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  padding: 7px 14px;
  border-radius: var(--r-pill);
  background: transparent;
  color: var(--ink);
}

.seg__btn--on {
  background: #fff;
  box-shadow: var(--shadow-sm);
}

.mapbox {
  min-height: 360px;
  border-radius: var(--r-sm);
  overflow: hidden;
}

.mapbox__skeleton {
  width: 100%;
  height: 360px;
}

.chart {
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: var(--bg);
  border-radius: var(--r-sm);
  padding: 16px;
}

.chart__head {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  flex-wrap: wrap;
  gap: 8px;
}

.chart__bars {
  display: flex;
  align-items: flex-end;
  gap: 4px;
  height: 64px;
}

.chart__col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  height: 100%;
  justify-content: flex-end;
}

.chart__value {
  font-size: 11px;
  font-weight: 600;
}

.chart__bar {
  width: 100%;
  border-radius: 3px 3px 0 0;
}

.chart__scale {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: var(--on-night-dim);
}

.analogs {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(180px, 100%), 1fr));
  gap: 10px;
}

.analog {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 16px;
  border-radius: var(--r-sm);
  background: var(--bg);
  color: var(--ink);
  font-size: 13px;
}

.analog:hover {
  background: var(--bg-2);
  color: var(--ink);
}

.analog b {
  font-size: 15px;
}

.analog__price {
  font-weight: 600;
  color: var(--blue);
}

.aside {
  display: flex;
  flex-direction: column;
  gap: var(--gap);
  min-width: 0;
}

.aside__title {
  font-size: 16px;
  font-weight: 800;
  letter-spacing: -0.01em;
  padding: 20px 16px 10px;
}

.warn {
  background: var(--amber-soft);
  border-radius: var(--r-item);
  padding: 16px 18px;
  font-size: 13px;
  line-height: 1.5;
  color: #6b5630;
}

.aside__map {
  gap: 6px;
  color: var(--ink);
  font-size: 13px;
}

.aside__map:hover {
  color: var(--ink);
  box-shadow: var(--shadow-md);
}

.aside__map b {
  font-size: 16px;
}

@media (width <= 900px) {
  .layout {
    grid-template-columns: 1fr;
  }

  .head {
    grid-template-columns: 1fr;
  }

  .head__art {
    aspect-ratio: 16 / 7;
  }
}
</style>
