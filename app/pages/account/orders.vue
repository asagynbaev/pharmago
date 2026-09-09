<script setup lang="ts">
import { formatPrice, plural } from '#shared/utils/catalog'

const toast = useToast()
const { data, refresh, status } = await useFetch('/api/orders')

const items = computed(() => data.value?.items ?? [])
const cancelling = ref('')

async function cancel(code: string) {
  cancelling.value = code
  try {
    await $fetch(`/api/orders/${encodeURIComponent(code)}/cancel`, { method: 'POST' })
    toast.success('Заказ отменён', code)
    await refresh()
  }
  catch (e) {
    const err = e as { data?: { statusMessage?: string } }
    toast.error('Не удалось отменить', err.data?.statusMessage ?? 'Попробуйте позже')
  }
  finally {
    cancelling.value = ''
  }
}

/** Порядок этапов для полосы прогресса. */
const STEPS = ['new', 'collecting', 'delivering', 'done'] as const
const stepIndex = (s: string) => STEPS.indexOf(s as typeof STEPS[number])

const timeAt = (iso: string) =>
  new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })

const dateAt = (iso: string) =>
  new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })

const routeLink = (p: { lat: number, lng: number }) =>
  `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`

useSeoMeta({ title: 'Мои заказы' })
</script>

<template>
  <div class="page-body">
    <template v-if="status === 'pending' && !items.length">
      <PgSkeletonCard v-for="i in 2" :key="i" />
    </template>

    <div v-else-if="!items.length" class="empty">
      <PgEmpty :size="150" />
      <b>Заказов пока нет</b>
      <p>Часть аптек доставляет по Бишкеку за 1–2 часа — ищите значок «Доставка».</p>
      <NuxtLink to="/search" class="btn btn--primary">Найти лекарство</NuxtLink>
    </div>

    <article v-for="o in items" v-else :key="o.code" class="order">
      <div class="order__head">
        <div class="order__title">
          <b>{{ o.medicine?.name }}</b>
          <span
            class="tag"
            :class="{
              'tag--night': o.status === 'delivering',
              'tag--in': o.status === 'done',
              'tag--low': o.status === 'collecting',
              'tag--out': o.status === 'cancelled',
            }"
          >{{ o.statusLabel }}</span>
        </div>
        <b class="num order__total">{{ formatPrice(o.total) }} сом</b>
      </div>

      <span class="muted">
        {{ o.code }} · {{ o.medicine?.form }} · {{ o.quantity }}
        {{ plural(o.quantity, 'упаковка', 'упаковки', 'упаковок') }} ·
        от {{ dateAt(o.createdAt) }}
      </span>

      <!-- Прогресс: принят → собирается → в пути → доставлен -->
      <ol v-if="o.status !== 'cancelled'" class="track">
        <li
          v-for="(label, i) in ['Принят', 'Собирается', 'В пути', 'Доставлен']"
          :key="label"
          class="track__step"
          :class="{ 'track__step--done': i <= stepIndex(o.status) }"
        >
          <span class="track__dot" />
          <span class="track__label">{{ label }}</span>
        </li>
      </ol>

      <dl class="facts">
        <div>
          <dt>Аптека</dt>
          <dd>{{ o.pharmacy?.chain }}, {{ o.pharmacy?.address }}</dd>
        </div>
        <div>
          <dt>Адрес доставки</dt>
          <dd>{{ o.address }}</dd>
        </div>
        <div>
          <dt>{{ o.status === 'done' ? 'Доставлен к' : 'Ожидается к' }}</dt>
          <dd>{{ timeAt(o.etaAt) }}</dd>
        </div>
        <div>
          <dt>Состав</dt>
          <dd>
            {{ formatPrice(o.price) }} × {{ o.quantity }} +
            доставка {{ formatPrice(o.deliveryFee) }}
          </dd>
        </div>
      </dl>

      <p v-if="o.comment" class="order__comment">«{{ o.comment }}»</p>

      <div class="order__actions">
        <a
          v-if="o.pharmacy"
          class="btn btn--sm"
          :href="`tel:${o.pharmacy.phone.replace(/\s/g, '')}`"
        >Позвонить в аптеку</a>
        <a
          v-if="o.pharmacy"
          class="btn btn--sm"
          :href="routeLink(o.pharmacy)"
          target="_blank"
          rel="noopener noreferrer"
        >Аптека на карте</a>
        <NuxtLink
          v-if="o.medicine"
          class="btn btn--sm"
          :to="`/medicine/${o.medicine.slug}`"
        >Заказать снова</NuxtLink>
        <button
          v-if="o.canCancel"
          class="btn btn--sm order__cancel"
          type="button"
          :disabled="cancelling === o.code"
          @click="cancel(o.code)"
        >
          <template v-if="cancelling === o.code">Отменяем<PgDots /></template>
          <template v-else>Отменить</template>
        </button>
      </div>
    </article>
  </div>
</template>

<style scoped>
.order {
  background: var(--surface);
  border-radius: var(--r-card);
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  font-size: 14px;
}

.order__head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
  flex-wrap: wrap;
}

.order__title {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.order__title b {
  font-size: 18px;
}

.order__total {
  font-size: 20px;
}

.track {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
  list-style: none;
  margin: 8px 0;
  padding: 0;
}

.track__step {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
  color: var(--ink-muted);
}

.track__dot {
  height: 4px;
  border-radius: 2px;
  background: var(--line);
}

.track__step--done .track__dot {
  background: var(--green);
}

.track__step--done .track__label {
  color: var(--ink);
  font-weight: 600;
}

.facts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(190px, 100%), 1fr));
  gap: 10px 20px;
  margin: 0;
}

.facts dt {
  color: var(--on-night-dim);
  font-size: 12px;
  margin-bottom: 2px;
}

.facts dd {
  margin: 0;
  font-weight: 600;
}

.order__comment {
  background: var(--bg);
  border-radius: var(--r-sm);
  padding: 10px 14px;
  color: var(--ink-muted);
  font-style: italic;
}

.order__actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 4px;
}

.order__cancel {
  color: var(--pink-deep);
}

.empty {
  background: var(--surface);
  border-radius: var(--r-card);
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
