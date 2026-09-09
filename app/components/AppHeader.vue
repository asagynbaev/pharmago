<script setup lang="ts">
const nav = [
  { to: '/', label: 'Главная' },
  { to: '/search', label: 'Поиск' },
  { to: '/medicines', label: 'Каталог' },
  { to: '/map', label: 'Аптеки' },
  { to: '/partners', label: 'Аптекам' },
  { to: '/about', label: 'О нас' },
  { to: '/contacts', label: 'Контакты' },
]

const route = useRoute()
const open = ref(false)

const { isAuthenticated, displayName } = useAuth()

// Меню не должно пережить переход на другую страницу.
watch(() => route.fullPath, () => { open.value = false })

// Пока открыт мобильный лист, страница под ним не скроллится.
watch(open, (isOpen) => {
  if (import.meta.client) document.body.style.overflow = isOpen ? 'hidden' : ''
})
onBeforeUnmount(() => {
  if (import.meta.client) document.body.style.overflow = ''
})

const isActive = (to: string) =>
  to === '/' ? route.path === '/' : route.path.startsWith(to)
</script>

<template>
  <header class="hdr">
    <NuxtLink to="/" class="hdr__brand" aria-label="PharmaGO — на главную">
      <PharmaLogo :width="46" :height="36" />
      <span class="hdr__word">Pharma<span class="hdr__go">GO</span></span>
    </NuxtLink>

    <nav class="hdr__nav" aria-label="Основная навигация">
      <NuxtLink
        v-for="item in nav"
        :key="item.to"
        :to="item.to"
        class="hdr__link"
        :class="{ 'hdr__link--active': isActive(item.to) }"
        :aria-current="isActive(item.to) ? 'page' : undefined"
      >
        {{ item.label }}
      </NuxtLink>
    </nav>

    <div class="hdr__side">
      <NuxtLink
        v-if="isAuthenticated"
        to="/account"
        class="btn btn--sm hdr__account hdr__account--user"
      >
        <span class="hdr__avatar" aria-hidden="true">
          {{ (displayName[0] ?? 'П').toUpperCase() }}
        </span>
        Кабинет
      </NuxtLink>
      <NuxtLink v-else to="/login" class="btn btn--sm hdr__account">Войти</NuxtLink>

      <NuxtLink to="/#app" class="btn btn--blue hdr__cta">Приложение</NuxtLink>
      <button
        class="hdr__burger"
        type="button"
        :aria-expanded="open"
        aria-controls="mobile-nav"
        aria-label="Меню"
        @click="open = !open"
      >
        <span :class="{ 'is-open': open }" />
      </button>
    </div>

    <Teleport to="body">
      <Transition name="sheet">
        <div v-if="open" class="sheet" @click.self="open = false">
          <nav id="mobile-nav" class="sheet__panel" aria-label="Мобильная навигация">
            <div class="sheet__head">
              <span class="hdr__word">Pharma<span class="hdr__go">GO</span></span>
              <button
                class="sheet__close"
                type="button"
                aria-label="Закрыть меню"
                @click="open = false"
              >
                &times;
              </button>
            </div>
            <NuxtLink
              v-for="item in nav"
              :key="item.to"
              :to="item.to"
              class="sheet__link"
              :class="{ 'sheet__link--active': isActive(item.to) }"
            >
              {{ item.label }}
            </NuxtLink>
            <NuxtLink v-if="isAuthenticated" to="/account" class="sheet__link">
              Личный кабинет
            </NuxtLink>
            <NuxtLink v-else to="/login" class="sheet__link">Войти</NuxtLink>
            <NuxtLink to="/#app" class="btn btn--blue sheet__cta">
              Скачать приложение
            </NuxtLink>
          </nav>
        </div>
      </Transition>
    </Teleport>
  </header>
</template>

<style scoped>
.hdr {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  padding: 10px 8px;
}

.hdr__brand {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--ink);
}

.hdr__brand:hover {
  color: var(--ink);
}

.hdr__word {
  font-weight: 800;
  font-size: 22px;
  letter-spacing: -0.02em;
}

.hdr__go {
  color: var(--blue);
}

.hdr__nav {
  display: flex;
  gap: 2px;
  background: var(--surface);
  border-radius: 24px;
  padding: 5px;
  box-shadow: var(--shadow-sm);
  justify-self: center;
  max-width: 100%;
}

.hdr__link {
  padding: 8px 14px;
  border-radius: var(--r-pill);
  font-size: 14px;
  font-weight: 500;
  color: var(--ink);
  white-space: nowrap;
  transition: background 0.15s var(--ease), color 0.15s var(--ease);
}

.hdr__link:hover {
  background: var(--bg-2);
  color: var(--ink);
}

.hdr__link--active {
  background: var(--ink);
  color: #fff;
  font-weight: 600;
}

.hdr__link--active:hover {
  background: var(--ink);
  color: #fff;
}

.hdr__side {
  display: flex;
  align-items: center;
  gap: 8px;
}

.hdr__cta {
  padding: 11px 20px;
  font-size: 14px;
}

.hdr__account {
  background: var(--surface);
  padding: 11px 18px;
}

/* Слева стоит аватар, поэтому отступ с этой стороны меньше. */
.hdr__account--user {
  padding: 8px 16px 8px 8px;
  gap: 8px;
}

.hdr__account:hover {
  background: var(--bg-2);
}

.hdr__avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--night);
  color: #fff;
  display: grid;
  place-items: center;
  font-size: 13px;
  font-weight: 700;
  flex: none;
}

.hdr__burger {
  display: none;
  width: 44px;
  height: 44px;
  border: 0;
  border-radius: 14px;
  background: var(--surface);
  cursor: pointer;
  position: relative;
  box-shadow: var(--shadow-sm);
}

/* Три полоски: средняя — сам элемент, крайние — псевдоэлементы. */
.hdr__burger span,
.hdr__burger span::before,
.hdr__burger span::after {
  content: '';
  position: absolute;
  left: 50%;
  width: 18px;
  height: 2px;
  border-radius: 2px;
  background: var(--ink);
  transform: translateX(-50%);
  transition: transform 0.2s var(--ease), opacity 0.15s var(--ease);
}

.hdr__burger span {
  top: 50%;
  margin-top: -1px;
}

.hdr__burger span::before {
  top: -6px;
  left: 0;
  transform: none;
}

.hdr__burger span::after {
  top: 6px;
  left: 0;
  transform: none;
}

.hdr__burger span.is-open {
  transform: translateX(-50%) rotate(45deg);
}

.hdr__burger span.is-open::before {
  opacity: 0;
}

.hdr__burger span.is-open::after {
  transform: rotate(-90deg);
  top: 0;
}

/* Мобильный лист */
.sheet {
  position: fixed;
  inset: 0;
  z-index: 120;
  background: rgb(11 28 46 / 45%);
  backdrop-filter: blur(2px);
  display: flex;
  justify-content: flex-end;
}

.sheet__panel {
  width: min(320px, 86vw);
  height: 100%;
  background: var(--surface);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow-y: auto;
}

.sheet__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.sheet__close {
  width: 40px;
  height: 40px;
  border: 0;
  border-radius: 12px;
  background: var(--bg);
  font-size: 26px;
  line-height: 1;
  cursor: pointer;
  color: var(--ink);
}

.sheet__link {
  padding: 14px 16px;
  border-radius: var(--r-sm);
  font-size: 16px;
  font-weight: 600;
  color: var(--ink);
}

.sheet__link:hover {
  background: var(--bg);
  color: var(--ink);
}

.sheet__link--active {
  background: var(--ink);
  color: #fff;
}

.sheet__link--active:hover {
  background: var(--ink);
  color: #fff;
}

.sheet__cta {
  margin-top: 12px;
}

.sheet-enter-active,
.sheet-leave-active {
  transition: opacity 0.2s var(--ease);
}

.sheet-enter-active .sheet__panel,
.sheet-leave-active .sheet__panel {
  transition: transform 0.25s var(--ease);
}

.sheet-enter-from,
.sheet-leave-to {
  opacity: 0;
}

.sheet-enter-from .sheet__panel,
.sheet-leave-to .sheet__panel {
  transform: translateX(100%);
}

@media (width <= 980px) {
  .hdr__nav {
    display: none;
  }

  .hdr__burger {
    display: block;
  }

  .hdr {
    grid-template-columns: auto 1fr auto;
  }
}

@media (width <= 1120px) {
  .hdr__account {
    display: none;
  }
}

@media (width <= 560px) {
  .hdr__cta {
    display: none;
  }
}
</style>
