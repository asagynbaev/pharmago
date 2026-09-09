import { pharmacies, BISHKEK_CENTER, districts, chains } from '#shared/data/pharmacies'
import { decoratePharmacy } from '#shared/utils/catalog'

/**
 * Список аптек с расстоянием до пользователя и статусом работы.
 * Открыто/закрыто считается на сервере, чтобы разметка после гидратации
 * совпадала с отрендеренной.
 */
export default defineEventHandler((event) => {
  const query = getQuery(event)

  const lat = Number(query.lat)
  const lng = Number(query.lng)
  const origin
    = Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : BISHKEK_CENTER

  const now = new Date()
  const search = String(query.q ?? '').trim().toLowerCase()
  const district = String(query.district ?? '')
  const onlyOpen = query.open === 'true'
  const onlyNight = query.night === 'true'
  const onlyDelivery = query.delivery === 'true'

  const items = pharmacies
    .map(p => decoratePharmacy(p, origin, now))
    .filter((p) => {
      if (search && !`${p.chain} ${p.address} ${p.district}`.toLowerCase().includes(search))
        return false
      if (district && district !== 'Все' && p.district !== district) return false
      if (onlyOpen && !p.isOpen) return false
      if (onlyNight && !p.is24h) return false
      if (onlyDelivery && !p.delivery) return false
      return true
    })
    .sort((a, b) => a.distance - b.distance)

  return {
    items,
    total: pharmacies.length,
    openNow: pharmacies.filter(p => decoratePharmacy(p, origin, now).isOpen).length,
    night: pharmacies.filter(p => p.is24h).length,
    districts,
    chains,
    origin,
  }
})
