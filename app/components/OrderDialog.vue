<script setup lang="ts">
import type { OfferView } from '#shared/types'
import { formatPrice, plural } from '#shared/utils/catalog'

const props = defineProps<{
  offer: OfferView | null
  medicineSlug: string
  medicineName: string
  formId: string
  formLabel: string
}>()

const emit = defineEmits<{ close: [] }>()

interface OrderResult {
  code: string
  total: number
  price: number
  deliveryFee: number
  quantity: number
  etaAt: string
  address: string
  pharmacy: { chain: string, address: string, phone: string } | null
  medicine: { name: string, form: string } | null
}

const { user, isAuthenticated } = useAuth()
const toast = useToast()

const quantity = ref(1)
const name = ref('')
const phone = ref('')
const address = ref('')
const comment = ref('')

const pending = ref(false)
const errorMessage = ref('')
const shakeKey = ref(0)
const result = ref<OrderResult | null>(null)

/** Открытие диалога: чистим форму и подставляем данные профиля. */
watch(() => props.offer, (offer) => {
  if (!offer) return
  result.value = null
  errorMessage.value = ''
  pending.value = false
  quantity.value = 1
  name.value = user.value?.name ?? ''
  phone.value = user.value?.phone ?? ''
  address.value = user.value?.address ?? ''
  comment.value = ''
})

watch(() => props.offer, (offer) => {
  if (!import.meta.client) return
  document.body.style.overflow = offer ? 'hidden' : ''
})
onBeforeUnmount(() => {
  if (import.meta.client) document.body.style.overflow = ''
})

onKeyStroke('Escape', () => { if (props.offer) emit('close') })

const DELIVERY_FEE = 150

const total = computed(() =>
  props.offer ? props.offer.price * quantity.value + DELIVERY_FEE : 0,
)

async function submit() {
  if (!props.offer) return
  errorMessage.value = ''
  pending.value = true

  try {
    const data = await $fetch<{ order: OrderResult }>('/api/orders', {
      method: 'POST',
      body: {
        pharmacyId: props.offer.pharmacy.id,
        medicineSlug: props.medicineSlug,
        formId: props.formId,
        quantity: quantity.value,
        name: name.value,
        phone: phone.value,
        address: address.value,
        comment: comment.value,
      },
    })
    result.value = data.order
    toast.success('Заказ принят', `${data.order.code} · доставка 1–2 часа`)
  }
  catch (e) {
    const err = e as { data?: { statusMessage?: string }, statusMessage?: string }
    errorMessage.value
      = err.data?.statusMessage ?? err.statusMessage ?? 'Не удалось оформить заказ'
    shakeKey.value++
  }
  finally {
    pending.value = false
  }
}

const etaLabel = computed(() =>
  result.value
    ? new Date(result.value.etaAt).toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '',
)
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="offer" class="modal" @click.self="emit('close')">
        <div
          class="modal__box"
          role="dialog"
          aria-modal="true"
          aria-labelledby="order-title"
        >
          <button class="modal__close" type="button" aria-label="Закрыть" @click="emit('close')">
            &times;
          </button>

          <template v-if="!result">
            <h2 id="order-title" class="h-block">Доставка</h2>
            <p class="modal__lead">
              {{ medicineName }} · {{ formLabel }}<br>
              <b>{{ offer.pharmacy.chain }}</b>, {{ offer.pharmacy.address }}
            </p>

            <p v-if="!isAuthenticated" class="modal__hint">
              <NuxtLink to="/login">Войдите</NuxtLink>, чтобы адрес и телефон
              подставлялись сами, а заказ был виден в кабинете.
            </p>

            <form class="modal__form" @submit.prevent="submit">
              <div class="qty">
                <span>Количество</span>
                <div class="qty__control">
                  <button
                    type="button"
                    aria-label="Меньше"
                    :disabled="quantity <= 1"
                    @click="quantity = Math.max(1, quantity - 1)"
                  >−</button>
                  <b>{{ quantity }}</b>
                  <button
                    type="button"
                    aria-label="Больше"
                    :disabled="quantity >= 10"
                    @click="quantity = Math.min(10, quantity + 1)"
                  >+</button>
                </div>
              </div>

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

              <label class="modal__field">
                <span>Адрес доставки</span>
                <textarea
                  v-model="address"
                  class="field"
                  rows="2"
                  required
                  placeholder="Улица, дом, квартира, ориентир"
                />
              </label>

              <label class="modal__field">
                <span>Комментарий курьеру <i>— необязательно</i></span>
                <input v-model="comment" class="field" placeholder="Домофон, этаж, время">
              </label>

              <div class="sum">
                <div class="sum__row">
                  <span>
                    {{ formatPrice(offer.price) }} × {{ quantity }}
                    {{ plural(quantity, 'упаковка', 'упаковки', 'упаковок') }}
                  </span>
                  <span class="num">{{ formatPrice(offer.price * quantity) }} сом</span>
                </div>
                <div class="sum__row">
                  <span>Доставка по городу</span>
                  <span class="num">{{ formatPrice(DELIVERY_FEE) }} сом</span>
                </div>
                <div class="sum__row sum__row--total">
                  <b>Итого</b>
                  <b class="num">{{ formatPrice(total) }} сом</b>
                </div>
              </div>

              <p v-if="errorMessage" :key="shakeKey" class="field-error pg-shake" role="alert">
                {{ errorMessage }}
              </p>

              <button class="btn btn--primary" type="submit" :disabled="pending">
                <template v-if="pending">Оформляем<PgDots /></template>
                <template v-else>Заказать доставку</template>
              </button>

              <p class="modal__note">
                Оплата курьеру при получении. Доставка занимает 1–2 часа,
                отменить можно до выезда курьера.
              </p>
            </form>
          </template>

          <template v-else>
            <div class="modal__done">
              <PgBurst class="modal__burst">
                <PgMark kind="check" :size="120" mark="#0B1C2E" />
              </PgBurst>

              <h2 id="order-title" class="h-block modal__title">Заказ принят</h2>
              <p class="modal__lead">
                {{ result.medicine?.name }} · {{ result.medicine?.form }}<br>
                <b>{{ result.pharmacy?.chain }}</b>, {{ result.pharmacy?.address }}
              </p>

              <div class="modal__code">
                <span class="muted">Номер заказа</span>
                <b>{{ result.code }}</b>
              </div>

              <div class="modal__hold">
                <div class="modal__hold-text">
                  <b>Курьер привезёт к {{ etaLabel }}</b>
                  <span class="muted">
                    {{ result.address }} · к оплате
                    {{ formatPrice(result.total) }} сом наличными или картой
                  </span>
                </div>
              </div>

              <div class="modal__actions">
                <NuxtLink class="btn btn--dark" to="/account/orders" @click="emit('close')">
                  Отслеживать заказ
                </NuxtLink>
                <button class="btn" type="button" @click="emit('close')">Готово</button>
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
  width: min(480px, 100%);
  background: var(--surface);
  border-radius: var(--r-card-lg);
  padding: 32px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  box-shadow: var(--shadow-lg);
  margin: auto;
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

.modal__hint {
  background: var(--blue-soft);
  color: #3b5473;
  border-radius: var(--r-sm);
  padding: 12px 14px;
  font-size: 13px;
  line-height: 1.5;
}

.modal__form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.modal__field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--ink-muted);
}

.modal__field i {
  font-style: normal;
  font-weight: 400;
}

.modal__field textarea {
  resize: vertical;
}

.qty {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  font-size: 13px;
  font-weight: 600;
  color: var(--ink-muted);
}

.qty__control {
  display: flex;
  align-items: center;
  gap: 4px;
  background: var(--bg);
  border-radius: var(--r-pill);
  padding: 4px;
}

.qty__control button {
  width: 34px;
  height: 34px;
  border: 0;
  border-radius: 50%;
  background: var(--surface);
  font-size: 18px;
  cursor: pointer;
  color: var(--ink);
}

.qty__control button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.qty__control b {
  min-width: 32px;
  text-align: center;
  font-size: 16px;
  color: var(--ink);
}

.sum {
  background: var(--bg);
  border-radius: var(--r-sm);
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 14px;
}

.sum__row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  color: var(--ink-muted);
}

.sum__row--total {
  border-top: 1px solid var(--line);
  padding-top: 8px;
  color: var(--ink);
}

.sum__row--total b {
  font-size: 18px;
}

.modal__note {
  font-size: 12px;
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

.modal__hold {
  background: var(--bg);
  border-radius: var(--r-sm);
  padding: 14px 16px;
}

.modal__hold-text {
  display: flex;
  flex-direction: column;
  gap: 3px;
  font-size: 13px;
  line-height: 1.45;
}

.modal__hold-text b {
  font-size: 15px;
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
