<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const { user, displayName, avatarChar, hasName, logout } = useAuth()

const sections = [
  { to: '/account', label: 'Обзор', exact: true },
  { to: '/account/orders', label: 'Заказы' },
  { to: '/account/reservations', label: 'Брони' },
  { to: '/account/favorites', label: 'Избранные аптеки' },
  { to: '/account/profile', label: 'Профиль' },
]

const route = useRoute()
const isActive = (item: { to: string, exact?: boolean }) =>
  item.exact ? route.path === item.to : route.path.startsWith(item.to)

useSeoMeta({ robots: 'noindex' })
</script>

<template>
  <div class="page-body">
    <section class="head">
      <div class="head__who">
        <span class="head__avatar" aria-hidden="true">{{ avatarChar }}</span>
        <div>
          <h1 class="head__name">{{ displayName }}</h1>
          <!-- Без имени в заголовке уже стоит номер — второй раз не повторяем. -->
          <span v-if="hasName" class="muted">{{ user?.phone }}</span>
          <NuxtLink v-else to="/account/profile" class="head__hint">
            Добавить имя в профиле
          </NuxtLink>
        </div>
      </div>
      <button class="btn btn--sm" type="button" @click="logout">Выйти</button>
    </section>

    <div class="layout">
      <nav class="side" aria-label="Разделы кабинета">
        <NuxtLink
          v-for="item in sections"
          :key="item.to"
          :to="item.to"
          class="side__link"
          :class="{ 'side__link--active': isActive(item) }"
        >
          {{ item.label }}
        </NuxtLink>
      </nav>

      <main class="content">
        <NuxtPage />
      </main>
    </div>
  </div>
</template>

<style scoped>
.head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  padding: 24px 8px 4px;
}

.head__who {
  display: flex;
  align-items: center;
  gap: 14px;
}

.head__avatar {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: var(--night);
  color: #fff;
  display: grid;
  place-items: center;
  font-size: 22px;
  font-weight: 800;
  flex: none;
}

.head__name {
  font-size: clamp(22px, 3vw, 34px);
  overflow-wrap: anywhere;
}

.head__hint {
  font-size: 14px;
  font-weight: 600;
}

.layout {
  display: grid;
  grid-template-columns: minmax(0, 240px) minmax(0, 1fr);
  gap: var(--gap);
  align-items: start;
}

.side {
  background: var(--surface);
  border-radius: var(--r-card);
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  position: sticky;
  top: 12px;
}

.side__link {
  padding: 12px 14px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  color: var(--ink);
}

.side__link:hover {
  background: var(--bg);
  color: var(--ink);
}

.side__link--active,
.side__link--active:hover {
  background: var(--ink);
  color: #fff;
}

.content {
  display: flex;
  flex-direction: column;
  gap: var(--gap);
  min-width: 0;
}

@media (width <= 860px) {
  .layout {
    grid-template-columns: 1fr;
  }

  .side {
    position: static;
    flex-direction: row;
    flex-wrap: wrap;
  }
}
</style>
