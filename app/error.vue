<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()

const isNotFound = computed(() => props.error.statusCode === 404)

useSeoMeta({
  title: computed(() => (isNotFound.value ? 'Страница не найдена' : 'Ошибка')),
  robots: 'noindex',
})

// clearError сбрасывает состояние ошибки и уводит на рабочую страницу.
const go = (redirect: string) => clearError({ redirect })
const goHome = () => go('/')
</script>

<template>
  <div class="page">
    <AppHeader />

    <main class="err">
      <PharmaLogo variant="light" :width="120" :height="94" class="err__mark" />

      <!-- 404 — «ничего не нашлось», остальное чаще всего проблема связи. -->
      <PgEmpty v-if="isNotFound" :size="150" color="#3B5473" class="err__art" />
      <PgOffline v-else :size="150" class="err__art" />

      <span class="err__code num">{{ error.statusCode }}</span>
      <h1 class="h-section">
        {{ isNotFound ? 'Такой страницы нет' : 'Что-то пошло не так' }}
      </h1>
      <p class="err__lead">
        {{ isNotFound
          ? 'Возможно, препарат убрали из каталога или ссылка устарела. Попробуйте найти лекарство через поиск.'
          : error.statusMessage || 'Мы уже разбираемся. Попробуйте обновить страницу через минуту.' }}
      </p>

      <div class="err__actions">
        <button class="btn btn--primary" type="button" @click="goHome">
          На главную
        </button>
        <button class="btn btn--ghost-light" type="button" @click="go('/search')">
          Поиск лекарств
        </button>
        <button class="btn btn--ghost-light" type="button" @click="go('/map')">
          Аптеки на карте
        </button>
      </div>
    </main>

    <AppFooter />
  </div>
</template>

<style scoped>
.err {
  position: relative;
  overflow: hidden;
  background: var(--night);
  border-radius: var(--r-section);
  padding: clamp(48px, 8vw, 96px) clamp(24px, 4vw, 48px);
  display: flex;
  flex-direction: column;
  gap: 18px;
  align-items: flex-start;
  color: #fff;
}

.err__mark {
  position: absolute;
  right: -20px;
  top: -20px;
  width: min(45%, 420px);
  height: auto;
  opacity: 0.12;
  pointer-events: none;
}

.err__art {
  margin-bottom: 4px;
}

.err__code {
  font-size: 15px;
  font-weight: 700;
  color: var(--green);
  letter-spacing: 0.08em;
}

.err h1 {
  color: #fff;
}

.err__lead {
  font-size: 17px;
  line-height: 1.5;
  color: var(--on-night-bright);
  max-width: 520px;
}

.err__actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 8px;
}
</style>
