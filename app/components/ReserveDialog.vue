<script setup lang="ts">
import type { OfferView } from '#shared/types'
import { formatPrice } from '#shared/utils/catalog'

const props = defineProps<{
  offer: OfferView | null
  medicineSlug: string
  medicineName: string
  formId: string
  formLabel: string
}>()

const emit = defineEmits<{ close: [] }>()

interface ReservationResult {
  reservation: { code: string, expiresAt: string, price: number }
  pharmacy: { chain: string, address: string, phone: string }
  medicine: { name: string, form: string }
  holdHours: number
}

const name = ref('')
const phone = ref('')
const pending = ref(false)
const errorMessage = ref('')
const result = ref<ReservationResult | null>(null)

const dialog = useTemplateRef<HTMLElement>('dialog')

// Каждое новое предложение открывает диалог заново. Вошедшему подставляем
// имя и телефон из профиля — вводить руками ничего не нужно.
watch(() => props.offer, (offer) => {
  if (!offer) return
  result.value = null
  errorMessage.value = ''
  pending.value = false
  name.value = user.value?.name ?? ''
  phone.value = user.value?.phone ?? ''
})

watch(() => props.offer, (offer) => {
  if (!import.meta.client) return
  document.body.style.overflow = offer ? 'hidden' : ''
})
onBeforeUnmount(() => {
  if (import.meta.client) document.body.style.overflow = ''
})

onKeyStroke('Escape', () => { if (props.offer) emit('close') })

const toast = useToast()
const { add: rememberReservation } = useReservations()
const { user, isAuthenticated } = useAuth()
/** Меняется на каждой неудаче — перезапускает встряску формы. */
const shakeKey = ref(0)

async function submit() {
  if (!props.offer) return
  errorMessage.value = ''
  pending.value = true

  try {
    result.value = await $fetch<ReservationResult>('/api/reservations', {
      method: 'POST',
      body: {
        pharmacyId: props.offer.pharmacy.id,
        medicineSlug: props.medicineSlug,
        formId: props.formId,
        name: name.value,
        phone: phone.value,
      },
    })
    rememberReservation(result.value.reservation.code)
    toast.success(
      'Бронь оформлена',
      `Код ${result.value.reservation.code} · ${result.value.pharmacy.chain}`,
    )
  }
  catch (e) {
    const err = e as { data?: { statusMessage?: string }, statusMessage?: string }
    errorMessage.value
      = err.data?.statusMessage ?? err.statusMessage ?? 'Не удалось оформить бронь'
    shakeKey.value++
  }
  finally {
    pending.value = false
  }
}

const expiresLabel = computed(() => {
  if (!result.value) return ''
  return new Date(result.value.reservation.expiresAt).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  })
})

// Каждую минуту пересчитываем остаток, чтобы подпись не устаревала.
const now = ref(Date.now())
let ticker: ReturnType<typeof setInterval> | undefined
onMounted(() => { ticker = setInterval(() => { now.value = Date.now() }, 60_000) })
onBeforeUnmount(() => clearInterval(ticker))

/** Сколько минут осталось держать товар. */
const minutesLeft = computed(() => {
  if (!result.value) return 0
  const diff = new Date(result.value.reservation.expiresAt).getTime() - now.value
  return Math.max(0, Math.round(diff / 60_000))
})

const leftLabel = computed(() => {
  const total = minutesLeft.value
  const hours = Math.floor(total / 60)
  const mins = total % 60
  if (!total) return 'время вышло'
  if (!hours) return `${mins} мин`
  return mins ? `${hours} ч ${mins} мин` : `${hours} ч`
})
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="offer" class="modal" @click.self="emit('close')">
        <div
          ref="dialog"
          class="modal__box"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reserve-title"
        >
          <button class="modal__close" type="button" aria-label="Закрыть" @click="emit('close')">
            &times;
          </button>

          <template v-if="!result">
            <h2 id="reserve-title" class="h-block">Бронирование</h2>
            <p class="modal__lead">
              {{ medicineName }} · {{ formLabel }}<br>
              <b>{{ offer.pharmacy.chain }}</b>, {{ offer.pharmacy.address }}
            </p>

            <div class="modal__price">
              <span class="muted">Цена в аптеке</span>
              <b class="num">{{ formatPrice(offer.price) }} сом</b>
            </div>

            <form class="modal__form" @submit.prevent="submit">
              <!-- Вошедшему поля не нужны: данные уже известны. -->
              <p v-if="isAuthenticated && name && phone" class="modal__known">
                Заберёт <b>{{ name }}</b>, телефон <b>{{ phone }}</b>
                <NuxtLink to="/account/profile" class="modal__change">Изменить</NuxtLink>
              </p>

              <template v-else>
                <label class="modal__field">
                  <span>Имя</span>
                  <input v-model="name" class="field" required placeholder="Как к вам обращаться">
                </label>
                <label class="modal__field">
                  <span>Телефон</span>
                  <input
                    v-model="phone"
                    class="field"
                    required
                    type="tel"
                    placeholder="+996 555 12-34-56"
                  >
                </label>
              </template>

              <p
                v-if="errorMessage"
                :key="shakeKey"
                class="field-error pg-shake"
                role="alert"
              >
                {{ errorMessage }}
              </p>

              <button class="btn btn--primary" type="submit" :disabled="pending">
                <template v-if="pending">
                  Отправляем<PgDots />
                </template>
                <template v-else>Забронировать</template>
              </button>
              <p class="modal__note">
                Бронь бесплатна, оплата — при получении в аптеке. Аптека отложит
                товар на 3 часа.
              </p>
            </form>
          </template>

          <template v-else>
            <div class="modal__done">
              <PgBurst class="modal__burst">
                <PgMark kind="check" :size="120" mark="#0B1C2E" />
              </PgBurst>

              <h2 id="reserve-title" class="h-block modal__title">Забронировано</h2>
              <p class="modal__lead">
                {{ result.medicine.name }} · {{ result.medicine.form }}<br>
                <b>{{ result.pharmacy.chain }}</b>, {{ result.pharmacy.address }}
              </p>

              <div class="modal__code">
                <span class="muted">Код брони</span>
                <b>{{ result.reservation.code }}</b>
              </div>

              <div class="modal__hold">
                <PgDrain
                  :size="52"
                  :duration="Math.max(minutesLeft, 1)"
                  label="Сколько держится бронь"
                />
                <div class="modal__hold-text">
                  <b>Осталось {{ leftLabel }}</b>
                  <span class="muted">
                    Товар отложен до {{ expiresLabel }} — назовите код на кассе.
                    Цена зафиксирована: {{ formatPrice(result.reservation.price) }} сом.
                  </span>
                </div>
              </div>

              <div class="modal__actions">
                <a class="btn" :href="`tel:${result.pharmacy.phone.replace(/\s/g, '')}`">
                  Позвонить в аптеку
                </a>
                <NuxtLink class="btn" to="/reservations" @click="emit('close')">
                  Мои брони
                </NuxtLink>
                <button class="btn btn--dark" type="button" @click="emit('close')">
                  Готово
                </button>
              </div>
            </div>
          </template>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal {
  position: fixed;
  inset: 0;
  z-index: 150;
  background: rgb(11 28 46 / 55%);
  backdrop-filter: blur(3px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  overflow-y: auto;
}

.modal__box {
  position: relative;
  width: min(460px, 100%);
  background: var(--surface);
  border-radius: var(--r-card-lg);
  padding: 32px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  box-shadow: var(--shadow-lg);
}

.modal__close {
  position: absolute;
  right: 16px;
  top: 16px;
  width: 36px;
  height: 36px;
  border: 0;
  border-radius: 10px;
  background: var(--bg);
  font-size: 24px;
  line-height: 1;
  cursor: pointer;
  color: var(--ink);
}

.modal__close:hover {
  background: var(--bg-2);
}

.modal__lead {
  font-size: 15px;
  line-height: 1.55;
  color: var(--ink-muted);
}

.modal__price {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  background: var(--bg);
  border-radius: var(--r-sm);
  padding: 14px 18px;
}

.modal__price b {
  font-size: 22px;
}

.modal__form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.modal__known {
  background: var(--bg);
  border-radius: var(--r-sm);
  padding: 14px 16px;
  font-size: var(--t-meta);
  line-height: 1.5;
}

.modal__change {
  margin-left: 8px;
  font-weight: 600;
  white-space: nowrap;
}

.modal__field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 15px;
  font-weight: 600;
  color: var(--ink-muted);
}

.modal__note {
  font-size: 14px;
  line-height: 1.5;
  color: var(--ink-muted);
}

.modal__done {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.modal__done .modal__lead {
  text-align: center;
}

.modal__burst {
  align-self: center;
  margin: 4px 0;
}

.modal__title {
  text-align: center;
}

.modal__hold {
  display: flex;
  align-items: center;
  gap: 14px;
  background: var(--bg);
  border-radius: var(--r-sm);
  padding: 14px 16px;
}

.modal__hold-text {
  display: flex;
  flex-direction: column;
  gap: 3px;
  font-size: 15px;
  line-height: 1.45;
  min-width: 0;
}

.modal__hold-text b {
  font-size: 15px;
}

.modal__code {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--green-soft);
  color: var(--green-deep);
  border-radius: var(--r-sm);
  padding: 14px 18px;
}

.modal__code b {
  font-size: 20px;
  letter-spacing: 0.06em;
}

.modal__actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s var(--ease);
}

.modal-enter-active .modal__box,
.modal-leave-active .modal__box {
  transition: transform 0.2s var(--ease);
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal__box,
.modal-leave-to .modal__box {
  transform: translateY(12px) scale(0.98);
}
</style>
