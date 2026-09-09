import { requireText } from '../utils/validation'
import { normalizePhone } from '../utils/validation'

const TOPICS = ['Вопрос по сервису', 'Ошибка в цене', 'Партнёрство', 'Пресса']

/** Обращение из формы обратной связи. */
export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  const name = requireText(body?.name, 'Имя')
  const message = requireText(body?.message, 'Сообщение', 10, 4000)
  const contact = String(body?.contact ?? '').trim()

  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(contact)
  if (!isEmail && !normalizePhone(contact)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Оставьте телефон или email, чтобы мы могли ответить',
    })
  }

  const topic = TOPICS.includes(String(body?.topic)) ? String(body.topic) : TOPICS[0]

  console.info('[contact] обращение:', topic, name, contact)

  return {
    ok: true,
    message: 'Сообщение отправлено. Ответим в рабочие часы в течение 15 минут.',
    topic,
  }
})
