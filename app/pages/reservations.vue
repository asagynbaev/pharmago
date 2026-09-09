<script setup lang="ts">
import { formatPrice } from '#shared/utils/catalog'

interface ReservationView {
  code: string
  price: number
  name: string
  phone: string
  createdAt: string
  expiresAt: string
  expired: boolean
  holdHours: number
  pharmacy: { id: string, chain: string, address: string, phone: string, lat: number, lng: number } | null
  medicine: { slug: string, name: string, form: string } | null
}

const { codes, restore, add, remove, clear } = useReservations()
const toast = useToast()
const { isAuthenticated } = useAuth()

// У вошедших брони живут в кабинете — там они привязаны к аккаунту.
watchEffect(() => {
  if (isAuthenticated.value) navigateTo('/account/reservations', { replace: true })
})

const items = ref<ReservationView[]>([])
const loading = ref(false)

const lookupCode = ref('')
const lookupPending = ref(false)
const lookupError = ref('')
const shakeKey = ref(0)

async function fetchOne(code: string): Promise<ReservationView | null> {
  try {
    return await $fetch<ReservationView>(`/api/reservations/${encodeURIComponent(code)}`)
  }
  catch {
    // Бронь могла истечь и уехать из хранилища — молча пропускаем.
    return null
  }
}

async function loadAll() {
  if (!codes.value.length) {
    items.value = []
    return
  }
  loading.value = true
  const found = await Promise.all(codes.value.map(fetchOne))
  items.value = found.filter((r): r is ReservationView => r !== null)
  loading.value = false
}

onMounted(async () => {
  restore()
  await loadAll()
})

/** Ручной поиск: коды из другого браузера или продиктованные по телефону. */
async function lookup() {
  const code = lookupCode.value.trim().toUpperCase()
  if (!code) return

  lookupError.value = ''
  lookupPending.value = true
  try {
    const found = await $fetch<ReservationView>(
      `/api/reservations/${encodeURIComponent(code)}`,
    )
    add(found.code)
    restore()
    // Не дублируем, если бронь уже в списке.
    items.value = [found, ...items.value.filter(r => r.code !== found.code)]
    lookupCode.value = ''
    toast.success('Бронь найдена', `${found.pharmacy?.chain ?? ''} · ${found.code}`)
  }
  catch (e) {
    const err = e as { data?: { statusMessage?: string } }
    lookupError.value = err.data?.statusMessage ?? 'Бронь с таким кодом не найдена'
    shakeKey.value++
  }
  finally {
    lookupPending.value = false
  }
}

function forgetAll() {
  clear()
  items.value = []
  toast.info('Список очищен', 'Сами брони в аптеках остаются активными')
}

function forget(code: string) {
  remove(code)
  items.value = items.value.filter(r => r.code !== code)
  toast.info('Бронь убрана из списка', 'В аптеке она остаётся активной')
}

const timeLeft = (iso: string) => {
  const mins = Math.max(0, Math.round((new Date(iso).getTime() - Date.now()) / 60_000))
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (!mins) return 'время вышло'
  return h ? (m ? `${h} ч ${m} мин` : `${h} ч`) : `${m} мин`
}

const timeAt = (iso: string) =>
  new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })

const routeLink = (p: { lat: number, lng: number }) =>
  `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`

const active = computed(() => items.value.filter(r => !r.expired))
const expired = computed(() => items.value.filter(r => r.expired))

useSeoMeta({
  title: 'Мои брони',
  description: 'Статус брони в аптеке PharmaGO: код, срок и адрес аптеки.',
  robots: 'noindex',
})
</script>

<template>
  <div class="page-body">
    <section class="intro">
      <h1 class="h-hero">Мои брони</h1>
      <p class="lead">
        Брони этого браузера. Назовите код на кассе — аптека держит товар
        три часа с момента оформления.
      </p>
    </section>

    <section class="card lookup">
      <h2 class="h-block">Найти бронь по коду</h2>
      <form class="lookup__form" @submit.prevent="lookup">
        <input
          v-model="lookupCode"
          class="field"
          placeholder="PG-123456"
          aria-label="Код брони"
          autocomplete="off"
        >
        <button class="btn btn--blue" type="submit" :disabled="lookupPending">
          <template v-if="lookupPending">Ищем<PgDots /></template>
          <template v-else>Найти</template>
        </button>
      </form>
      <p v-if="lookupError" :key="shakeKey" class="field-error pg-shake" role="alert">
        {{ lookupError }}
      </p>
    </section>

    <template v-if="loading">
      <PgSkeletonCard v-for="i in 2" :key="i" />
    </template>

    <div v-else-if="!items.length" class="empty">
      <PgEmpty :size="150" />
      <b>Броней пока нет</b>
      <p>Найдите лекарство и нажмите «Забронировать» — код появится здесь.</p>
      <NuxtLink to="/search" class="btn btn--primary">Найти лекарство</NuxtLink>
      <NuxtLink to="/login" class="linklike">
        Войти — тогда брони не потеряются при смене браузера
      </NuxtLink>
    </div>

    <template v-else>
      <section v-if="active.length" class="list pg-stagger">
        <article v-for="r in active" :key="r.code" class="rcard">
          <div class="rcard__side">
            <PgDrain
              :size="56"
              :duration="Math.max(Math.round((new Date(r.expiresAt).getTime() - Date.now()) / 60000), 1)"
              label="Сколько держится бронь"
            />
            <b class="rcard__code">{{ r.code }}</b>
          </div>

          <div class="rcard__body">
            <div class="rcard__title">
              <b>{{ r.medicine?.name ?? 'Препарат' }}</b>
              <span class="tag tag--in">Активна</span>
            </div>
            <span class="muted">{{ r.medicine?.form }}</span>
            <span class="rcard__where">
              <b>{{ r.pharmacy?.chain }}</b>, {{ r.pharmacy?.address }}
            </span>
            <span class="muted">
              Осталось {{ timeLeft(r.expiresAt) }} · до {{ timeAt(r.expiresAt) }} ·
              цена зафиксирована {{ formatPrice(r.price) }} сом
            </span>

            <div class="rcard__actions">
              <a
                v-if="r.pharmacy"
                class="btn btn--sm"
                :href="`tel:${r.pharmacy.phone.replace(/\s/g, '')}`"
              >Позвонить</a>
              <a
                v-if="r.pharmacy"
                class="btn btn--sm btn--blue"
                :href="routeLink(r.pharmacy)"
                target="_blank"
                rel="noopener noreferrer"
              >Маршрут</a>
              <NuxtLink
                v-if="r.medicine"
                class="btn btn--sm"
                :to="`/medicine/${r.medicine.slug}`"
              >К препарату</NuxtLink>
            </div>
          </div>
        </article>
      </section>

      <section v-if="expired.length" class="list">
        <div class="list__head">
          <h2 class="list__title">Истёкшие</h2>
          <button class="btn btn--sm" type="button" @click="forgetAll">
            Очистить список
          </button>
        </div>
        <article v-for="r in expired" :key="r.code" class="rcard rcard--expired">
          <div class="rcard__body">
            <div class="rcard__title">
              <b>{{ r.medicine?.name ?? 'Препарат' }}</b>
              <span class="tag">Истекла</span>
            </div>
            <span class="muted">
              {{ r.code }} · {{ r.pharmacy?.chain }}, {{ r.pharmacy?.address }}
            </span>
            <div class="rcard__actions">
              <NuxtLink
                v-if="r.medicine"
                class="btn btn--sm btn--blue"
                :to="`/medicine/${r.medicine.slug}`"
              >Забронировать снова</NuxtLink>
              <button class="btn btn--sm" type="button" @click="forget(r.code)">
                Убрать
              </button>
            </div>
          </div>
        </article>
      </section>
    </template>
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

.card {
  background: var(--surface);
  border-radius: var(--r-card);
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.lookup__form {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.lookup__form .field {
  flex: 1;
  min-width: 180px;
  max-width: 260px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-weight: 600;
}

.list {
  display: flex;
  flex-direction: column;
  gap: var(--gap);
}

.list__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  padding: 8px 6px 0;
}

.list__title {
  font-size: 16px;
  font-weight: 700;
  color: var(--ink-muted);
}

.rcard {
  background: var(--surface);
  border-radius: var(--r-card);
  padding: 22px;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 20px;
  align-items: center;
}

.rcard--expired {
  grid-template-columns: minmax(0, 1fr);
  opacity: 0.75;
}

.rcard__side {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.rcard__code {
  font-size: 14px;
  letter-spacing: 0.06em;
  white-space: nowrap;
}

.rcard__body {
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 0;
  font-size: 14px;
}

.rcard__title {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.rcard__title b {
  font-size: 17px;
}

.rcard__where {
  font-size: 15px;
}

.rcard__actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 8px;
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

.linklike {
  font-size: 13px;
  font-weight: 600;
}

@media (width <= 560px) {
  .rcard {
    grid-template-columns: minmax(0, 1fr);
  }

  .rcard__side {
    flex-direction: row;
    justify-content: flex-start;
  }
}
</style>
