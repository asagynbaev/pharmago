import { requireUser } from '../utils/auth'
import { decorateOrder, listOrders } from '../utils/orders'

/** Заказы текущего пользователя. */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const now = new Date()
  return { items: (await listOrders(user.id)).map(o => decorateOrder(o, now)) }
})
