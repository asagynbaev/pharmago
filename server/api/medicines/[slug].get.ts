import { pharmacies, BISHKEK_CENTER } from '#shared/data/pharmacies'
import { medicineBySlug, findAnalogs } from '#shared/data/medicines'
import {
  buildOffers,
  decoratePharmacy,
  median,
  offerPrice,
  offerStock,
  stockLabel,
} from '#shared/utils/catalog'
import type { OfferView } from '#shared/types'

/** Карточка препарата: описание, цены по аптекам и аналоги. */
export default defineEventHandler((event) => {
  const slug = getRouterParam(event, 'slug')!
  const medicine = medicineBySlug.get(slug)

  if (!medicine) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Препарат не найден',
    })
  }

  const query = getQuery(event)
  const formId = query.form ? String(query.form) : undefined
  const sort = query.sort === 'distance' ? 'distance' : 'price'

  const lat = Number(query.lat)
  const lng = Number(query.lng)
  const origin
    = Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : BISHKEK_CENTER

  const now = new Date()
  const form = medicine.forms.find(f => f.id === formId) ?? medicine.forms[0]!
  const byId = new Map(pharmacies.map(p => [p.id, p]))

  const offers: OfferView[] = buildOffers(slug, pharmacies, form.id, now)
    .map(offer => ({
      ...offer,
      stockLabel: stockLabel(offer.stock),
      pharmacy: decoratePharmacy(byId.get(offer.pharmacyId)!, origin, now),
    }))
    .filter(o => o.stock !== 'out')
    .sort((a, b) =>
      sort === 'price'
        ? a.price - b.price
        : a.pharmacy.distance - b.pharmacy.distance,
    )

  const prices = offers.map(o => o.price)

  // Для аналогов показываем минимальную цену по городу.
  const analogs = findAnalogs(slug).map((a) => {
    const candidates = pharmacies
      .filter(p => offerStock(a, p) !== 'out')
      .map(p => offerPrice(a, p, a.forms[0]!.id))
    return {
      slug: a.slug,
      name: a.name,
      form: a.forms[0]!.label,
      substance: a.substance,
      minPrice: candidates.length ? Math.min(...candidates) : null,
    }
  })

  return {
    medicine,
    form,
    offers,
    analogs,
    stats: prices.length
      ? {
          min: Math.min(...prices),
          max: Math.max(...prices),
          median: median(prices),
          count: offers.length,
        }
      : null,
  }
})
