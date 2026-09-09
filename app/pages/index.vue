<script setup lang="ts">
import { formatDistance, formatPrice, plural } from '#shared/utils/catalog'
import { popularQueries } from '#shared/data/medicines'

const router = useRouter()
const { coords, label: locationLabel, status: locationStatus, locate } = useUserLocation()

const query = ref('')

const { data: stats } = await useFetch('/api/stats')

// Витрина выдачи на главной: показываем настоящие предложения по парацетамолу.
const sort = ref<'price' | 'distance'>('price')
const demoQuery = computed(() => ({
  slug: 'paracetamol-500',
  lat: coords.value.lat,
  lng: coords.value.lng,
  sort: sort.value,
}))
const { data: demo } = await useFetch('/api/search', { query: demoQuery })

const demoOffers = computed(() => demo.value?.offers.slice(0, 5) ?? [])

const { data: pharmacyData } = await useFetch('/api/pharmacies', {
  query: computed(() => ({ lat: coords.value.lat, lng: coords.value.lng })),
})
const mapPharmacies = computed(() => pharmacyData.value?.items ?? [])
const selectedPharmacy = ref<string | null>(null)

/** Плитка «каждая N-я аптека работает ночью» — 60 клеток по долям режимов. */
const modeCells = computed(() => {
  const s = stats.value
  if (!s) return []
  const night = Math.round((s.night / s.pharmacies) * 60)
  const late = Math.round(((s.pharmacies - s.night) / s.pharmacies) * 60 * 0.52)
  return Array.from({ length: 60 }, (_, i) => {
    if (i < night) return 'var(--blue)'
    if (i < night + late) return 'var(--green)'
    return 'var(--blue-soft)'
  })
})

const modes = computed(() => {
  const s = stats.value
  if (!s) return []
  const nightPct = Math.round((s.night / s.pharmacies) * 100)
  const latePct = Math.round(((100 - nightPct) * 0.52))
  return [
    { label: 'Круглосуточно', pct: nightPct, color: 'var(--blue)' },
    { label: 'До 22:00–23:00', pct: latePct, color: 'var(--green)' },
    { label: 'До 20:00–21:00', pct: 100 - nightPct - latePct, color: 'var(--blue-soft)' },
  ]
})

const timeBars = [
  { label: 'Обзвон аптек', value: '25 мин', width: 100, color: 'var(--night)' },
  { label: 'Обход аптек в районе', value: '1 ч 10 мин', width: 100, color: '#3B5473' },
  { label: 'PharmaGO', value: '40 сек', width: 3, color: 'var(--blue)' },
]

const spreadMax = computed(() =>
  Math.max(...(stats.value?.spreads.map(s => s.max) ?? [1])),
)

const faqs = [
  {
    title: 'Насколько актуальны цены и наличие?',
    text: 'Аптеки передают остатки автоматически из своих учётных систем. Большинство сетей обновляются несколько раз в день, время последнего обновления показано у каждого предложения.',
  },
  {
    title: 'Можно ли забронировать лекарство?',
    text: 'Да. Нажмите «Забронировать» у нужной аптеки — товар отложат на 3 часа. Оплата на месте, бронь бесплатна.',
  },
  {
    title: 'Есть ли доставка?',
    text: 'Часть аптек доставляет по Бишкеку в течение 1–2 часов. Такие аптеки отмечены значком «Доставка» в результатах поиска.',
  },
  {
    title: 'Как подключить свою аптеку?',
    text: 'Оставьте заявку в разделе «Аптекам». Подключение бесплатное, интеграция с 1С и большинством аптечных систем занимает один день.',
  },
]

function goTo(name: string) {
  router.push({ path: '/search', query: { q: name } })
}

const toast = useToast()

async function requestLocation() {
  const dismiss = toast.show({ title: 'Определяем местоположение…', duration: 0 })
  await locate()
  dismiss()
  if (locationStatus.value === 'granted') {
    toast.success('Готово', 'Расстояния теперь считаются от вас')
  }
  else {
    toast.error('Не удалось определить место', 'Считаем расстояния от центра города')
  }
}

useSeoMeta({
  title: 'Поиск лекарств в аптеках Бишкека',
  description:
    'Найдите лекарство в аптеках Бишкека: цены, наличие, режим работы и ближайшая аптека на карте. Бронирование на 3 часа без предоплаты.',
  ogTitle: 'PharmaGO — поиск лекарств в аптеках Бишкека',
  ogDescription:
    'Одно поле поиска — и вы видите, в каких аптеках Бишкека есть нужное лекарство, по какой цене и где ближе забрать.',
})
</script>

<template>
  <div class="page-body">
    <!-- Герой -->
    <section id="search" class="hero">
      <PharmaLogo class="hero__mark" variant="light" width="100%" height="100%" />

      <div class="hero__top">
        <span class="hero__badge">
          <span class="hero__dot" />
          Бишкек · {{ stats?.pharmacies ?? 0 }}
          {{ plural(stats?.pharmacies ?? 0, 'аптека', 'аптеки', 'аптек') }} в базе
        </span>
        <h1 class="hero__title">Pharma<span class="hero__go">GO</span></h1>
        <p class="hero__lead">
          Одно поле поиска — и вы видите, в каких аптеках Бишкека есть нужное
          лекарство, по какой цене и где ближе забрать.
        </p>
      </div>

      <div class="hero__search">
        <SearchBar v-model="query" />
        <div class="hero__popular">
          <span class="hero__popular-label">Часто ищут:</span>
          <button
            v-for="name in popularQueries"
            :key="name"
            class="chip chip--onnight"
            type="button"
            @click="goTo(name)"
          >
            {{ name }}
          </button>
        </div>
      </div>
    </section>

    <!-- Ключевые цифры -->
    <section class="grid-auto pg-stagger" aria-label="Сервис в цифрах">
      <div class="tile tile--green">
        <span class="tile__num num">{{ stats?.pharmacies ?? '—' }}</span>
        <b>Аптек в базе</b>
        <p>Сети и одиночные аптеки — от центра до Джала и Аламедина.</p>
      </div>
      <div class="tile tile--blue">
        <span class="tile__num num">{{ stats?.openNow ?? '—' }}</span>
        <b>Открыто прямо сейчас</b>
        <p>Статус пересчитывается по расписанию каждой аптеки.</p>
      </div>
      <div class="tile tile--amber">
        <span class="tile__num num">{{ stats?.night ?? '—' }}</span>
        <b>Дежурят круглосуточно</b>
        <p>Ночью аптеку видно на карте отдельным синим маркером.</p>
      </div>
      <div class="tile tile--pink">
        <span class="tile__num num">{{ stats?.delivery ?? '—' }}</span>
        <b>С доставкой по городу</b>
        <p>Привезут за 1–2 часа, если не хочется выходить.</p>
      </div>
    </section>

    <!-- Три графика -->
    <section class="grid-auto grid-auto--wide pg-stagger" aria-label="Аналитика по городу">
      <div class="card panel">
        <div class="panel__head">
          <span class="panel__eyebrow">Разброс цен</span>
          <b class="panel__title">
            Одно лекарство — до {{ stats?.maxSpread ?? '—' }} разница между аптеками
          </b>
        </div>
        <div class="spreads">
          <NuxtLink
            v-for="s in stats?.spreads ?? []"
            :key="s.slug"
            :to="`/medicine/${s.slug}`"
            class="spread"
          >
            <div class="spread__row">
              <span class="spread__name">{{ s.name }}</span>
              <span class="muted num">{{ s.min }}–{{ s.max }} сом</span>
            </div>
            <div class="spread__track">
              <div
                class="spread__fill"
                :style="{
                  left: `${(s.min / spreadMax) * 100}%`,
                  width: `${((s.max - s.min) / spreadMax) * 100}%`,
                }"
              />
            </div>
          </NuxtLink>
        </div>
        <span class="panel__foot">Минимальная и максимальная цена по аптекам-партнёрам</span>
      </div>

      <div class="card panel panel--night">
        <div class="panel__head">
          <span class="panel__eyebrow panel__eyebrow--dim">Режим работы</span>
          <b class="panel__title">
            {{ stats?.night ?? 0 }} из {{ stats?.pharmacies ?? 0 }} аптек работают ночью
          </b>
        </div>
        <div class="cells">
          <span v-for="(color, i) in modeCells" :key="i" :style="{ background: color }" />
        </div>
        <div class="legend">
          <div v-for="m in modes" :key="m.label" class="legend__row">
            <span class="legend__swatch" :style="{ background: m.color }" />
            <span class="legend__label">{{ m.label }}</span>
            <b class="num">{{ m.pct }}%</b>
          </div>
        </div>
      </div>

      <div class="card panel panel--soft">
        <div class="panel__head">
          <span class="panel__eyebrow panel__eyebrow--blue">Время</span>
          <b class="panel__title">40 секунд вместо обзвона аптек</b>
        </div>
        <div class="bars">
          <div v-for="t in timeBars" :key="t.label" class="bar">
            <div class="bar__row">
              <span class="bar__label">{{ t.label }}</span>
              <b>{{ t.value }}</b>
            </div>
            <div class="bar__track">
              <div class="bar__fill" :style="{ width: `${t.width}%`, background: t.color }" />
            </div>
          </div>
        </div>
        <span class="panel__foot panel__foot--blue">
          Среднее время до найденного лекарства, опрос 1 200 пользователей
        </span>
      </div>
    </section>

    <!-- Живая выдача -->
    <section id="pharmacies" class="section section--white split">
      <div class="split__text">
        <span class="eyebrow eyebrow--blue">Результат поиска</span>
        <h2 class="h-section">Одно лекарство — все аптеки, где оно есть сейчас</h2>
        <p class="lead">
          Для каждого препарата показываем цену, наличие и расстояние от вас.
          Сортируйте по цене или по близости, бронируйте — и забирайте без очереди.
        </p>
        <div class="split__controls">
          <button
            class="chip chip--onbg"
            type="button"
            :aria-pressed="sort === 'price'"
            @click="sort = 'price'"
          >
            Сначала дешевле
          </button>
          <button
            class="chip chip--onbg"
            type="button"
            :aria-pressed="sort === 'distance'"
            @click="sort = 'distance'"
          >
            Сначала ближе
          </button>
        </div>
        <button
          v-if="locationStatus !== 'granted'"
          class="btn btn--sm split__geo"
          type="button"
          @click="requestLocation"
        >
          📍 Считать расстояния от меня
        </button>
        <span class="split__geo-note muted">{{ locationLabel }}</span>
      </div>

      <div class="preview">
        <div class="preview__head">
          <NuxtLink to="/medicine/paracetamol-500" class="preview__title">
            {{ demo?.medicine?.name }}, {{ demo?.form?.label?.toLowerCase() }}
          </NuxtLink>
          <span class="muted">
            {{ demo?.stats?.count ?? 0 }}
            {{ plural(demo?.stats?.count ?? 0, 'аптека', 'аптеки', 'аптек') }} ·
            от {{ formatPrice(demo?.stats?.min ?? 0) }} сом
          </span>
        </div>

        <NuxtLink
          v-for="(offer, i) in demoOffers"
          :key="offer.pharmacyId"
          :to="`/medicine/paracetamol-500`"
          class="prow pg-fade-up"
          :style="{ animationDelay: `${i * 0.06}s` }"
        >
          <div class="prow__main">
            <div class="prow__title">
              <b>{{ offer.pharmacy.chain }}</b>
              <span class="tag" :class="`tag--${offer.stock}`">{{ offer.stockLabel }}</span>
              <span v-if="offer.pharmacy.is24h" class="tag tag--night">24/7</span>
            </div>
            <span class="prow__addr">
              {{ offer.pharmacy.address }} · {{ formatDistance(offer.pharmacy.distance) }}
            </span>
          </div>
          <b class="prow__price num">{{ formatPrice(offer.price) }} сом</b>
        </NuxtLink>

        <NuxtLink to="/medicine/paracetamol-500" class="preview__all">
          Все предложения и аналоги →
        </NuxtLink>
      </div>
    </section>

    <!-- Как это работает -->
    <section id="how" class="section section--night how">
      <div class="how__head">
        <h2 class="h-section">Как это работает</h2>
        <p class="how__lead">
          Три шага от симптома до лекарства в руках. Без звонков, без обхода аптек.
          <span class="pg-bounce-down how__arrow" aria-hidden="true">↓</span>
        </p>
      </div>
      <div class="how__grid pg-stagger">
        <div class="step">
          <span class="step__num step__num--green">01</span>
          <b>Введите название</b>
          <p>Работает с опечатками, латиницей и по действующему веществу — подскажем аналоги.</p>
        </div>
        <div class="step">
          <span class="step__num step__num--blue">02</span>
          <b>Сравните цены и наличие</b>
          <p>Все аптеки города в одном списке. Отдельно — дежурные, работающие ночью.</p>
        </div>
        <div class="step step--accent">
          <span class="step__num step__num--soft">03</span>
          <b>Забронируйте и заберите</b>
          <p>Аптека отложит товар на 3 часа. Или закажите доставку по Бишкеку.</p>
        </div>
      </div>
    </section>

    <!-- Карта -->
    <section id="map" class="section section--white split split--map">
      <div class="split__map">
        <ClientOnly>
          <PharmacyMap
            :pharmacies="mapPharmacies"
            :selected-id="selectedPharmacy"
            :user-coords="coords"
            :show-user="locationStatus === 'granted'"
            min-height="420px"
            @select="selectedPharmacy = $event"
          />
          <template #fallback>
            <div class="skeleton split__map-skeleton" />
          </template>
        </ClientOnly>
      </div>

      <div class="split__text">
        <span class="eyebrow eyebrow--green">Аптеки Бишкека</span>
        <h2 class="h-section">Все сети города уже на карте</h2>
        <p class="lead">
          Крупные сети и небольшие районные аптеки обновляют остатки автоматически.
          Зелёные маркеры — открыты сейчас, синие — дежурные круглосуточно,
          серые — уже закрылись.
        </p>
        <div class="chains">
          <span v-for="c in pharmacyData?.chains ?? []" :key="c" class="chip chip--onbg">
            {{ c }}
          </span>
        </div>
        <NuxtLink to="/map" class="split__link">Все аптеки на карте →</NuxtLink>
      </div>
    </section>

    <!-- Приложение -->
    <section id="app" class="section cta">
      <PharmaLogo class="cta__mark" variant="white" width="100%" height="100%" />
      <div class="cta__text">
        <h2 class="h-section">Лекарство найдётся быстрее, чем вы дойдёте до аптеки</h2>
        <p>Приложение PharmaGO для iOS и Android. Бесплатно.</p>
      </div>
      <div class="cta__stores">
        <a href="#" class="cta__store">App Store</a>
        <a href="#" class="cta__store">Google Play</a>
      </div>
    </section>

    <!-- FAQ -->
    <section id="faq" class="faq">
      <h2 class="h-section">Частые вопросы</h2>
      <AccordionList :items="faqs" class="faq__list" />
    </section>
  </div>
</template>

<style scoped>
/* --- Герой --- */
.hero {
  position: relative;
  overflow: hidden;
  background: var(--night);
  border-radius: var(--r-section);
  padding: clamp(40px, 5vw, 64px) clamp(24px, 4vw, 48px) clamp(36px, 4vw, 56px);
  display: flex;
  flex-direction: column;
  gap: 36px;
}

.hero__mark {
  position: absolute;
  right: -60px;
  top: -40px;
  width: min(62%, 720px);
  opacity: 0.14;
  pointer-events: none;
}

.hero__top {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.hero__badge {
  display: inline-flex;
  align-self: flex-start;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: var(--r-pill);
  background: rgb(255 255 255 / 8%);
  color: var(--blue-soft);
  font-size: 13px;
  font-weight: 500;
}

.hero__dot {
  width: 8px;
  height: 8px;
  background: var(--green);
}

.hero__title {
  margin: 0;
  font-size: clamp(56px, 11vw, 168px);
  line-height: 0.92;
  letter-spacing: -0.045em;
  font-weight: 800;
  color: #fff;
}

.hero__go {
  color: var(--blue);
}

.hero__lead {
  max-width: 560px;
  font-size: clamp(17px, 1.6vw, 21px);
  line-height: 1.45;
  color: var(--on-night-bright);
}

.hero__search {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.hero__popular {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
}

.hero__popular-label {
  font-size: 13px;
  color: var(--on-night-dim);
}

/* --- Плитки --- */
.tile {
  border-radius: var(--r-card);
  padding: 26px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 190px;
}

.tile__num {
  font-size: 34px;
  font-weight: 800;
}

.tile b {
  font-size: 17px;
}

.tile p {
  font-size: 14px;
  line-height: 1.45;
}

.tile--green {
  background: var(--green-soft);
}

.tile--green .tile__num {
  color: var(--green-deep);
}

.tile--green p {
  color: #3e5a4d;
}

.tile--blue {
  background: var(--blue-soft);
}

.tile--blue .tile__num {
  color: var(--blue-deep);
}

.tile--blue p {
  color: #3b5473;
}

.tile--amber {
  background: var(--amber-soft);
}

.tile--amber .tile__num {
  color: var(--amber-deep);
}

.tile--amber p {
  color: #6b5630;
}

.tile--pink {
  background: var(--pink-soft);
}

.tile--pink .tile__num {
  color: var(--pink-deep);
}

.tile--pink p {
  color: #6e4050;
}

/* --- Панели с графиками --- */
.grid-auto--wide {
  grid-template-columns: repeat(auto-fit, minmax(min(300px, 100%), 1fr));
}

.panel {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 28px;
  border-radius: var(--r-card-lg);
}

.panel--night {
  background: var(--night);
  color: #fff;
}

.panel--soft {
  background: var(--blue-soft);
}

.panel__head {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.panel__eyebrow {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-muted);
}

.panel__eyebrow--dim {
  color: var(--on-night-dim);
}

.panel__eyebrow--blue {
  color: var(--blue-deep);
}

.panel__title {
  font-size: 20px;
  letter-spacing: -0.02em;
  line-height: 1.2;
}

.panel__foot {
  font-size: 12px;
  color: var(--on-night-dim);
}

.panel__foot--blue {
  color: #3b5473;
}

.spreads {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.spread {
  display: flex;
  flex-direction: column;
  gap: 5px;
  color: var(--ink);
}

.spread:hover {
  color: var(--ink);
}

.spread:hover .spread__name {
  color: var(--blue);
}

.spread__row {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
}

.spread__name {
  font-weight: 600;
  transition: color 0.15s var(--ease);
}

.spread__track {
  position: relative;
  height: 10px;
  background: var(--bg);
  border-radius: 3px;
}

.spread__fill {
  position: absolute;
  top: 0;
  bottom: 0;
  border-radius: 3px;
  background: linear-gradient(90deg, var(--green), var(--blue));
}

.cells {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 5px;
}

.cells span {
  aspect-ratio: 1;
}

.legend {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 13px;
}

.legend__row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.legend__swatch {
  width: 10px;
  height: 10px;
  flex: none;
}

.legend__label {
  flex: 1;
  color: var(--on-night-bright);
}

.bars {
  display: flex;
  flex-direction: column;
  gap: 14px;
  flex: 1;
  justify-content: center;
}

.bar {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.bar__row {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
}

.bar__label {
  font-weight: 600;
}

.bar__track {
  height: 22px;
  background: rgb(255 255 255 / 60%);
  border-radius: 6px;
  overflow: hidden;
}

.bar__fill {
  height: 100%;
  min-width: 6px;
  border-radius: 6px;
}

/* --- Двухколоночные секции --- */
.split {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(300px, 100%), 1fr));
  gap: 40px;
  align-items: center;
}

.split__text {
  display: flex;
  flex-direction: column;
  gap: 18px;
  align-items: flex-start;
}

.eyebrow--blue {
  color: var(--blue);
  border-color: var(--blue-soft);
}

.eyebrow--green {
  color: var(--green);
  border-color: var(--green-soft);
}

.split__controls {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.split__geo-note {
  font-size: 13px;
}

.split__link {
  font-weight: 600;
  font-size: 15px;
}

.split--map .split__map {
  min-height: 420px;
  border-radius: var(--r-card);
  overflow: hidden;
}

.split__map-skeleton {
  width: 100%;
  height: 420px;
}

.chains {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

/* --- Превью выдачи --- */
.preview {
  background: var(--bg);
  border-radius: var(--r-card);
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.preview__head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: 8px 10px 12px;
  gap: 12px;
  flex-wrap: wrap;
  font-size: 13px;
}

.preview__title {
  font-size: 17px;
  font-weight: 700;
  color: var(--ink);
}

.preview__title:hover {
  color: var(--blue);
}

.prow {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 6px 16px;
  align-items: center;
  background: var(--surface);
  border-radius: var(--r-sm);
  padding: 14px 16px;
  color: var(--ink);
  transition: box-shadow 0.15s var(--ease);
}

.prow:hover {
  box-shadow: 0 4px 16px rgb(0 0 0 / 6%);
  color: var(--ink);
}

.prow__main {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.prow__title {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  font-size: 15px;
}

.prow__addr {
  font-size: 13px;
  color: var(--ink-muted);
}

.prow__price {
  font-size: 17px;
  white-space: nowrap;
}

.preview__all {
  padding: 12px 10px 4px;
  font-size: 14px;
  font-weight: 600;
}

/* --- Как это работает --- */
.how {
  display: flex;
  flex-direction: column;
  gap: 40px;
}

.how__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 24px;
  flex-wrap: wrap;
}

.how__head h2 {
  color: #fff;
  max-width: 560px;
}

.how__lead {
  max-width: 420px;
  font-size: 15px;
  line-height: 1.5;
  color: var(--on-night-dim);
}

.how__arrow {
  display: inline-block;
  margin-left: 6px;
  color: var(--green);
  font-weight: 700;
}

.how__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(230px, 100%), 1fr));
  gap: var(--gap);
}

.step {
  border: 1px solid rgb(255 255 255 / 10%);
  border-radius: var(--r-card);
  padding: 28px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.step--accent {
  background: var(--blue);
  border-color: transparent;
}

.step__num {
  font-size: 13px;
  font-weight: 700;
}

.step__num--green {
  color: var(--green);
}

.step__num--blue {
  color: var(--blue);
}

.step__num--soft {
  color: var(--blue-soft);
}

.step b {
  font-size: 20px;
  color: #fff;
  letter-spacing: -0.01em;
}

.step p {
  font-size: 14px;
  line-height: 1.5;
  color: var(--on-night);
}

.step--accent p {
  color: #e4efff;
}

/* --- CTA --- */
.cta {
  position: relative;
  overflow: hidden;
  background: var(--blue);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 32px;
  flex-wrap: wrap;
}

.cta__mark {
  position: absolute;
  right: -40px;
  bottom: -60px;
  width: min(50%, 520px);
  opacity: 0.18;
  pointer-events: none;
}

.cta__text {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 14px;
  max-width: 560px;
}

.cta__text h2 {
  color: #fff;
}

.cta__text p {
  font-size: 16px;
  line-height: 1.5;
  color: #e4efff;
}

.cta__stores {
  position: relative;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.cta__store {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 13px 20px;
  border-radius: var(--r-sm);
  background: var(--night);
  color: #fff;
  font-weight: 600;
  font-size: 15px;
}

.cta__store:hover {
  background: #000;
  color: #fff;
}

/* --- FAQ --- */
.faq {
  padding: 40px 0 16px;
  display: flex;
  flex-direction: column;
  gap: 28px;
  align-items: center;
}

.faq h2 {
  text-align: center;
}

.faq__list {
  max-width: 820px;
}
</style>
