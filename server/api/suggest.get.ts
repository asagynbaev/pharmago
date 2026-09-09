import { matchMedicines } from '#shared/utils/catalog'

/** Подсказки для поисковой строки. */
export default defineEventHandler((event) => {
  const q = String(getQuery(event).q ?? '').trim()
  if (q.length < 2) return { items: [] }

  return {
    items: matchMedicines(q).slice(0, 7).map(m => ({
      slug: m.slug,
      name: m.name,
      substance: m.substance,
      category: m.category,
      prescription: m.prescription,
    })),
  }
})
