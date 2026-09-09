<script setup lang="ts">
import type { OfferView } from '#shared/types'
import { formatPrice, plural } from '#shared/utils/catalog'
import { popularQueries } from '#shared/data/medicines'

const route = useRoute()
const router = useRouter()
const { coords, label: locationLabel, status: locationStatus, locate } = useUserLocation()

/** Все фильтры живут в адресной строке — ссылкой на выдачу можно поделиться. */
const query = computed(() => String(route.query.q ?? ''))
const slug = computed(() => String(route.query.slug ?? ''))
const formId = computed(() => String(route.query.form ?? ''))
const district = computed(() => String(route.query.district ?? 'Все'))
const sort = computed(() => (route.query.sort === 'distance' ? 'distance' : 'price'))
const onlyStock = computed(() => route.query.stock !== 'false')
const onlyNight = computed(() => route.query.night === 'true')
const onlyDelivery = computed(() => route.query.delivery === 'true')

const input = ref(query.value)
watch(query, v => { input.value = v })

function patch(next: Record<string, string | undefined>) {
  router.push({
    path: '/search',
    query: Object.fromEntries(
      Object.entries({ ...route.query, ...next }).filter(
        ([, v]) => v !== undefined && v !== '',
      ),
    ),
  })
}

const { data, pending } = await useFetch('/api/search', {
  query: computed(() => ({
    q: query.value,
    slug: slug.value,
    form: formId.value,
    district: district.value,
    sort: sort.value,
    stock: String(onlyStock.value),
    night: String(onlyNight.value),
    delivery: String(onlyDelivery.value),
    lat: coords.value.lat,
    lng: coords.value.lng,
  })),
})

const medicine = computed(() => data.value?.medicine ?? null)
const offers = computed(() => data.value?.offers ?? [])
const stats = computed(() => data.value?.stats ?? null)
const bestPrice = computed(() => (offers.value.length ? offers.value[0]!.price : null))

/** Гистограмма цен по городу — шесть корзин от минимума до максимума. */
const histogram = computed(() => {
  const s = stats.value
  if (!s || !offers.value.length) return []
  const bins = 6
  const span = Math.max(s.max - s.min, 1)
  const counts = Array.from({ length: bins }, () => 0)

  for (const offer of offers.value) {
    const index = Math.min(bins - 1, Math.floor(((offer.price - s.min) / span) * bins))
    counts[index]! += 1
  }

  const peak = Math.max(...counts, 1)
  return counts.map((count, i) => ({
    height: `${Math.round((count / peak) * 90) + 8}%`,
    color: i < 2 ? 'var(--green)' : i > 3 ? 'var(--blue)' : '#B4C3D1',
    count,
  }))
})

const toggles = computed(() => [
  {
    key: 'stock',
    label: 'Только в наличии',
    on: onlyStock.value,
    flip: () => patch({ stock: onlyStock.value ? 'false' : undefined }),
  },
  {
    key: 'night',
    label: 'Круглосуточные',
    on: onlyNight.value,
    flip: () => patch({ night: onlyNight.value ? undefined : 'true' }),
  },
  {
    key: 'delivery',
    label: 'С доставкой',
    on: onlyDelivery.value,
    flip: () => patch({ delivery: onlyDelivery.value ? undefined : 'true' }),
  },
])

/** Сколько аптек каждой сети попало в выдачу. */
const chainCounts = computed(() => {
  const counts = new Map<string, number>()
  for (const offer of offers.value) {
    counts.set(offer.pharmacy.chain, (counts.get(offer.pharmacy.chain) ?? 0) + 1)
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])
})

const reserving = ref<OfferView | null>(null)
const ordering = ref<OfferView | null>(null)

/**
 * Меняется вместе с запросом и фильтрами — Vue пересоздаёт список,
 * и каскад появления проигрывается заново, а не только при первом рендере.
 */
const staggerKey = computed(() =>
  [slug.value, query.value, formId.value, district.value, sort.value,
   onlyStock.value, onlyNight.value, onlyDelivery.value].join('|'),
)

const toast = useToast()

/** Геолокация по кнопке: сообщаем результат, а не молчим. */
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

function submitSearch(value: string) {
  patch({ q: value, slug: undefined, form: undefined })
}

/** Снимает все ограничения, оставляя сам запрос и форму выпуска. */
function resetFilters() {
  patch({
    district: undefined,
    night: undefined,
    delivery: undefined,
    stock: undefined,
    sort: undefined,
  })
}

/** Есть ли что сбрасывать — по этому же признаку показываем кнопку. */
const hasFilters = computed(() =>
  district.value !== 'Все' || onlyNight.value || onlyDelivery.value || !onlyStock.value,
)

const title = computed(() =>
  medicine.value
    ? `${medicine.value.name} — ${data.value?.form?.label?.toLowerCase() ?? ''}`
    : query.value
      ? `Ничего не нашлось по запросу «${query.value}»`
      : 'Поиск лекарств',
)

useSeoMeta({
  title: computed(() =>
    medicine.value ? `${medicine.value.name} — цены в аптеках Бишкека` : 'Поиск лекарств',
  ),
  description: computed(() =>
    medicine.value && stats.value
      ? `${medicine.value.name} в аптеках Бишкека: ${stats.value.count} предложений от ${stats.value.min} до ${stats.value.max} сом. Наличие, режим работы и бронирование.`
      : 'Поиск лекарств по аптекам Бишкека — цены, наличие и ближайшая аптека.',
  ),
})
</script>

<template>
  <div class="page-body">
    <section class="bar">
      <SearchBar
        v-model="input"
        size="compact"
        :auto-navigate="false"
        placeholder="Название лекарства"
        @submit="submitSearch"
      />

      <div v-if="medicine" class="bar__forms">
        <span class="bar__label">Форма выпуска:</span>
        <button
          v-for="f in medicine.forms"
          :key="f.id"
          class="chip chip--onnight"
          type="button"
          :aria-pressed="(formId || medicine.forms[0]?.id) === f.id"
          @click="patch({ form: f.id })"
        >
          {{ f.short }}
        </button>
      </div>
    </section>

    <div class="layout">
      <aside class="filters">
        <div class="filters__group">
          <h2 class="filters__title">Сортировка</h2>
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

        <div v-if="stats" class="filters__group">
          <h2 class="filters__title">Цены в городе</h2>
          <div class="hist" aria-hidden="true">
            <div
              v-for="(bin, i) in histogram"
              :key="i"
              class="hist__bar"
              :style="{ height: bin.height, background: bin.color }"
            />
          </div>
          <div class="hist__scale">
            <span class="num">{{ stats.min }} сом</span>
            <b class="num">медиана {{ stats.median }}</b>
            <span class="num">{{ stats.max }} сом</span>
          </div>
        </div>

        <div class="filters__group">
          <h2 class="filters__title">Наличие и режим</h2>
          <div v-for="t in toggles" :key="t.key" class="toggle">
            <span :id="`sw-${t.key}`">{{ t.label }}</span>
            <button
              class="pg-toggle pg-toggle--sm"
              type="button"
              role="switch"
              :aria-checked="t.on"
              :aria-labelledby="`sw-${t.key}`"
              @click="t.flip()"
            >
              <i />
            </button>
          </div>
        </div>

        <div class="filters__group">
          <h2 class="filters__title">Район</h2>
          <div class="filters__chips">
            <button
              v-for="d in ['Все', ...(data?.districts ?? [])]"
              :key="d"
              class="chip chip--onbg chip--sm"
              type="button"
              :aria-pressed="district === d"
              @click="patch({ district: d === 'Все' ? undefined : d })"
            >
              {{ d }}
            </button>
          </div>
        </div>

        <div v-if="chainCounts.length" class="filters__group">
          <h2 class="filters__title">Сеть аптек</h2>
          <div v-for="[chain, count] in chainCounts" :key="chain" class="filters__row">
            <span>{{ chain }}</span>
            <span class="muted num">{{ count }}</span>
          </div>
        </div>

        <button
          v-if="locationStatus !== 'granted'"
          class="btn btn--sm filters__geo"
          type="button"
          @click="requestLocation"
        >
          📍 Расстояния от меня
        </button>
        <span class="filters__note muted">{{ locationLabel }}</span>
      </aside>

      <main class="results">
        <div class="results__head">
          <h1 class="results__title">{{ title }}</h1>
          <div class="results__meta">
            <span v-if="stats" class="muted">
              {{ offers.length }}
              {{ plural(offers.length, 'аптека', 'аптеки', 'аптек') }} ·
              от {{ formatPrice(stats.min) }} сом
            </span>
            <button
              v-if="hasFilters"
              class="btn btn--sm"
              type="button"
              @click="resetFilters"
            >
              Сбросить фильтры
            </button>
          </div>
        </div>

        <p v-if="medicine?.prescription" class="notice notice--rx">
          Препарат отпускается по рецепту врача. Бронь можно оформить,
          но в аптеке потребуется предъявить рецепт.
        </p>

        <div v-if="data?.alternatives?.length" class="alts">
          <span class="muted">Возможно, вы искали:</span>
          <NuxtLink
            v-for="alt in data.alternatives"
            :key="alt.slug"
            :to="`/medicine/${alt.slug}`"
            class="chip chip--onbg chip--sm"
          >
            {{ alt.name }}
          </NuxtLink>
        </div>

        <template v-if="pending && !offers.length">
          <PgSkeletonCard v-for="i in 4" :key="i" />
        </template>

        <div v-else-if="!medicine" class="empty">
          <PgEmpty :size="150" />
          <b>Ничего не нашлось</b>
          <p v-if="query">
            По запросу «{{ query }}» препаратов нет. Проверьте написание
            или поищите по действующему веществу.
          </p>
          <p v-else>Введите название лекарства или выберите из частых запросов.</p>

          <div v-if="data?.suggestions?.length" class="empty__list">
            <NuxtLink
              v-for="s in data.suggestions"
              :key="s.slug"
              :to="`/medicine/${s.slug}`"
              class="chip chip--onbg"
            >
              {{ s.name }}
            </NuxtLink>
          </div>

          <div v-else-if="!query" class="empty__list">
            <button
              v-for="name in popularQueries"
              :key="name"
              class="chip chip--onbg"
              type="button"
              @click="submitSearch(name)"
            >
              {{ name }}
            </button>
          </div>

          <NuxtLink to="/medicines" class="btn btn--blue empty__cta">
            Открыть каталог препаратов
          </NuxtLink>
        </div>

        <div v-else-if="!offers.length" class="empty">
          <PgEmpty :size="150" />
          <b>Под фильтры ничего не подошло</b>
          <p>Снимите часть ограничений — например, «только в наличии» или район.</p>
          <button class="btn btn--blue" type="button" @click="resetFilters">
            Сбросить фильтры
          </button>
        </div>

        <div v-else :key="staggerKey" class="pg-stagger results__list">
          <OfferCard
            v-for="offer in offers"
            :key="offer.pharmacyId"
            :offer="offer"
            :best-price="bestPrice"
            :highlighted="offer.price === bestPrice"
            @reserve="reserving = $event"
            @order="ordering = $event"
          />
        </div>
      </main>
    </div>

    <ReserveDialog
      :offer="reserving"
      :medicine-slug="medicine?.slug ?? ''"
      :medicine-name="medicine?.name ?? ''"
      :form-id="data?.form?.id ?? ''"
      :form-label="data?.form?.label ?? ''"
      @close="reserving = null"
    />

    <OrderDialog
      :offer="ordering"
      :medicine-slug="medicine?.slug ?? ''"
      :medicine-name="medicine?.name ?? ''"
      :form-id="data?.form?.id ?? ''"
      :form-label="data?.form?.label ?? ''"
      @close="ordering = null"
    />
  </div>
</template>

<style scoped>
.bar {
  background: var(--night);
  border-radius: var(--r-card-lg);
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.bar :deep(.sb) {
  max-width: none;
}

.bar__forms {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
}

.bar__label {
  font-size: 13px;
  color: var(--on-night-dim);
}

.layout {
  display: grid;
  grid-template-columns: minmax(0, 280px) minmax(0, 1fr);
  gap: var(--gap);
  align-items: start;
}

.filters {
  background: var(--surface);
  border-radius: var(--r-card);
  padding: 22px;
  display: flex;
  flex-direction: column;
  gap: 22px;
  position: sticky;
  top: 12px;
}

.filters__group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.filters__title {
  font-size: 13px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ink-muted);
  font-weight: 700;
}

.filters__chips {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.chip--sm {
  font-size: 13px;
  font-weight: 500;
  padding: 7px 12px;
}

.filters__row {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  padding: 2px 0;
}

.filters__note {
  font-size: 12px;
  line-height: 1.4;
}

.filters__geo {
  align-self: flex-start;
}

.seg {
  display: flex;
  background: var(--bg);
  border-radius: var(--r-pill);
  padding: 4px;
  gap: 2px;
}

.seg__btn {
  flex: 1;
  border: 0;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  padding: 8px;
  border-radius: var(--r-pill);
  background: transparent;
  color: var(--ink);
}

.seg__btn--on {
  background: #fff;
  box-shadow: var(--shadow-sm);
}

.hist {
  display: flex;
  align-items: flex-end;
  gap: 3px;
  height: 48px;
}

.hist__bar {
  flex: 1;
  border-radius: 3px 3px 0 0;
  min-height: 4px;
}

.hist__scale {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--ink-muted);
  gap: 6px;
}

.hist__scale b {
  color: var(--ink);
}

.toggle {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
  font-size: 14px;
  color: var(--ink);
  gap: 12px;
}

.results {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
}

.results__head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
  flex-wrap: wrap;
  padding: 8px 6px;
}

.results__title {
  font-size: clamp(22px, 2.6vw, 32px);
}

.results__meta {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.results__list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.notice {
  border-radius: var(--r-item);
  padding: 14px 18px;
  font-size: 14px;
  line-height: 1.5;
}

.notice--rx {
  background: var(--pink-soft);
  color: var(--pink-deep);
}

.alts {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  padding: 0 6px 4px;
  font-size: 14px;
}

.empty {
  background: var(--surface);
  border-radius: var(--r-item);
  padding: 40px;
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

.empty__list {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: center;
  margin-top: 8px;
}

.empty__cta {
  margin-top: 6px;
}

@media (width <= 900px) {
  .layout {
    grid-template-columns: 1fr;
  }

  .filters {
    position: static;
  }
}
</style>
