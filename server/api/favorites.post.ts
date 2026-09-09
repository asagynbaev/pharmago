import { pharmacies } from '#shared/data/pharmacies'
import { requireUser } from '../utils/auth'

/** Переключает аптеку в избранном. */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const body = await readBody(event)
  const id = String(body?.pharmacyId ?? '')

  if (!pharmacies.some(p => p.id === id)) {
    throw createError({ statusCode: 400, statusMessage: 'Аптека не найдена' })
  }

  const storage = useStorage<string[]>('favorites')
  const current = (await storage.getItem(user.id)) ?? []
  const next = current.includes(id)
    ? current.filter(x => x !== id)
    : [...current, id]

  await storage.setItem(user.id, next)
  return { ok: true, ids: next, added: next.includes(id) }
})
