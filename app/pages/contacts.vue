<script setup lang="ts">

const topics = ['Вопрос по сервису', 'Ошибка в цене', 'Партнёрство', 'Пресса']

const form = reactive({
  name: '',
  contact: '',
  topic: topics[0]!,
  message: '',
})

const pending = ref(false)
const done = ref(false)
const errorMessage = ref('')

const toast = useToast()
const shakeKey = ref(0)

async function submit() {
  errorMessage.value = ''
  pending.value = true
  try {
    await $fetch('/api/contact', { method: 'POST', body: { ...form } })
    done.value = true
    toast.success('Сообщение отправлено', 'Ответим в течение 15 минут')
  }
  catch (e) {
    const err = e as { data?: { statusMessage?: string } }
    errorMessage.value = err.data?.statusMessage ?? 'Не удалось отправить сообщение'
    shakeKey.value++
    toast.error('Не отправилось', errorMessage.value)
  }
  finally {
    pending.value = false
  }
}

/** Офис на карте — та же координатная сетка, что и у аптек. */
const office = {
  id: 'office',
  chain: 'Офис PharmaGO',
  address: 'ул. Исанова, 79',
  district: 'Центр',
  lat: 42.8731,
  lng: 74.5862,
  phone: '+996 312 00-00-00',
  opensAt: 540,
  closesAt: 1080,
  is24h: false,
  delivery: false,
  rating: 5,
  reviews: 0,
  distance: 0,
  isOpen: true,
  hours: '09:00–18:00',
  status: 'open' as const,
  statusLabel: 'Открыто',
}

const officeMapsLink = `https://www.google.com/maps/dir/?api=1&destination=${office.lat},${office.lng}`

useSeoMeta({
  title: 'Контакты',
  description:
    'Связаться с PharmaGO: горячая линия, почта, Telegram-бот и офис в Бишкеке на улице Исанова, 79.',
})
</script>

<template>
  <div class="page-body">
    <section class="intro">
      <h1 class="h-hero">Контакты</h1>
      <p class="lead">
        Отвечаем в рабочие часы в течение 15 минут. Ночью работает бот в Telegram —
        подскажет ближайшую дежурную аптеку.
      </p>
    </section>

    <div class="channels">
      <a href="tel:+996312000000" class="channel channel--night">
        <span class="channel__label">Горячая линия</span>
        <b class="channel__value">+996 312 00-00-00</b>
        <span class="channel__note">Ежедневно 8:00–22:00 · бесплатно по Кыргызстану</span>
      </a>
      <a href="mailto:hello@pharmago.kg" class="channel channel--blue">
        <span class="channel__label">Почта</span>
        <b class="channel__value">hello@pharmago.kg</b>
        <span class="channel__note">Вопросы пользователей, партнёрство, пресса</span>
      </a>
      <a
        href="https://t.me/pharmago_bot"
        target="_blank"
        rel="noopener noreferrer"
        class="channel channel--green"
      >
        <span class="channel__label">Telegram</span>
        <b class="channel__value">@pharmago_bot</b>
        <span class="channel__note">Круглосуточно: дежурные аптеки, статус брони</span>
      </a>
    </div>

    <div class="layout">
      <section class="card form-card">
        <h2 class="h-block">Написать нам</h2>

        <form v-if="!done" class="form" @submit.prevent="submit">
          <div class="form__row">
            <input
              v-model="form.name"
              class="field"
              required
              placeholder="Имя"
              aria-label="Имя"
            >
            <input
              v-model="form.contact"
              class="field"
              required
              placeholder="Телефон или email"
              aria-label="Телефон или email"
            >
          </div>

          <div class="form__topics" role="radiogroup" aria-label="Тема обращения">
            <button
              v-for="t in topics"
              :key="t"
              class="chip chip--onbg"
              type="button"
              role="radio"
              :aria-checked="form.topic === t"
              :class="{ 'chip--active': form.topic === t }"
              @click="form.topic = t"
            >
              {{ t }}
            </button>
          </div>

          <textarea
            v-model="form.message"
            class="field"
            rows="5"
            required
            placeholder="Сообщение"
            aria-label="Сообщение"
          />

          <p
            v-if="errorMessage"
            :key="shakeKey"
            class="field-error pg-shake"
            role="alert"
          >
            {{ errorMessage }}
          </p>

          <button class="btn btn--blue form__submit" type="submit" :disabled="pending">
            <template v-if="pending">Отправляем<PgDots /></template>
            <template v-else>Отправить</template>
          </button>
        </form>

        <div v-else class="form__done" role="status">
          <PgBurst class="form__burst">
            <PgMark kind="check" :size="104" mark="#0B1C2E" />
          </PgBurst>
          <b>Сообщение отправлено</b>
          <p class="muted">
            Ответим на {{ form.contact }} в рабочие часы в течение 15 минут.
          </p>
        </div>
      </section>

      <section class="side">
        <div class="card office">
          <h2 class="h-block">Офис</h2>
          <div class="office__addr">
            <b>Бишкек, ул. Исанова, 79</b>
            <span class="muted">Бизнес-центр «Аврора», 4 этаж, офис 412</span>
            <span class="muted">Пн–Пт, 9:00–18:00</span>
          </div>

          <div class="office__map">
            <ClientOnly>
              <PharmacyMap
                :pharmacies="[office]"
                selected-id="office"
                :show-user="false"
                :fit="false"
                :zoom="16"
                min-height="220px"
              />
              <template #fallback>
                <div class="skeleton office__skeleton" />
              </template>
            </ClientOnly>
          </div>

          <a
            class="btn btn--sm office__route"
            :href="officeMapsLink"
            target="_blank"
            rel="noopener noreferrer"
          >
            Построить маршрут
          </a>
        </div>

        <div class="card legal">
          <b>Реквизиты</b>
          <span>ОсОО «ФармаГо» · ИНН 0000000000000 · ОКПО 00000000</span>
          <span>Юр. адрес: 720040, Кыргызская Республика, г. Бишкек, ул. Исанова, 79</span>
        </div>
      </section>
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
  max-width: 560px;
}

.channels {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(280px, 100%), 1fr));
  gap: var(--gap);
}

.channel {
  border-radius: var(--r-card-lg);
  padding: 28px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 200px;
  transition: background 0.15s var(--ease);
}

.channel__label {
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.channel__value {
  font-size: clamp(22px, 2.4vw, 30px);
  letter-spacing: -0.03em;
}

.channel__note {
  font-size: 16px;
  margin-top: auto;
}

.channel--night {
  background: var(--night);
  color: #fff;
}

.channel--night:hover {
  background: var(--night-2);
  color: #fff;
}

.channel--night .channel__label {
  color: var(--on-night-dim);
}

.channel--night .channel__note {
  color: var(--on-night);
}

.channel--blue {
  background: var(--blue-soft);
  color: var(--ink);
}

.channel--blue:hover {
  background: #bfd8f9;
  color: var(--ink);
}

.channel--blue .channel__label {
  color: var(--blue-deep);
}

.channel--blue .channel__note {
  color: #3b5473;
}

.channel--green {
  background: var(--green-soft);
  color: var(--ink);
}

.channel--green:hover {
  background: #cdebdc;
  color: var(--ink);
}

.channel--green .channel__label {
  color: var(--green-deep);
}

.channel--green .channel__note {
  color: #3e5a4d;
}

.layout {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(320px, 100%), 1fr));
  gap: var(--gap);
  align-items: start;
}

.card {
  background: var(--surface);
  border-radius: var(--r-card-lg);
  padding: 32px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.form__row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(200px, 100%), 1fr));
  gap: 10px;
}

.form__topics {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.form__submit {
  align-self: flex-start;
}

.form textarea {
  resize: vertical;
  min-height: 120px;
}

.form__done {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.form__burst {
  align-self: center;
}

.form__done {
  text-align: center;
  align-items: center;
}

.form__done b {
  font-size: 20px;
}

.side {
  display: flex;
  flex-direction: column;
  gap: var(--gap);
}

.office__addr {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 15px;
  line-height: 1.5;
}

.office__map {
  height: 220px;
  border-radius: var(--r-sm);
  overflow: hidden;
}

.office__skeleton {
  width: 100%;
  height: 220px;
}

.office__route {
  align-self: flex-start;
}

.legal {
  gap: 10px;
  font-size: 16px;
  color: var(--ink-muted);
  line-height: 1.5;
  padding: 24px 32px;
}

.legal b {
  color: var(--ink);
  font-size: 16px;
}
</style>
