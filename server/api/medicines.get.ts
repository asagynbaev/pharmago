import { medicines } from '#shared/data/medicines'
import { pharmacies } from '#shared/data/pharmacies'
import { offerPrice, offerStock } from '#shared/utils/catalog'

/**
 * Каталог препаратов: список с ценовым диапазоном по городу.
 * Поддерживает поиск, фильтр по категории, веществу и рецептурности.
 */
export default defineEventHandler((event) => {
  const query = getQuery(event)

  const q = String(query.q ?? '').trim().toLowerCase()
  const category = String(query.category ?? '')
  const substance = String(query.substance ?? '')
  const rx = String(query.rx ?? '')

  const items = medicines
    .map((m) => {
      // Цены берём только там, где препарат реально есть.
      const available = pharmacies.filter(p => offerStock(m, p) !== 'out')
      const prices = available.map(p => offerPrice(m, p, m.forms[0]!.id))

      return {
        slug: m.slug,
        name: m.name,
        substance: m.substance,
        manufacturer: m.manufacturer,
        category: m.category,
        prescription: m.prescription,
        forms: m.forms.length,
        pharmacies: available.length,
        minPrice: prices.length ? Math.min(...prices) : null,
        maxPrice: prices.length ? Math.max(...prices) : null,
      }
    })
    .filter((m) => {
      if (q && !`${m.name} ${m.substance} ${m.category}`.toLowerCase().includes(q))
        return false
      if (category && m.category !== category) return false
      if (substance && m.substance !== substance) return false
      if (rx === 'true' && !m.prescription) return false
      if (rx === 'false' && m.prescription) return false
      return true
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'ru'))

  return {
    items,
    total: medicines.length,
    categories: [...new Set(medicines.map(m => m.category))].sort((a, b) =>
      a.localeCompare(b, 'ru'),
    ),
    substances: [...new Set(medicines.map(m => m.substance))].sort((a, b) =>
      a.localeCompare(b, 'ru'),
    ),
  }
})
