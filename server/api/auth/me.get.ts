import { currentUser } from '../../utils/auth'
import { isWhatsAppConfigured } from '../../utils/whatsapp'

/** Текущий пользователь. Неавторизованному отдаём null, а не 401. */
export default defineEventHandler(async (event) => {
  return {
    user: await currentUser(event),
    whatsappConfigured: isWhatsAppConfigured(),
  }
})
