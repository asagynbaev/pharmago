import { canCancel, cancelOrder, decorateOrder, getOrder } from '../../../utils/orders'

/** Отмена заказа — пока курьер не выехал. */
export default defineEventHandler(async (event) => {
  const code = getRouterParam(event, 'code')!
  const order = await getOrder(code)

  if (!order) {
    throw createError({ statusCode: 404, statusMessage: 'Заказ не найден' })
  }
  if (order.cancelledAt) {
    throw createError({ statusCode: 409, statusMessage: 'Заказ уже отменён' })
  }
  if (!canCancel(order)) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Курьер уже выехал — отмену оформит оператор по телефону',
    })
  }

  const cancelled = await cancelOrder(code)
  return { ok: true, order: decorateOrder(cancelled!) }
})
