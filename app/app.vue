<script setup lang="ts">
const config = useRuntimeConfig()
const siteUrl = String(config.public.siteUrl)

useHead({
  titleTemplate: title => (title ? title + ' — PharmaGO' : 'PharmaGO'),
})

useSeoMeta({
  ogSiteName: 'PharmaGO',
  ogType: 'website',
  ogLocale: 'ru_RU',
  twitterCard: 'summary_large_image',
})

// Организация в разметке Schema.org — чтобы поисковики понимали, что за сервис.
useHead({
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        'name': 'PharmaGO',
        'url': siteUrl,
        'inLanguage': 'ru-RU',
        'description':
          'Поиск лекарств по аптекам Бишкека: цены, наличие и ближайшая аптека на карте.',
        'potentialAction': {
          '@type': 'SearchAction',
          'target': siteUrl + '/search?q={search_term_string}',
          'query-input': 'required name=search_term_string',
        },
      }),
    },
  ],
})

// Восстанавливаем сохранённую геопозицию один раз при старте.
const { restore } = useUserLocation()
onMounted(restore)
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
