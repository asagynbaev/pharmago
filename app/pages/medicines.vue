<script setup lang="ts">
import { formatPrice, plural } from '#shared/utils/catalog'

const route = useRoute()
const router = useRouter()

const search = ref(String(route.query.q ?? ''))
const category = computed(() => String(route.query.category ?? ''))
const substance = computed(() => String(route.query.substance ?? ''))
const rx = computed(() => String(route.query.rx ?? ''))

const debounced = refDebounced(search, 250)

function patch(next: Record<string, string | undefined>) {
  router.replace({
    query: Object.fromEntries(
      Object.entries({ ...route.query, ...next }).filter(
        ([, v]) => v !== undefined && v !== '',
      ),
    ),
  })
}

// Строка поиска тоже живёт в адресе — ссылкой на подборку можно поделиться.
watch(debounced, (v) => { patch({ q: v || undefined }) })

const { data, pending } = await useFetch('/api/medicines', {
  query: computed(() => ({
    q: debounced.value,
    category: category.value,
    substance: substance.value,
    rx: rx.value,
  })),
})

const items = computed(() => data.value?.items ?? [])

const hasFilters = computed(
  () => Boolean(category.value || substance.value || rx.value || search.value),
)

function reset() {
  search.value = ''
  router.replace({ query: {} })
}

const rxFilters = [
  { value: '', label: 'Все' },
  { value: 'false', label: 'Без рецепта' },
  { value: 'true', label: 'По рецепту' },
]

useSeoMeta({
  title: 'Каталог препаратов',
  description:
    'Справочник лекарств PharmaGO: действующее вещество, форма выпуска, аналоги и цены в аптеках Бишкека.',
})
</script>

<template>
  <div class="page-body">
    <section class="intro">
      <h1 class="h-hero">Каталог препаратов</h1>
      <p class="lead">
        {{ data?.total ?? 0 }}
        {{ plural(data?.total ?? 0, 'препарат', 'препарата', 'препаратов') }}
        в справочнике. У каждого — цены по аптекам города, аналоги
        по действующему веществу и краткая инструкция.
      </p>
    </section>

    <section class="controls">
      <div class="controls__search">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" />
        </svg>
        <input
          v-model="search"
          type="search"
          placeholder="Название или действующее вещество"
          aria-label="Поиск по каталогу"
        >
      </div>

      <div class="controls__row">
        <button
          v-for="f in rxFilters"
          :key="f.value"
          class="chip chip--onbg chip--sm"
          type="button"
          :aria-pressed="rx === f.value"
          @click="patch({ rx: f.value || undefined })"
        >
          {{ f.label }}
        </button>

        <button
          v-if="hasFilters"
          class="btn btn--sm controls__reset"
          type="button"
          @click="reset"
        >
          Сбросить
        </button>
      </div>

      <div class="controls__row">
        <button
          class="chip chip--onbg chip--sm"
          type="button"
          :aria-pressed="!category"
          @click="patch({ category: undefined })"
        >
          Все категории
        </button>
        <button
          v-for="c in data?.categories ?? []"
          :key="c"
          class="chip chip--onbg chip--sm"
          type="button"
          :aria-pressed="category === c"
          @click="patch({ category: c })"
        >
          {{ c }}
        </button>
      </div>
    </section>

    <template v-if="pending && !items.length">
      <div class="grid">
        <PgSkeletonCard v-for="i in 6" :key="i" />
      </div>
    </template>

    <div v-else-if="!items.length" class="empty">
      <PgEmpty :size="150" />
      <b>Ничего не нашлось</b>
      <p>Попробуйте другое название или снимите фильтры.</p>
      <button class="btn btn--blue" type="button" @click="reset">Сбросить</button>
    </div>

    <div v-else class="grid pg-stagger" :key="items.length">
      <NuxtLink
        v-for="m in items"
        :key="m.slug"
        :to="`/medicine/${m.slug}`"
        class="mcard"
      >
        <div class="mcard__top">
          <b class="mcard__name">{{ m.name }}</b>
          <span v-if="m.prescription" class="tag tag--rx">Rx</span>
        </div>

        <span class="mcard__sub">{{ m.substance }}</span>
        <span class="mcard__cat">{{ m.category }}</span>

        <div class="mcard__foot">
          <b v-if="m.minPrice" class="mcard__price num">
            от {{ formatPrice(m.minPrice) }} сом
          </b>
          <b v-else class="mcard__price mcard__price--out">нет в аптеках</b>
          <span class="muted">
            {{ m.pharmacies }}
            {{ plural(m.pharmacies, 'аптека', 'аптеки', 'аптек') }}
          </span>
        </div>
      </NuxtLink>
    </div>
  </div>
</template>

<style scoped>
.intro {
  padding: 28px 8px 8px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.intro .lead {
  max-width: 640px;
}

.controls {
  background: var(--surface);
  border-radius: var(--r-card);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.controls__search {
  display: flex;
  gap: 8px;
  background: var(--bg);
  border-radius: var(--r-pill);
  padding: 6px 6px 6px 18px;
  align-items: center;
  color: var(--ink-muted);
}

.controls__search input {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: 0;
  font-size: 15px;
  padding: 9px 6px;
  background: transparent;
  color: var(--ink);
}

.controls__search input::-webkit-search-cancel-button {
  appearance: none;
}

.controls__row {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  align-items: center;
}

.controls__reset {
  margin-left: auto;
}

.chip--sm {
  font-size: 13px;
  font-weight: 500;
  padding: 7px 12px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(260px, 100%), 1fr));
  gap: var(--gap);
}

.mcard {
  background: var(--surface);
  border-radius: var(--r-card);
  padding: 22px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: var(--ink);
  border: 2px solid transparent;
  transition: border-color 0.15s var(--ease), box-shadow 0.15s var(--ease);
}

.mcard:hover {
  color: var(--ink);
  border-color: var(--blue-soft);
  box-shadow: var(--shadow-md);
}

.mcard__top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.mcard__name {
  font-size: 17px;
  line-height: 1.25;
}

.mcard__sub {
  font-size: 14px;
  color: var(--ink-muted);
}

.mcard__cat {
  font-size: 12px;
  color: var(--on-night-dim);
}

.mcard__foot {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 10px;
  margin-top: auto;
  padding-top: 12px;
  font-size: 13px;
}

.mcard__price {
  font-size: 17px;
  color: var(--blue);
}

.mcard__price--out {
  font-size: 14px;
  color: var(--ink-muted);
  font-weight: 500;
}

.empty {
  background: var(--surface);
  border-radius: var(--r-item);
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
