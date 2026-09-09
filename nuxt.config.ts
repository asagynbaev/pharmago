export default defineNuxtConfig({
  compatibilityDate: '2026-09-09',
  future: { compatibilityVersion: 4 },
  devtools: { enabled: true },

  modules: ['@vueuse/nuxt'],

  css: ['~/assets/css/main.css', '~/assets/css/animations.css'],

  runtimeConfig: {
    // WhatsApp Cloud API для кодов входа. Без этих значений вход работает
    // в демо-режиме: код пишется в лог сервера и показывается в интерфейсе.
    whatsappToken: '',
    whatsappPhoneNumberId: '',
    whatsappTemplate: 'pharmago_otp',
    whatsappLocale: 'ru',
    whatsappApiVersion: 'v21.0',

    public: {
      googleMapsApiKey: '',
      googleMapsMapId: '',
      siteUrl: 'https://pharmago.kg',
    },
  },

  app: {
    head: {
      htmlAttrs: { lang: 'ru' },
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'theme-color', content: '#0B1C2E' },
      ],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Onest:wght@400;500;600;700;800&display=swap',
        },
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
      ],
    },
    pageTransition: { name: 'page', mode: 'out-in' },
  },

  nitro: {
    compressPublicAssets: true,
    storage: {
      // Данные переживают перезапуск сервера. В бою здесь были бы
      // база и redis, драйвер меняется одной строкой.
      reservations: { driver: 'fs', base: './.data/reservations' },
      orders: { driver: 'fs', base: './.data/orders' },
      users: { driver: 'fs', base: './.data/users' },
      sessions: { driver: 'fs', base: './.data/sessions' },
      favorites: { driver: 'fs', base: './.data/favorites' },
      // Коды и билеты восстановления живут минутами — держим в памяти.
      otp: { driver: 'memory' },
      recovery: { driver: 'memory' },
    },
  },

  typescript: { strict: true },
})
