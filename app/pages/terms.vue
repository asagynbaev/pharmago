<script setup lang="ts">
const sections = [
  { id: 'terms', num: '01', name: 'Пользовательское соглашение', accent: 'blue' },
  { id: 'privacy', num: '02', name: 'Политика конфиденциальности', accent: 'green' },
  { id: 'booking', num: '03', name: 'Правила бронирования', accent: 'amber' },
  { id: 'prices', num: '04', name: 'Об актуальности цен', accent: 'pink' },
]

const active = ref('terms')

/**
 * Подсветка активного пункта оглавления: следим за тем, какая секция
 * сейчас ближе к верху окна.
 */
onMounted(() => {
  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter(e => e.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
      if (visible) active.value = visible.target.id
    },
    { rootMargin: '-10% 0px -70% 0px', threshold: 0 },
  )

  for (const s of sections) {
    const el = document.getElementById(s.id)
    if (el) observer.observe(el)
  }

  onBeforeUnmount(() => observer.disconnect())
})

const privacy = [
  {
    title: 'Что собираем',
    text: 'Поисковые запросы, геопозицию (с вашего разрешения), имя и номер телефона при бронировании.',
  },
  {
    title: 'Зачем',
    text: 'Показать ближайшие аптеки, передать бронь в аптеку, улучшить подсказки поиска.',
  },
  {
    title: 'Кому передаём',
    text: 'Только аптеке, в которой вы бронируете: имя и телефон. Историю поиска не передаём никому.',
  },
  {
    title: 'Сколько храним',
    text: 'Историю поиска — 12 месяцев, данные брони — 30 дней. Удалить всё можно в один клик в приложении.',
  },
]

const booking = [
  { value: '3 ч', text: 'Аптека держит товар после подтверждения брони', color: 'var(--blue)' },
  { value: '0 сом', text: 'Бронь бесплатна, оплата — при получении в аптеке', color: 'var(--green)' },
  { value: 'Rx', text: 'Рецептурные препараты выдаются только при предъявлении рецепта', color: 'var(--pink-deep)' },
]

const freshness = [
  { label: 'Каждые 15 минут', pct: 62, color: 'var(--green)' },
  { label: 'Несколько раз в день', pct: 31, color: 'var(--blue)' },
  { label: 'Раз в день', pct: 7, color: 'var(--blue-soft)' },
]

useSeoMeta({
  title: 'Правила и документы',
  description:
    'Пользовательское соглашение, политика конфиденциальности, правила бронирования и порядок обновления цен в PharmaGO.',
})
</script>

<template>
  <div class="page-body">
    <section class="intro">
      <h1 class="h-hero">Правила и документы</h1>
      <p class="muted">Редакция от 1 сентября 2026 года</p>
    </section>

    <div class="layout">
      <nav class="toc" aria-label="Разделы документа">
        <a
          v-for="s in sections"
          :key="s.id"
          :href="`#${s.id}`"
          class="toc__link"
          :class="{ 'toc__link--active': active === s.id }"
          :aria-current="active === s.id ? 'true' : undefined"
        >
          {{ s.name }}
        </a>
      </nav>

      <main class="doc">
        <section id="terms" class="doc__section">
          <span class="eyebrow eyebrow--blue">01</span>
          <h2>Пользовательское соглашение</h2>
          <div class="prose">
            <p><b>1.1.</b> Сервис PharmaGO предоставляет информацию о наличии и стоимости лекарственных средств в аптеках города Бишкек на основании данных, переданных аптеками-партнёрами.</p>
            <p><b>1.2.</b> PharmaGO не является аптечной организацией, не продаёт лекарственные средства и не осуществляет их доставку. Продавцом всегда выступает аптека.</p>
            <p><b>1.3.</b> Используя сервис, вы подтверждаете, что вам исполнилось 16 лет, и соглашаетесь с настоящими правилами и политикой конфиденциальности.</p>
            <p><b>1.4.</b> Информация о лекарственных средствах носит справочный характер, не является рекламой и не заменяет консультацию врача или фармацевта.</p>
          </div>
        </section>

        <section id="privacy" class="doc__section">
          <span class="eyebrow eyebrow--green">02</span>
          <h2>Политика конфиденциальности</h2>
          <div class="cards">
            <div v-for="item in privacy" :key="item.title" class="cards__item">
              <b>{{ item.title }}</b>
              <span class="muted">{{ item.text }}</span>
            </div>
          </div>
        </section>

        <section id="booking" class="doc__section">
          <span class="eyebrow eyebrow--amber">03</span>
          <h2>Правила бронирования</h2>
          <div class="facts">
            <div v-for="f in booking" :key="f.value" class="facts__item">
              <b class="num" :style="{ color: f.color }">{{ f.value }}</b>
              <span class="muted">{{ f.text }}</span>
            </div>
          </div>
          <div class="prose">
            <p>Цена в момент бронирования фиксируется аптекой. Если товар оказался недоступен, аптека отменяет бронь, а вы получаете уведомление и список ближайших альтернатив.</p>
          </div>
        </section>

        <section id="prices" class="doc__section">
          <span class="eyebrow eyebrow--pink">04</span>
          <h2>Об актуальности цен</h2>
          <div class="prose">
            <p>Аптеки передают остатки и цены автоматически из учётных систем. У каждого предложения указано время последнего обновления. Если цена в аптеке отличается от указанной в сервисе, сообщите нам — проверим и скорректируем данные партнёра.</p>
          </div>
          <div class="fresh">
            <div v-for="f in freshness" :key="f.label" class="fresh__row">
              <span class="muted">{{ f.label }}</span>
              <div class="fresh__track">
                <div class="fresh__fill" :style="{ width: `${f.pct}%`, background: f.color }" />
              </div>
              <b class="num">{{ f.pct }}%</b>
            </div>
            <span class="fresh__cap">Доля аптек по частоте обновления данных</span>
          </div>
        </section>
      </main>
    </div>
  </div>
</template>

<style scoped>
.intro {
  padding: 28px 8px 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.layout {
  display: grid;
  grid-template-columns: minmax(0, 260px) minmax(0, 1fr);
  gap: var(--gap);
  align-items: start;
}

.toc {
  background: var(--surface);
  border-radius: 20px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  position: sticky;
  top: 12px;
}

.toc__link {
  padding: 11px 14px;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 500;
  color: var(--ink);
}

.toc__link:hover {
  background: var(--bg);
  color: var(--ink);
}

.toc__link--active {
  background: var(--ink);
  color: #fff;
  font-weight: 700;
}

.toc__link--active:hover {
  background: var(--ink);
  color: #fff;
}

.doc {
  display: flex;
  flex-direction: column;
  gap: var(--gap);
  min-width: 0;
}

.doc__section {
  background: var(--surface);
  border-radius: var(--r-card-lg);
  padding: clamp(24px, 3vw, 36px);
  display: flex;
  flex-direction: column;
  gap: 18px;
  scroll-margin-top: 12px;
}

.doc__section h2 {
  font-size: clamp(22px, 2.6vw, 28px);
  letter-spacing: -0.025em;
}

.eyebrow--blue {
  color: var(--blue);
  border-color: var(--blue-soft);
}

.eyebrow--green {
  color: var(--green);
  border-color: var(--green-soft);
}

.eyebrow--amber {
  color: var(--amber-deep);
  border-color: var(--amber-soft);
}

.eyebrow--pink {
  color: var(--pink-deep);
  border-color: var(--pink-soft);
}

.prose {
  display: flex;
  flex-direction: column;
  gap: 14px;
  font-size: 15px;
  line-height: 1.6;
  color: var(--ink-soft);
  max-width: 720px;
}

.prose b {
  color: var(--ink);
}

.cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(220px, 100%), 1fr));
  gap: 12px;
}

.cards__item {
  background: var(--bg);
  border-radius: var(--r-sm);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 16px;
  line-height: 1.5;
}

.cards__item b {
  font-size: 15px;
}

.facts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(200px, 100%), 1fr));
  gap: 10px;
}

.facts__item {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 20px;
  border-radius: var(--r-sm);
  border: 1px solid var(--line);
  font-size: 16px;
  line-height: 1.5;
}

.facts__item b {
  font-size: 34px;
  font-weight: 800;
}

.fresh {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: 560px;
}

.fresh__row {
  display: grid;
  grid-template-columns: 150px minmax(0, 1fr) 44px;
  gap: 12px;
  align-items: center;
  font-size: 16px;
}

.fresh__track {
  height: 12px;
  background: var(--bg);
  border-radius: 4px;
  overflow: hidden;
}

.fresh__fill {
  height: 100%;
  border-radius: 4px;
}

.fresh__row b {
  text-align: right;
}

.fresh__cap {
  font-size: 14px;
  color: var(--on-night-dim);
}

@media (width <= 860px) {
  .layout {
    grid-template-columns: 1fr;
  }

  .toc {
    position: static;
    flex-direction: row;
    flex-wrap: wrap;
  }

  .fresh__row {
    grid-template-columns: 120px minmax(0, 1fr) 44px;
  }
}
</style>
