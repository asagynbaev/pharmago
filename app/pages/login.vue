<script setup lang="ts">
definePageMeta({ layout: 'default' })

const route = useRoute()
const toast = useToast()
const {
  isAuthenticated,
  requestCode,
  verifyCode,
  recoverByCode,
  whatsappConfigured,
} = useAuth()

type Step = 'phone' | 'code' | 'recover'

const step = ref<Step>('phone')
const phone = ref('')
const code = ref('')
const name = ref('')
const recoveryCode = ref('')
const recoveryToken = ref('')
const maskedPhone = ref('')

const pending = ref(false)
const errorMessage = ref('')
const shakeKey = ref(0)
/** Код из демо-режима: показываем прямо на экране, отправлять его некуда. */
const devCode = ref('')

const redirectTo = computed(() => String(route.query.redirect ?? '/account'))

// Уже вошли — на странице входа делать нечего.
watchEffect(() => {
  if (isAuthenticated.value) navigateTo(redirectTo.value, { replace: true })
})

/* Обратный отсчёт до повторной отправки. */
const secondsLeft = ref(0)
let timer: ReturnType<typeof setInterval> | undefined

function startCountdown(seconds: number) {
  secondsLeft.value = seconds
  clearInterval(timer)
  timer = setInterval(() => {
    secondsLeft.value -= 1
    if (secondsLeft.value <= 0) clearInterval(timer)
  }, 1000)
}
onBeforeUnmount(() => clearInterval(timer))

function fail(e: unknown, fallback: string) {
  const err = e as { data?: { statusMessage?: string }, statusMessage?: string }
  errorMessage.value = err.data?.statusMessage ?? err.statusMessage ?? fallback
  shakeKey.value++
}

async function sendCode() {
  errorMessage.value = ''
  pending.value = true
  try {
    const result = await requestCode(
      recoveryToken.value ? { recoveryToken: recoveryToken.value } : { phone: phone.value },
    )
    maskedPhone.value = result.maskedPhone
    devCode.value = result.devCode ?? ''
    startCountdown(result.retryAfter)
    step.value = 'code'

    if (result.delivered) toast.success('Код отправлен', `WhatsApp · ${result.maskedPhone}`)
    else toast.info('Демо-режим', 'WhatsApp не подключён — код показан на экране')
  }
  catch (e) {
    fail(e, 'Не удалось отправить код')
  }
  finally {
    pending.value = false
  }
}

async function confirm() {
  errorMessage.value = ''
  pending.value = true
  try {
    await verifyCode({
      phone: recoveryToken.value ? undefined : phone.value,
      recoveryToken: recoveryToken.value || undefined,
      code: code.value,
      name: name.value.trim() || undefined,
    })
    toast.success('Вы вошли', 'Добро пожаловать в личный кабинет')
    await navigateTo(redirectTo.value, { replace: true })
  }
  catch (e) {
    fail(e, 'Не удалось подтвердить код')
  }
  finally {
    pending.value = false
  }
}

async function findByCode() {
  errorMessage.value = ''
  pending.value = true
  try {
    const found = await recoverByCode(recoveryCode.value)
    recoveryToken.value = found.recoveryToken
    maskedPhone.value = found.maskedPhone
    // Номер известен серверу — сразу шлём на него код.
    await sendCode()
  }
  catch (e) {
    fail(e, 'Не удалось найти номер по коду')
  }
  finally {
    pending.value = false
  }
}

function back() {
  step.value = 'phone'
  code.value = ''
  devCode.value = ''
  recoveryToken.value = ''
  errorMessage.value = ''
}

useSeoMeta({
  title: 'Вход',
  description: 'Вход в личный кабинет PharmaGO по номеру телефона через WhatsApp.',
  robots: 'noindex',
})
</script>

<template>
  <div class="page-body">
    <section class="login">
      <div class="login__art">
        <PharmaLogo variant="footer" :width="76" :height="60" />
        <h1 class="login__brand">Pharma<span>GO</span></h1>
        <p class="login__pitch">
          Брони и заказы в одном месте, адрес доставки сохраняется,
          избранные аптеки всегда под рукой.
        </p>
        <ul class="login__perks">
          <li>История броней и статус заказа</li>
          <li>Доставка без повторного ввода адреса</li>
          <li>Избранные аптеки рядом с домом</li>
        </ul>
      </div>

      <div class="login__panel">
        <!-- Шаг 1: номер -->
        <form v-if="step === 'phone'" class="form" @submit.prevent="sendCode">
          <h2 class="h-block">Вход в кабинет</h2>
          <p class="muted">
            Введите номер — пришлём код подтверждения в WhatsApp.
            Аккаунт создастся автоматически, если его ещё нет.
          </p>

          <label class="field-row">
            <span>Номер телефона</span>
            <input
              v-model="phone"
              class="field"
              type="tel"
              required
              autocomplete="tel"
              placeholder="+996 555 12-34-56"
            >
          </label>

          <p v-if="errorMessage" :key="shakeKey" class="field-error pg-shake" role="alert">
            {{ errorMessage }}
          </p>

          <button class="btn btn--primary" type="submit" :disabled="pending">
            <template v-if="pending">Отправляем<PgDots /></template>
            <template v-else>Получить код в WhatsApp</template>
          </button>

          <button class="linklike" type="button" @click="step = 'recover'">
            Не помню номер
          </button>

          <p class="login__legal">
            Продолжая, вы соглашаетесь с
            <NuxtLink to="/terms#terms">правилами сервиса</NuxtLink> и
            <NuxtLink to="/terms#privacy">политикой конфиденциальности</NuxtLink>.
          </p>
        </form>

        <!-- Шаг 2: код -->
        <form v-else-if="step === 'code'" class="form" @submit.prevent="confirm">
          <h2 class="h-block">Код из WhatsApp</h2>
          <p class="muted">
            Отправили шестизначный код на <b>{{ maskedPhone }}</b>.
            Он действует пять минут.
          </p>

          <div v-if="devCode" class="devnote">
            <b>Демо-режим</b>
            <span>
              WhatsApp Cloud API не подключён, поэтому сообщение не ушло.
              Код для входа: <b class="devnote__code">{{ devCode }}</b>
            </span>
          </div>

          <label class="field-row">
            <span>Код подтверждения</span>
            <input
              v-model="code"
              class="field field--code"
              inputmode="numeric"
              autocomplete="one-time-code"
              maxlength="6"
              required
              placeholder="000000"
            >
          </label>

          <label class="field-row">
            <span>Как к вам обращаться <i>— необязательно</i></span>
            <input v-model="name" class="field" placeholder="Имя">
          </label>

          <p v-if="errorMessage" :key="shakeKey" class="field-error pg-shake" role="alert">
            {{ errorMessage }}
          </p>

          <button class="btn btn--primary" type="submit" :disabled="pending">
            <template v-if="pending">Проверяем<PgDots /></template>
            <template v-else>Войти</template>
          </button>

          <div class="form__row">
            <button
              class="linklike"
              type="button"
              :disabled="secondsLeft > 0 || pending"
              @click="sendCode"
            >
              {{ secondsLeft > 0 ? `Отправить снова через ${secondsLeft} с` : 'Отправить код снова' }}
            </button>
            <button class="linklike" type="button" @click="back">Изменить номер</button>
          </div>

          <details class="help">
            <summary>Код не приходит</summary>
            <ul>
              <li>Проверьте, что WhatsApp установлен на этом номере.</li>
              <li>Загляните в архив и папку «Спам» внутри WhatsApp.</li>
              <li>Подождите минуту и запросите код повторно.</li>
              <li>
                Если не помогло — позвоните на
                <a href="tel:+996312000000">+996 312 00-00-00</a>,
                оператор подтвердит номер вручную.
              </li>
            </ul>
          </details>
        </form>

        <!-- Восстановление доступа -->
        <form v-else class="form" @submit.prevent="findByCode">
          <h2 class="h-block">Не помню номер</h2>
          <p class="muted">
            Введите код брони или заказа — найдём привязанный номер
            и отправим на него код входа. Полностью номер не покажем.
          </p>

          <label class="field-row">
            <span>Код брони или заказа</span>
            <input
              v-model="recoveryCode"
              class="field field--code"
              required
              placeholder="PG-123456"
              autocomplete="off"
            >
          </label>

          <p v-if="errorMessage" :key="shakeKey" class="field-error pg-shake" role="alert">
            {{ errorMessage }}
          </p>

          <button class="btn btn--blue" type="submit" :disabled="pending">
            <template v-if="pending">Ищем<PgDots /></template>
            <template v-else>Найти номер</template>
          </button>

          <button class="linklike" type="button" @click="step = 'phone'">
            Вернуться ко входу
          </button>

          <p class="login__legal">
            Кода нет под рукой? Позвоните на
            <a href="tel:+996312000000">+996 312 00-00-00</a> — оператор
            найдёт заказ по имени и адресу.
          </p>
        </form>
      </div>
    </section>
  </div>
</template>

<style scoped>
.login {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 460px);
  gap: var(--gap);
  align-items: stretch;
  padding-top: 12px;
}

.login__art {
  background: var(--night);
  border-radius: var(--r-section);
  padding: clamp(28px, 4vw, 48px);
  display: flex;
  flex-direction: column;
  gap: 16px;
  color: var(--on-night);
}

.login__brand {
  font-size: clamp(32px, 4vw, 48px);
  color: #fff;
  letter-spacing: -0.03em;
}

.login__brand span {
  color: var(--blue-light);
}

.login__pitch {
  font-size: 17px;
  line-height: 1.5;
  color: var(--on-night-bright);
  max-width: 420px;
}

.login__perks {
  margin: auto 0 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 10px;
  font-size: 14px;
}

.login__perks li {
  display: flex;
  align-items: center;
  gap: 10px;
}

.login__perks li::before {
  content: '';
  width: 10px;
  height: 10px;
  background: var(--green);
  flex: none;
}

.login__panel {
  background: var(--surface);
  border-radius: var(--r-section);
  padding: clamp(28px, 4vw, 40px);
  display: flex;
  align-items: center;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 14px;
  width: 100%;
}

.form__row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.field-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--ink-muted);
}

.field-row i {
  font-style: normal;
  font-weight: 400;
}

.field--code {
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-align: center;
}

.linklike {
  border: 0;
  background: transparent;
  padding: 0;
  cursor: pointer;
  color: var(--blue);
  font-size: 14px;
  font-weight: 600;
  align-self: flex-start;
}

.linklike:disabled {
  color: var(--ink-muted);
  cursor: default;
}

.linklike:hover:not(:disabled) {
  color: #0059c9;
}

.devnote {
  background: var(--amber-soft);
  color: #6b5630;
  border-radius: var(--r-sm);
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;
  line-height: 1.5;
}

.devnote__code {
  font-size: 18px;
  letter-spacing: 0.16em;
  color: var(--ink);
}

.login__legal {
  font-size: 12px;
  line-height: 1.5;
  color: var(--ink-muted);
}

.help {
  border-top: 1px solid var(--line);
  padding-top: 12px;
  font-size: 14px;
}

.help summary {
  cursor: pointer;
  font-weight: 600;
  color: var(--ink);
}

.help ul {
  margin: 10px 0 0;
  padding-left: 18px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: var(--ink-muted);
  line-height: 1.5;
}

@media (width <= 900px) {
  .login {
    grid-template-columns: 1fr;
  }

  .login__art {
    display: none;
  }
}
</style>
