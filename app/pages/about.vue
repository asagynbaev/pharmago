<script setup lang="ts">
const { data: stats } = await useFetch('/api/stats')
const { data: pharmacyData } = await useFetch('/api/pharmacies')

const tiles = computed(() => [
  { value: String(stats.value?.pharmacies ?? '—'), label: 'Аптек-партнёров', bg: 'var(--green-soft)', fg: 'var(--green-deep)' },
  { value: String(stats.value?.medicines ?? '—'), label: 'Препаратов в справочнике', bg: 'var(--blue-soft)', fg: 'var(--blue-deep)' },
  { value: '14 тыс.', label: 'Поисков в день', bg: 'var(--amber-soft)', fg: 'var(--amber-deep)' },
  { value: '19', label: 'Человек в команде', bg: 'var(--pink-soft)', fg: 'var(--pink-deep)' },
])

const palette = [
  'var(--green)',
  'var(--blue)',
  'var(--blue-light)',
  'var(--amber)',
  'var(--pink)',
  'var(--blue-soft)',
]

/** Сколько аптек в каждом районе — считаем из настоящего справочника. */
const districts = computed(() => {
  const counts = new Map<string, number>()
  for (const p of pharmacyData.value?.items ?? []) {
    counts.set(p.district, (counts.get(p.district) ?? 0) + 1)
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, count], i) => ({ name, count, color: palette[i % palette.length]! }))
})

/** Плитка покрытия: одна клетка — одна аптека, цвет по району. */
const cells = computed(() => {
  const out: string[] = []
  for (const d of districts.value) {
    for (let i = 0; i < d.count; i++) out.push(d.color)
  }
  while (out.length < 36) out.push('var(--bg)')
  return out
})

const timeline = [
  {
    date: 'Март 2024',
    title: 'Таблица на 12 аптек',
    text: 'Цены на 40 самых частых лекарств в одном районе, обновляли руками по вечерам.',
    color: 'var(--green)',
  },
  {
    date: 'Октябрь 2024',
    title: 'Первая интеграция',
    text: 'Сеть «Неман» начала передавать остатки автоматически из 1С.',
    color: 'var(--blue)',
  },
  {
    date: 'Июнь 2025',
    title: 'Приложение и бронь',
    text: 'iOS и Android. Бронь на 3 часа появилась после сотен просьб «отложите, я еду».',
    color: 'var(--amber)',
  },
  {
    date: 'Сентябрь 2026',
    title: 'Карта, аналоги и доставка',
    text: 'Дежурные аптеки на карте, аналоги по действующему веществу, доставка от партнёров.',
    color: 'var(--pink)',
  },
]

const press = [
  { meta: 'Логотип · PNG, SVG', title: 'Фирменный знак и правила использования' },
  { meta: 'PDF · 2 стр.', title: 'Пресс-кит: цифры и факты о сервисе' },
  { meta: 'JPG · 6 фото', title: 'Фотографии команды и интерфейса' },
]

useSeoMeta({
  title: 'О компании',
  description:
    'PharmaGO — сервис поиска лекарств по аптекам Бишкека. История проекта, покрытие по районам и контакты для прессы.',
})
</script>

<template>
  <div class="page-body">
    <section class="intro">
      <span class="eyebrow eyebrow--blue">О PharmaGO</span>
      <h1 class="h-hero">
        Мы сделали так, чтобы лекарство в Бишкеке искали один раз,
        а не по десяти аптекам
      </h1>
      <p class="lead">
        PharmaGO начинался в 2024 году с таблицы, в которую трое друзей вручную
        переписывали цены из аптек своего района. Сегодня остатки передают
        автоматически {{ stats?.pharmacies ?? 0 }} аптек города.
      </p>
    </section>

    <section class="grid-auto pg-stagger" aria-label="Компания в цифрах">
      <div
        v-for="t in tiles"
        :key="t.label"
        class="tile"
        :style="{ background: t.bg }"
      >
        <b class="tile__num num" :style="{ color: t.fg }">{{ t.value }}</b>
        <span>{{ t.label }}</span>
      </div>
    </section>

    <section class="section section--white coverage">
      <div class="coverage__text">
        <h2 class="h-section">Аптеки-партнёры по районам</h2>
        <p class="lead">
          Один квадрат — одна подключённая аптека. Цель на 2027 год: покрыть каждый
          жилой массив, чтобы ближайшая аптека была не дальше километра.
        </p>
        <div class="coverage__legend">
          <div v-for="d in districts" :key="d.name" class="coverage__row">
            <span class="coverage__swatch" :style="{ background: d.color }" />
            <span class="coverage__name">{{ d.name }}</span>
            <b class="num">{{ d.count }}</b>
          </div>
        </div>
      </div>
      <div class="coverage__cells">
        <span v-for="(color, i) in cells" :key="i" :style="{ background: color }" />
      </div>
    </section>

    <section class="section section--night path">
      <h2 class="h-section">Путь</h2>
      <div class="path__grid pg-stagger">
        <div v-for="t in timeline" :key="t.date" class="milestone">
          <div class="milestone__rule">
            <span class="milestone__dot" :style="{ background: t.color }" />
            <span class="milestone__line" />
          </div>
          <b class="milestone__date">{{ t.date }}</b>
          <b class="milestone__title">{{ t.title }}</b>
          <span class="milestone__text">{{ t.text }}</span>
        </div>
      </div>
    </section>

    <section id="press" class="section section--white press">
      <div class="press__head">
        <h2 class="h-section">Пресса</h2>
        <NuxtLink to="/contacts" class="press__link">Запрос комментария →</NuxtLink>
      </div>
      <div class="press__grid pg-stagger">
        <div v-for="item in press" :key="item.title" class="press__card">
          <span class="muted">{{ item.meta }}</span>
          <b>{{ item.title }}</b>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.intro {
  padding: 28px 8px 8px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  max-width: 900px;
  align-items: flex-start;
}

.eyebrow--blue {
  color: var(--blue);
  border-color: var(--blue-soft);
}

.intro .lead {
  max-width: 680px;
}

.tile {
  border-radius: var(--r-card);
  padding: 26px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 170px;
  font-size: 15px;
  font-weight: 600;
}

.tile__num {
  font-size: 40px;
  font-weight: 800;
}

.coverage {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(300px, 100%), 1fr));
  gap: 40px;
  align-items: center;
}

.coverage__text {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.coverage__legend {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 16px;
}

.coverage__row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.coverage__swatch {
  width: 12px;
  height: 12px;
  flex: none;
}

.coverage__name {
  flex: 1;
}

.coverage__cells {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 6px;
}

.coverage__cells span {
  aspect-ratio: 1;
  border-radius: 2px;
}

.path {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.path h2 {
  color: #fff;
}

.path__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(200px, 100%), 1fr));
  gap: 24px;
}

.milestone {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.milestone__rule {
  display: flex;
  align-items: center;
  gap: 10px;
}

.milestone__dot {
  width: 14px;
  height: 14px;
  flex: none;
}

.milestone__line {
  flex: 1;
  height: 2px;
  background: rgb(255 255 255 / 12%);
}

.milestone__date {
  font-size: 15px;
  color: var(--on-night-dim);
}

.milestone__title {
  font-size: 17px;
  color: #fff;
}

.milestone__text {
  font-size: 16px;
  line-height: 1.5;
  color: var(--on-night);
}

.press {
  display: flex;
  flex-direction: column;
  gap: 20px;
  scroll-margin-top: 12px;
}

.press__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 16px;
  flex-wrap: wrap;
}

.press__link {
  font-weight: 600;
  font-size: 15px;
}

.press__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(240px, 100%), 1fr));
  gap: 10px;
}

.press__card {
  padding: 20px;
  border-radius: var(--r-sm);
  background: var(--bg);
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 14px;
}

.press__card b {
  font-size: 15px;
}
</style>
