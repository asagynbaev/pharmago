import { requirePhone, requireText } from '../utils/validation'

/** Заявка аптеки на подключение к сервису. */
export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  const company = requireText(body?.company, 'Название аптеки')
  const phone = requirePhone(body?.phone)
  const plan = String(body?.plan ?? 'start')
  const points = Number(body?.points) || 1

  console.info('[partners] новая заявка:', company, phone, plan, points)

  return {
    ok: true,
    message: 'Заявка принята. Менеджер перезвонит в течение рабочего дня.',
    company,
    plan,
  }
})
