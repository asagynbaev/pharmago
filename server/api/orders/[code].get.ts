import { currentUser } from '../../utils/auth'
import { decorateOrder, getOrder } from '../../utils/orders'

/** Статус заказа по коду. Чужой заказ отдаём только по точному коду. */
export default defineEventHandler(async (event) => {
  const code = getRouterParam(event, 'code')!
  const order = await getOrder(code)

  if (!order) {
    throw createError({ statusCode: 404, statusMessage: 'Заказ не найден' })
  }

  // Привязываем «ничей» заказ к аккаунту, если человек вошёл после оформления.
  const user = await currentUser(event)
  if (user && !order.userId) {
    order.userId = user.id
    await useStorage('orders').setItem(order.code, order)
  }

  return decorateOrder(order)
})
