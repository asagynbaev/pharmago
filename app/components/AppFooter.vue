<script setup lang="ts">
const columns = [
  {
    title: 'Сервис',
    links: [
      { to: '/search', label: 'Поиск лекарств' },
      { to: '/medicines', label: 'Каталог препаратов' },
      { to: '/account/orders', label: 'Мои заказы' },
      { to: '/reservations', label: 'Мои брони' },
      { to: '/map', label: 'Карта аптек' },
      { to: '/map?night=true', label: 'Дежурные аптеки' },
      { to: '/medicine/paracetamol-500', label: 'Аналоги препаратов' },
      { to: '/#how', label: 'Как работает' },
    ],
  },
  {
    title: 'Аптекам',
    links: [
      { to: '/partners', label: 'Подключить аптеку' },
      { to: '/partners#tariffs', label: 'Тарифы' },
      { to: '/partners#integration', label: 'Интеграция 1С' },
      { to: '/partners#apply', label: 'Оставить заявку' },
    ],
  },
  {
    title: 'Компания',
    links: [
      { to: '/about', label: 'О PharmaGO' },
      { to: '/contacts', label: 'Контакты' },
      { to: '/about#press', label: 'Пресса' },
      { to: '/#faq', label: 'Вопросы и ответы' },
    ],
  },
  {
    title: 'Правила',
    links: [
      { to: '/terms#terms', label: 'Пользовательское соглашение' },
      { to: '/terms#privacy', label: 'Политика конфиденциальности' },
      { to: '/terms#booking', label: 'Правила бронирования' },
      { to: '/terms#prices', label: 'Об актуальности цен' },
    ],
  },
]

const year = new Date().getFullYear()
</script>

<template>
  <footer class="ftr">
    <div class="ftr__grid">
      <div class="ftr__about">
        <NuxtLink to="/" class="ftr__brand">
          <PharmaLogo variant="footer" :width="52" :height="40" />
          <span class="ftr__word">Pharma<span class="ftr__go">GO</span></span>
        </NuxtLink>
        <p class="ftr__tagline">
          Поиск лекарств по всем аптекам Бишкека. Цены, наличие и ближайшая
          аптека — в одном месте.
        </p>
        <div class="ftr__stores">
          <NuxtLink to="/#app" class="ftr__store">App Store</NuxtLink>
          <NuxtLink to="/#app" class="ftr__store">Google Play</NuxtLink>
        </div>
      </div>

      <div v-for="col in columns" :key="col.title" class="ftr__col">
        <h2 class="ftr__title">{{ col.title }}</h2>
        <NuxtLink
          v-for="link in col.links"
          :key="link.to + link.label"
          :to="link.to"
          class="ftr__link"
        >
          {{ link.label }}
        </NuxtLink>
      </div>

      <div class="ftr__col">
        <h2 class="ftr__title">Контакты</h2>
        <a href="tel:+996312000000" class="ftr__phone">+996 312 00-00-00</a>
        <a href="mailto:hello@pharmago.kg" class="ftr__link">hello@pharmago.kg</a>
        <span class="ftr__addr">
          Бишкек, ул. Исанова, 79<br>Пн–Пт, 9:00–18:00
        </span>
        <div class="ftr__social">
          <a href="https://instagram.com" rel="noopener noreferrer" target="_blank">Instagram</a>
          <a href="https://telegram.org" rel="noopener noreferrer" target="_blank">Telegram</a>
        </div>
      </div>
    </div>

    <div class="ftr__bottom">
      <span>© {{ year }} PharmaGO · ОсОО «ФармаГо», Бишкек, Кыргызстан</span>
      <span>
        Информация на сайте не является рекламой лекарственных средств
        и не заменяет консультацию врача.
      </span>
    </div>
  </footer>
</template>

<style scoped>
.ftr {
  background: var(--night);
  border-radius: var(--r-section);
  padding: clamp(32px, 4vw, 56px) clamp(24px, 4vw, 48px) 32px;
  display: flex;
  flex-direction: column;
  gap: 44px;
  color: var(--on-night);
}

.ftr__grid {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) repeat(auto-fit, minmax(150px, 1fr));
  gap: 36px 28px;
}

.ftr__about {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.ftr__brand {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #fff;
}

.ftr__brand:hover {
  color: #fff;
}

.ftr__word {
  font-weight: 800;
  font-size: 24px;
  letter-spacing: -0.02em;
}

.ftr__go {
  color: var(--blue-light);
}

.ftr__tagline {
  font-size: 14px;
  line-height: 1.55;
  max-width: 320px;
}

.ftr__stores {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.ftr__store {
  padding: 10px 16px;
  border-radius: 12px;
  background: rgb(255 255 255 / 8%);
  color: #fff;
  font-weight: 600;
  font-size: 13px;
}

.ftr__store:hover {
  background: rgb(255 255 255 / 16%);
  color: #fff;
}

.ftr__col {
  display: flex;
  flex-direction: column;
  gap: 12px;
  font-size: 14px;
}

.ftr__title {
  color: #fff;
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-bottom: 4px;
  font-weight: 700;
}

.ftr__link {
  color: var(--on-night);
}

.ftr__link:hover {
  color: #fff;
}

.ftr__phone {
  color: #fff;
  font-weight: 600;
}

.ftr__phone:hover {
  color: var(--blue-light);
}

.ftr__addr {
  line-height: 1.5;
}

.ftr__social {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 4px;
}

.ftr__social a {
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid rgb(255 255 255 / 14%);
  color: var(--on-night);
  font-size: 12px;
  font-weight: 600;
}

.ftr__social a:hover {
  color: #fff;
}

.ftr__bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  padding-top: 24px;
  border-top: 1px solid rgb(255 255 255 / 10%);
  font-size: 12px;
  color: #6b7f92;
}
</style>
