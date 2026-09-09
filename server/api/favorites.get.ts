import { pharmacies, BISHKEK_CENTER } from '#shared/data/pharmacies'
import { decoratePharmacy } from '#shared/utils/catalog'
import { requireUser } from '../utils/auth'

/** Избранные аптеки пользователя. */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const query = getQuery(event)

  const lat = Number(query.lat)
  const lng = Number(query.lng)
  const origin
    = Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : BISHKEK_CENTER

  const ids = (await useStorage<string[]>('favorites').getItem(user.id)) ?? []
  const now = new Date()

  return {
    ids,
    items: pharmacies
      .filter(p => ids.includes(p.id))
      .map(p => decoratePharmacy(p, origin, now))
      .sort((a, b) => a.distance - b.distance),
  }
})
