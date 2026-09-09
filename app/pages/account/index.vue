<script setup lang="ts">
import { formatPrice, plural } from '#shared/utils/catalog'

const { data: orders } = await useFetch('/api/orders')
const { data: reservations } = await useFetch('/api/reservations')
const { data: favorites } = await useFetch('/api/favorites')

const activeOrders = computed(
  () => orders.value?.items.filter(o => o.status !== 'done' && o.status !== 'cancelled') ?? [],
)
const activeReservations = computed(
  () => reservations.value?.items.filter(r => !r.expired) ?? [],
)

const tiles = computed(() => [
  {
    to: '/account/orders',
    value: activeOrders.value.length,
    label: 'Активных заказов',
    hint: `всего ${orders.value?.items.length ?? 0}`,
    bg: 'var(--blue-soft)',
    fg: 'var(--blue-deep)',
  },
  {
    to: '/account/reservations',
    value: activeReservations.value.length,
    label: 'Действующих броней',
    hint: `всего ${reservations.value?.items.length ?? 0}`,
    bg: 'var(--green-soft)',
    fg: 'var(--green-deep)',
  },
  {
    to: '/account/favorites',
    value: favorites.value?.items.length ?? 0,
    label: 'Избранных аптек',
    hint: 'быстрый доступ',
    bg: 'var(--amber-soft)',
    fg: 'var(--amber-deep)',
  },
])

useSeoMeta({ title: 'Личный кабинет' })
</script>

<template>
  <div class="page-body">
    <section class="grid pg-stagger">
      <NuxtLink
        v-for="t in tiles"
        :key="t.to"
        :to="t.to"
        class="tile"
        :style="{ background: t.bg }"
      >
        <b class="tile__num num" :style="{ color: t.fg }">{{ t.value }}</b>
        <span class="tile__label">{{ t.label }}</span>
        <span class="tile__hint">{{ t.hint }}</span>
      </NuxtLink>
    </section>

    <section v-if="activeOrders.length" class="card">
      <div class="card__head">
        <h2 class="h-block">Заказ в работе</h2>
        <NuxtLink to="/account/orders" class="card__more">Все заказы →</NuxtLink>
      </div>
      <NuxtLink
        v-for="o in activeOrders.slice(0, 2)"
        :key="o.code"
        to="/account/orders"
        class="row"
      >
        <div class="row__main">
          <b>{{ o.medicine?.name }}</b>
          <span class="muted">
            {{ o.pharmacy?.chain }} · {{ o.code }} · {{ o.quantity }}
            {{ plural(o.quantity, 'упаковка', 'упаковки', 'упаковок') }}
          </span>
        </div>
        <div class="row__side">
          <span class="tag tag--night">{{ o.statusLabel }}</span>
          <b class="num">{{ formatPrice(o.total) }} сом</b>
        </div>
      </NuxtLink>
    </section>

    <section v-if="activeReservations.length" class="card">
      <div class="card__head">
        <h2 class="h-block">Действующие брони</h2>
        <NuxtLink to="/account/reservations" class="card__more">Все брони →</NuxtLink>
      </div>
      <NuxtLink
        v-for="r in activeReservations.slice(0, 2)"
        :key="r.code"
        to="/account/reservations"
        class="row"
      >
        <div class="row__main">
          <b>{{ r.medicine?.name }}</b>
          <span class="muted">{{ r.pharmacy?.chain }}, {{ r.pharmacy?.address }}</span>
        </div>
        <div class="row__side">
          <span class="tag tag--in">{{ r.code }}</span>
          <b class="num">{{ formatPrice(r.price) }} сом</b>
        </div>
      </NuxtLink>
    </section>

    <section
      v-if="!activeOrders.length && !activeReservations.length"
      class="empty"
    >
      <PgEmpty :size="150" />
      <b>Пока пусто</b>
      <p>Найдите лекарство — забронируйте или закажите доставку.</p>
      <NuxtLink to="/search" class="btn btn--primary">Найти лекарство</NuxtLink>
    </section>
  </div>
</template>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(180px, 100%), 1fr));
  gap: var(--gap);
}

.tile {
  border-radius: var(--r-card);
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: var(--ink);
  min-height: 150px;
}

.tile:hover {
  color: var(--ink);
  box-shadow: var(--shadow-md);
}

.tile__num {
  font-size: 40px;
  font-weight: 800;
}

.tile__label {
  font-size: 15px;
  font-weight: 600;
}

.tile__hint {
  font-size: 13px;
  opacity: 0.7;
  margin-top: auto;
}

.card {
  background: var(--surface);
  border-radius: var(--r-card);
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.card__head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
  flex-wrap: wrap;
}

.card__more {
  font-size: 14px;
  font-weight: 600;
}

.row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  background: var(--bg);
  border-radius: var(--r-sm);
  padding: 14px 16px;
  color: var(--ink);
}

.row:hover {
  background: var(--bg-2);
  color: var(--ink);
}

.row__main {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
  font-size: 13px;
}

.row__main b {
  font-size: 16px;
}

.row__side {
  display: flex;
  align-items: center;
  gap: 10px;
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
