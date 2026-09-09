import { pharmacies } from '#shared/data/pharmacies'
import { medicineBySlug } from '#shared/data/medicines'
import { offerPrice, offerStock } from '#shared/utils/catalog'
import { requirePhone, requireText } from '../utils/validation'
import { currentUser } from '../utils/auth'
import {
  DELIVERY_FEE,
  DELIVERY_MINUTES,
  decorateOrder,
  makeOrderCode,
  saveOrder,
  type Order,
} from '../utils/orders'

/** Оформление доставки. Работает и без входа — тогда заказ не привязан к аккаунту. */
export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  const pharmacy = pharmacies.find(p => p.id === String(body?.pharmacyId))
  if (!pharmacy) {
    throw createError({ statusCode: 400, statusMessage: 'Аптека не найдена' })
  }
  if (!pharmacy.delivery) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Эта аптека не доставляет — заказ можно только забрать',
    })
  }

  const medicine = medicineBySlug.get(String(body?.medicineSlug))
  if (!medicine) {
    throw createError({ statusCode: 400, statusMessage: 'Препарат не найден' })
  }
  if (offerStock(medicine, pharmacy) === 'out') {
    throw createError({
      statusCode: 409,
      statusMessage: 'Этого препарата уже нет в выбранной аптеке',
    })
  }

  const form
    = medicine.forms.find(f => f.id === String(body?.formId)) ?? medicine.forms[0]!

  const quantity = Math.min(Math.max(Number(body?.quantity) || 1, 1), 10)
  const name = requireText(body?.name, 'Имя')
  const phone = requirePhone(body?.phone)
  const address = requireText(body?.address, 'Адрес доставки', 5, 300)
  const comment = String(body?.comment ?? '').trim().slice(0, 300)

  const price = offerPrice(medicine, pharmacy, form.id)
  const now = new Date()
  const user = await currentUser(event)

  const order: Order = {
    code: makeOrderCode(),
    userId: user?.id ?? null,
    pharmacyId: pharmacy.id,
    medicineSlug: medicine.slug,
    formId: form.id,
    quantity,
    price,
    deliveryFee: DELIVERY_FEE,
    total: price * quantity + DELIVERY_FEE,
    name,
    phone,
    address,
    comment,
    cancelledAt: null,
    createdAt: now.toISOString(),
    etaAt: new Date(now.getTime() + DELIVERY_MINUTES * 60_000).toISOString(),
  }

  await saveOrder(order)
  return { ok: true, order: decorateOrder(order, now) }
})
