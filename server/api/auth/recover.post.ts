import { getReservation } from '../../utils/reservations'
import { getOrder } from '../../utils/orders'
import { issueRecoveryTicket, maskPhone } from '../../utils/auth'

/**
 * «Не помню номер»: по коду брони или заказа подсказываем маскированный
 * номер и выдаём разовый билет, по которому можно запросить код входа.
 */
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const code = String(body?.code ?? '').trim().toUpperCase()

  if (code.length < 6) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Укажите код брони или заказа',
    })
  }

  const phone
    = (await getReservation(code))?.phone ?? (await getOrder(code))?.phone ?? null

  if (!phone) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Бронь или заказ с таким кодом не найдены',
    })
  }

  return {
    ok: true,
    maskedPhone: maskPhone(phone),
    recoveryToken: await issueRecoveryTicket(phone),
  }
})
