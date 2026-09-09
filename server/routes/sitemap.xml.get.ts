import { medicines } from '#shared/data/medicines'

// «Мои брони» намеренно не индексируются — это личная страница.
const STATIC_PAGES = [
  '/', '/search', '/medicines', '/map', '/partners', '/about', '/contacts', '/terms',
]

/** Карта сайта: статические разделы плюс карточка каждого препарата. */
export default defineEventHandler((event) => {
  const base = String(useRuntimeConfig(event).public.siteUrl).replace(/\/$/, '')
  const today = new Date().toISOString().slice(0, 10)

  const urls = [
    ...STATIC_PAGES.map(path => ({ path, priority: path === '/' ? '1.0' : '0.8' })),
    ...medicines.map(m => ({ path: '/medicine/' + m.slug, priority: '0.6' })),
  ]

  const body = '<?xml version="1.0" encoding="UTF-8"?>\n'
    + '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    + urls
      .map(u =>
        '  <url><loc>' + base + u.path + '</loc>'
        + '<lastmod>' + today + '</lastmod>'
        + '<priority>' + u.priority + '</priority></url>',
      )
      .join('\n')
    + '\n</urlset>'

  setHeader(event, 'content-type', 'application/xml; charset=utf-8')
  return body
})
