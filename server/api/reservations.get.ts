import { requireUser } from '../utils/auth'
import { decorateReservation, listReservations } from '../utils/reservations'

/** Брони текущего пользователя. */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  return { items: (await listReservations(user.id)).map(decorateReservation) }
})
