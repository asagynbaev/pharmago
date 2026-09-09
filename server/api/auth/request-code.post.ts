import { requirePhone } from '../../utils/validation'
import { issueOtp, maskPhone, readRecoveryTicket } from '../../utils/auth'
import { isWhatsAppConfigured, sendOtpViaWhatsApp } from '../../utils/whatsapp'

/** Шаг 1 входа: отправляем код подтверждения в WhatsApp. */
export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  // Вход после «не помню номер»: клиент присылает билет вместо номера.
  const ticket = body?.recoveryToken ? String(body.recoveryToken) : ''
  const recovered = ticket ? await readRecoveryTicket(ticket) : null

  if (ticket && !recovered) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Ссылка восстановления устарела — начните заново',
    })
  }

  const phone = recovered ?? requirePhone(body?.phone)

  const issued = await issueOtp(phone)

  if ('throttled' in issued) {
    throw createError({
      statusCode: 429,
      statusMessage: `Код уже отправлен. Повторить можно через ${issued.retryAfter} с`,
      data: { retryAfter: issued.retryAfter },
    })
  }

  const delivery = await sendOtpViaWhatsApp(phone, issued.code)

  if (delivery.error) {
    throw createError({
      statusCode: 502,
      statusMessage: 'Не удалось отправить код в WhatsApp. Попробуйте ещё раз',
    })
  }

  return {
    ok: true,
    // При восстановлении полный номер наружу не отдаём.
    phone: recovered ? '' : phone,
    maskedPhone: maskPhone(phone),
    recovered: Boolean(recovered),
    retryAfter: issued.retryAfter,
    delivered: delivery.delivered,
    // Только когда Cloud API не подключён — иначе кода в ответе нет.
    devCode: delivery.devCode,
    whatsappConfigured: isWhatsAppConfigured(),
  }
})
