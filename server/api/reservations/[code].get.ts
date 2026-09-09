import { decorateReservation, getReservation } from '../../utils/reservations'
import { currentUser } from '../../utils/auth'

/** Статус брони по коду — им пользуется страница «Мои брони». */
export default defineEventHandler(async (event) => {
  const code = getRouterParam(event, 'code')!
  const reservation = await getReservation(code)

  if (!reservation) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Бронь с таким кодом не найдена',
    })
  }

  // Бронь, оформленную до входа, привязываем к аккаунту.
  const user = await currentUser(event)
  if (user && !reservation.userId) {
    reservation.userId = user.id
    await useStorage('reservations').setItem(reservation.code, reservation)
  }

  return decorateReservation(reservation)
})
