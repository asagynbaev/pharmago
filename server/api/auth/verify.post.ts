import { requirePhone } from '../../utils/validation'
import {
  checkOtp,
  consumeRecoveryTicket,
  createSession,
  readRecoveryTicket,
  upsertUser,
} from '../../utils/auth'

const REASONS: Record<string, string> = {
  missing: 'Код не запрашивали или он уже использован',
  expired: 'Код истёк — запросите новый',
  attempts: 'Слишком много попыток. Запросите новый код',
  mismatch: 'Неверный код',
}

/** Шаг 2 входа: сверяем код и открываем сессию. */
export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  // После «не помню номер» клиент присылает билет: полного номера у него нет.
  const ticket = body?.recoveryToken ? String(body.recoveryToken) : ''
  const recovered = ticket ? await readRecoveryTicket(ticket) : null

  if (ticket && !recovered) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Ссылка восстановления устарела — начните заново',
    })
  }

  const phone = recovered ?? requirePhone(body?.phone)
  const code = String(body?.code ?? '')


  const result = await checkOtp(phone, code)
  if (!result.ok) {
    throw createError({
      statusCode: 400,
      statusMessage: REASONS[result.reason] ?? 'Не удалось подтвердить номер',
    })
  }

  // Вход и регистрация — один и тот же шаг: аккаунт заводится при первом входе.
  const name = typeof body?.name === 'string' ? body.name.trim().slice(0, 80) : undefined
  const user = await upsertUser(phone, name || undefined)
  await createSession(event, user.id)

  // Билет одноразовый: после входа он больше не нужен.
  if (ticket) await consumeRecoveryTicket(ticket)

  return { ok: true, user }
})
