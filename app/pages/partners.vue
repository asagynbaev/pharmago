<script setup lang="ts">
const { data: stats } = await useFetch('/api/stats')

const months = ['Сен', 'Окт', 'Ноя', 'Дек', 'Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг']
const values = [4.1, 4.6, 5.2, 6.0, 6.8, 7.9, 8.4, 9.6, 10.8, 11.9, 12.7, 14.0]
const peak = Math.max(...values)

const bars = values.map((v, i) => ({
  month: months[i]!,
  value: v,
  height: `${Math.round((v / peak) * 100)}%`,
  color:
    i === values.length - 1
      ? 'var(--green)'
      : i >= 8
        ? 'var(--blue)'
        : 'rgba(207,226,251,.35)',
}))

const steps = [
  {
    title: 'Выгрузка остатков',
    text: 'Из 1С, «Аптека+» или Excel-файла по расписанию. Ничего не нужно вводить руками.',
    color: 'var(--green)',
  },
  {
    title: 'Сопоставление с базой',
    text: 'Сводим ваши наименования с единым справочником препаратов и форм выпуска.',
    color: 'var(--blue)',
  },
  {
    title: 'Показ в поиске',
    text: 'Аптека появляется в результатах с ценой, наличием и расстоянием до покупателя.',
    color: 'var(--amber-deep)',
  },
  {
    title: 'Бронь и выкуп',
    text: 'Бронь приходит в кабинет и на телефон провизора. Покупатель забирает за 3 часа.',
    color: 'var(--pink-deep)',
  },
]

const plans = [
  {
    id: 'start',
    name: 'Старт',
    price: '0',
    unit: 'сом/мес',
    text: 'Одна аптека. Показ в поиске, карта, режим работы. Бронь — 15 сом за выкупленную.',
    accent: false,
  },
  {
    id: 'network',
    name: 'Сеть',
    price: '2 900',
    unit: 'сом/мес',
    text: 'До 10 аптек. Единый кабинет, аналитика спроса по районам, бронь без комиссии.',
    accent: true,
  },
  {
    id: 'enterprise',
    name: 'Крупная сеть',
    price: 'По запросу',
    unit: '',
    text: 'Более 10 аптек. API, доставка, выделенный менеджер, интеграция с программой лояльности.',
    accent: false,
  },
]

const form = reactive({ company: '', phone: '', plan: 'start', points: 1 })
const pending = ref(false)
const done = ref(false)
const errorMessage = ref('')

const toast = useToast()
const shakeKey = ref(0)

async function submit() {
  errorMessage.value = ''
  pending.value = true
  try {
    await $fetch('/api/partners', { method: 'POST', body: { ...form } })
    done.value = true
    toast.success('Заявка принята', 'Менеджер перезвонит в течение рабочего дня')
  }
  catch (e) {
    const err = e as { data?: { statusMessage?: string } }
    errorMessage.value = err.data?.statusMessage ?? 'Не удалось отправить заявку'
    shakeKey.value++
    toast.error('Заявка не ушла', errorMessage.value)
  }
  finally {
    pending.value = false
  }
}

useSeoMeta({
  title: 'Аптекам — подключение к PharmaGO',
  description:
    'Подключите аптеку к PharmaGO: выгрузка остатков из 1С за один день, показ в поиске, брони и аналитика спроса по районам Бишкека.',
})
</script>

<template>
  <div class="page-body">
    <section class="hero section section--night">
      <div class="hero__text">
        <span class="hero__badge">Для аптек и сетей</span>
        <h1 class="h-hero">
          Покупатели уже ищут ваши лекарства. Покажите, что они у вас есть
        </h1>
        <p class="hero__lead">
          Подключите остатки — и ваша аптека появится в результатах поиска
          с ценой, наличием и кнопкой брони.
        </p>
        <div class="hero__actions">
          <a href="#apply" class="btn btn--primary">Подключить аптеку</a>
          <a href="#tariffs" class="btn btn--ghost-light">Тарифы</a>
        </div>
      </div>

      <div class="chart">
        <span class="chart__cap">Поисковых запросов в день, тыс.</span>
        <div class="chart__bars">
          <div v-for="b in bars" :key="b.month" class="chart__col">
            <div class="chart__bar" :style="{ height: b.height, background: b.color }" />
            <span class="chart__month">{{ b.month }}</span>
          </div>
        </div>
        <div class="chart__foot">
          <span>Сен 2025 — Авг 2026</span>
          <b>+3,4× за год</b>
        </div>
      </div>
    </section>

    <section class="grid-auto pg-stagger" aria-label="Результаты партнёров">
      <div class="card stat">
        <b class="stat__num num" style="color: var(--blue)">38%</b>
        <span class="stat__label">Покупателей приходят из PharmaGO</span>
        <span class="muted">в среднем у аптек-партнёров вне центра</span>
      </div>
      <div class="card stat">
        <b class="stat__num num" style="color: var(--green)">1 день</b>
        <span class="stat__label">На подключение</span>
        <span class="muted">интеграция с 1С, «Аптека+», Excel-выгрузкой</span>
      </div>
      <div class="card stat">
        <b class="stat__num num" style="color: var(--amber-deep)">92%</b>
        <span class="stat__label">Броней выкупаются</span>
        <span class="muted">покупатель приходит в течение 3 часов</span>
      </div>
      <div class="card stat">
        <b class="stat__num num" style="color: var(--pink-deep)">0 сом</b>
        <span class="stat__label">За размещение</span>
        <span class="muted">платите только за подтверждённые брони</span>
      </div>
    </section>

    <section id="integration" class="section section--white steps">
      <h2 class="h-section">Как передаются остатки</h2>
      <div class="steps__grid pg-stagger">
        <div v-for="s in steps" :key="s.title" class="step">
          <div class="step__rule">
            <span class="step__dot" :style="{ background: s.color }" />
            <span class="step__line" />
          </div>
          <b>{{ s.title }}</b>
          <span class="muted">{{ s.text }}</span>
        </div>
      </div>
    </section>

    <section id="tariffs" class="tariffs pg-stagger">
      <div
        v-for="plan in plans"
        :key="plan.id"
        class="plan"
        :class="{ 'plan--accent': plan.accent }"
      >
        <span class="plan__name">{{ plan.name }}</span>
        <b class="plan__price num">
          {{ plan.price }}<span v-if="plan.unit" class="plan__unit">{{ plan.unit }}</span>
        </b>
        <span class="plan__text">{{ plan.text }}</span>
        <a
          v-if="plan.id !== 'enterprise'"
          href="#apply"
          class="btn plan__btn"
          :class="plan.accent ? 'plan__btn--accent' : ''"
          @click="form.plan = plan.id"
        >
          Подключить
        </a>
        <NuxtLink v-else to="/contacts" class="btn plan__btn">Связаться</NuxtLink>
      </div>
    </section>

    <section id="apply" class="apply">
      <div class="apply__text">
        <h2 class="h-section">Заявка на подключение</h2>
        <p class="muted">
          Менеджер перезвонит в течение рабочего дня и поможет с выгрузкой
          остатков. Сейчас в сервисе {{ stats?.pharmacies ?? 0 }} аптек
          и {{ stats?.chains ?? 0 }} сетей.
        </p>
      </div>

      <form v-if="!done" class="apply__form" @submit.prevent="submit">
        <input
          v-model="form.company"
          class="field"
          required
          placeholder="Название аптеки или сети"
          aria-label="Название аптеки или сети"
        >
        <input
          v-model="form.phone"
          class="field"
          required
          type="tel"
          placeholder="Телефон, +996 555 12-34-56"
          aria-label="Телефон"
        >
        <div class="apply__row">
          <label class="apply__label">
            Точек
            <input
              v-model.number="form.points"
              class="field"
              type="number"
              min="1"
              max="500"
              aria-label="Количество точек"
            >
          </label>
          <label class="apply__label">
            Тариф
            <select v-model="form.plan" class="field" aria-label="Тариф">
              <option v-for="p in plans" :key="p.id" :value="p.id">{{ p.name }}</option>
            </select>
          </label>
        </div>

        <p
          v-if="errorMessage"
          :key="shakeKey"
          class="field-error pg-shake"
          role="alert"
        >
          {{ errorMessage }}
        </p>

        <button class="btn btn--primary" type="submit" :disabled="pending">
          <template v-if="pending">Отправляем<PgDots /></template>
          <template v-else>Отправить заявку</template>
        </button>
      </form>

      <div v-else class="apply__done" role="status">
        <PgBurst class="apply__burst">
          <PgMark kind="check" :size="104" mark="#0B1C2E" />
        </PgBurst>
        <b>Заявка принята</b>
        <p class="muted">
          Менеджер перезвонит на {{ form.phone }} в течение рабочего дня.
        </p>
      </div>
    </section>
  </div>
</template>

<style scoped>
.hero {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(300px, 100%), 1fr));
  gap: 40px;
  align-items: center;
}

.hero__text {
  display: flex;
  flex-direction: column;
  gap: 20px;
  align-items: flex-start;
}

.hero__badge {
  padding: 6px 12px;
  border-radius: var(--r-pill);
  background: rgb(255 255 255 / 8%);
  color: var(--blue-soft);
  font-size: 13px;
  font-weight: 500;
}

.hero__text h1 {
  color: #fff;
}

.hero__lead {
  font-size: 17px;
  line-height: 1.5;
  color: var(--on-night-bright);
  max-width: 520px;
}

.hero__actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.chart {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.chart__cap {
  font-size: 13px;
  color: var(--on-night-dim);
}

.chart__bars {
  display: flex;
  align-items: flex-end;
  gap: 6px;
  height: 180px;
}

.chart__col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  height: 100%;
  justify-content: flex-end;
}

.chart__bar {
  width: 100%;
  border-radius: 4px 4px 0 0;
}

.chart__month {
  font-size: 11px;
  color: var(--on-night-dim);
}

.chart__foot {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: var(--on-night-bright);
}

.chart__foot b {
  color: #fff;
}

.stat {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 13px;
}

.stat__num {
  font-size: 38px;
  font-weight: 800;
}

.stat__label {
  font-size: 15px;
  font-weight: 600;
  color: var(--ink);
}

.steps {
  display: flex;
  flex-direction: column;
  gap: 32px;
  scroll-margin-top: 12px;
}

.steps__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(200px, 100%), 1fr));
  gap: 24px;
}

.step {
  display: flex;
  flex-direction: column;
  gap: 14px;
  font-size: 14px;
  line-height: 1.5;
}

.step b {
  font-size: 17px;
}

.step__rule {
  display: flex;
  align-items: center;
  gap: 10px;
}

.step__dot {
  width: 14px;
  height: 14px;
  flex: none;
}

.step__line {
  flex: 1;
  height: 2px;
  background: var(--line);
}

.tariffs {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(260px, 100%), 1fr));
  gap: var(--gap);
  scroll-margin-top: 12px;
}

.plan {
  background: var(--surface);
  border-radius: var(--r-card-lg);
  padding: 32px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.plan--accent {
  background: var(--blue);
  color: #fff;
}

.plan__name {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-muted);
}

.plan--accent .plan__name {
  color: var(--blue-soft);
}

.plan__price {
  font-size: 40px;
  font-weight: 800;
  display: flex;
  align-items: baseline;
  gap: 6px;
  flex-wrap: wrap;
}

.plan__unit {
  font-size: 18px;
  font-weight: 600;
  color: var(--ink-muted);
}

.plan--accent .plan__unit {
  color: var(--blue-soft);
}

.plan__text {
  font-size: 14px;
  line-height: 1.5;
  color: var(--ink-muted);
}

.plan--accent .plan__text {
  color: #e4efff;
}

.plan__btn {
  margin-top: auto;
  justify-content: center;
  padding: 12px;
  font-size: 14px;
}

.plan__btn--accent {
  background: #fff;
  color: var(--blue);
  font-weight: 700;
}

.plan__btn--accent:hover {
  background: #e4efff;
  color: var(--blue);
}

.apply {
  background: var(--green-soft);
  border-radius: var(--r-section);
  padding: clamp(28px, 4vw, 48px);
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(280px, 100%), 1fr));
  gap: 32px;
  align-items: center;
  scroll-margin-top: 12px;
}

.apply__text {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.apply__text .muted {
  color: #3e5a4d;
  font-size: 15px;
  line-height: 1.5;
}

.apply__form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.apply__form .field {
  border-color: transparent;
  background: #fff;
}

.apply__row {
  display: grid;
  grid-template-columns: 1fr 1.4fr;
  gap: 10px;
}

.apply__label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #3e5a4d;
}

.apply__done {
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: #fff;
  border-radius: var(--r-card);
  padding: 28px;
  text-align: center;
  align-items: center;
}

.apply__burst {
  align-self: center;
}

.apply__done b {
  font-size: 20px;
}
</style>
