import { pharmacies, BISHKEK_CENTER, districts } from '#shared/data/pharmacies'
import { medicineBySlug } from '#shared/data/medicines'
import {
  buildOffers,
  decoratePharmacy,
  matchMedicines,
  median,
  stockLabel,
} from '#shared/utils/catalog'
import type { OfferView } from '#shared/types'

/**
 * Поиск препарата по аптекам города.
 *
 * Принимает либо slug конкретного препарата, либо свободный запрос —
 * тогда берётся лучшее совпадение, а остальные возвращаются как варианты.
 */
export default defineEventHandler((event) => {
  const query = getQuery(event)

  const q = String(query.q ?? '').trim()
  const slug = String(query.slug ?? '')
  const formId = query.form ? String(query.form) : undefined
  const sort = query.sort === 'distance' ? 'distance' : 'price'
  const district = String(query.district ?? '')
  const onlyStock = query.stock !== 'false'
  const onlyNight = query.night === 'true'
  const onlyDelivery = query.delivery === 'true'

  const lat = Number(query.lat)
  const lng = Number(query.lng)
  const origin
    = Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : BISHKEK_CENTER

  const matches = slug ? [] : matchMedicines(q)
  const medicine = slug ? medicineBySlug.get(slug) : matches[0]

  if (!medicine) {
    return {
      medicine: null,
      // Форма всегда присутствует в ответе, чтобы у клиента был один тип.
      form: null,
      suggestions: matchMedicines(q).slice(0, 6).map(m => ({
        slug: m.slug,
        name: m.name,
        substance: m.substance,
      })),
      offers: [] as OfferView[],
      alternatives: [] as { slug: string, name: string, substance: string }[],
      stats: null,
      districts,
    }
  }

  const now = new Date()
  const form = medicine.forms.find(f => f.id === formId) ?? medicine.forms[0]!
  const rawOffers = buildOffers(medicine.slug, pharmacies, form.id, now)
  const byId = new Map(pharmacies.map(p => [p.id, p]))

  const all: OfferView[] = rawOffers.map(offer => ({
    ...offer,
    stockLabel: stockLabel(offer.stock),
    pharmacy: decoratePharmacy(byId.get(offer.pharmacyId)!, origin, now),
  }))

  const offers = all
    .filter((o) => {
      if (onlyStock && o.stock === 'out') return false
      if (onlyNight && !o.pharmacy.is24h) return false
      if (onlyDelivery && !o.pharmacy.delivery) return false
      if (district && district !== 'Все' && o.pharmacy.district !== district)
        return false
      return true
    })
    .sort((a, b) =>
      sort === 'price'
        ? a.price - b.price || a.pharmacy.distance - b.pharmacy.distance
        : a.pharmacy.distance - b.pharmacy.distance || a.price - b.price,
    )

  const available = all.filter(o => o.stock !== 'out')
  const prices = available.map(o => o.price)

  return {
    medicine: {
      slug: medicine.slug,
      name: medicine.name,
      substance: medicine.substance,
      manufacturer: medicine.manufacturer,
      category: medicine.category,
      prescription: medicine.prescription,
      forms: medicine.forms,
    },
    form: form as typeof form | null,
    offers,
    // Другие препараты, подошедшие под запрос — показываем как «может быть, вы искали».
    alternatives: matches.slice(1, 5).map(m => ({
      slug: m.slug,
      name: m.name,
      substance: m.substance,
    })),
    suggestions: [] as { slug: string, name: string, substance: string }[],
    stats: prices.length
      ? {
          min: Math.min(...prices),
          max: Math.max(...prices),
          median: median(prices),
          count: available.length,
          total: all.length,
        }
      : null,
    districts,
  }
})
