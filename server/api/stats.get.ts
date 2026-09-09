import { pharmacies } from '#shared/data/pharmacies'
import { medicines } from '#shared/data/medicines'
import { isOpenAt, offerPrice, offerStock } from '#shared/utils/catalog'

/**
 * Витринные цифры для главной: сколько аптек открыто прямо сейчас
 * и какой разброс цен по городу у популярных препаратов.
 */
export default defineEventHandler(() => {
  const now = new Date()

  const spreads = medicines.slice(0, 5).map((m) => {
    const prices = pharmacies
      .filter(p => offerStock(m, p) !== 'out')
      .map(p => offerPrice(m, p, m.forms[0]!.id))
    return {
      name: m.name,
      slug: m.slug,
      min: Math.min(...prices),
      max: Math.max(...prices),
    }
  })

  const maxRatio = Math.max(...spreads.map(s => s.max / s.min))

  return {
    pharmacies: pharmacies.length,
    medicines: medicines.length,
    openNow: pharmacies.filter(p => isOpenAt(p, now)).length,
    night: pharmacies.filter(p => p.is24h).length,
    delivery: pharmacies.filter(p => p.delivery).length,
    districts: new Set(pharmacies.map(p => p.district)).size,
    chains: new Set(pharmacies.map(p => p.chain)).size,
    spreads,
    maxSpread: maxRatio.toFixed(1).replace('.', ',') + '\u00D7',
  }
})
