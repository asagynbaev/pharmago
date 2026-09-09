import { randomInt } from 'node:crypto'
import { pharmacies } from '#shared/data/pharmacies'
import { medicineBySlug } from '#shared/data/medicines'

export type OrderStatus = 'new' | 'collecting' | 'delivering' | 'done' | 'cancelled'

export interface Order {
  code: string
  /** null — заказ оформлен без входа в аккаунт. */
  userId: string | null
  pharmacyId: string
  medicineSlug: string
  formId: string
  quantity: number
  /** Цена за упаковку на момент заказа. */
  price: number
  deliveryFee: number
  total: number
  name: string
  phone: string
  address: string
  comment: string
  /** Отмена — единственный статус, который ставится явно. */
  cancelledAt: string | null
  createdAt: string
  etaAt: string
}

/** Доставка по городу. */
export const DELIVERY_FEE = 150
/** Ожидаемое время доставки. */
export const DELIVERY_MINUTES = 90

const storage = () => useStorage<Order>('orders')

export const makeOrderCode = (): string =>
  'PG-D-' + String(randomInt(100000, 1000000))

export async function saveOrder(order: Order): Promise<void> {
  await storage().setItem(order.code, order)
}

export async function getOrder(code: string): Promise<Order | null> {
  return (await storage().getItem(code.trim().toUpperCase())) ?? null
}

export async function listOrders(userId: string): Promise<Order[]> {
  const keys = await storage().getKeys()
  const all = await Promise.all(keys.map(k => storage().getItem(k)))
  return all
    .filter((o): o is Order => Boolean(o) && o!.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export async function cancelOrder(code: string): Promise<Order | null> {
  const order = await getOrder(code)
  if (!order) return null
  const updated = { ...order, cancelledAt: new Date().toISOString() }
  await saveOrder(updated)
  return updated
}

/**
 * Статус заказа.
 *
 * Настоящей интеграции с аптеками нет, поэтому сборка и доставка
 * разыгрываются по времени с момента оформления — чтобы заказ в кабинете
 * не выглядел застывшим. Отмена этот расчёт перекрывает.
 */
export function orderStatus(order: Order, now: Date = new Date()): OrderStatus {
  if (order.cancelledAt) return 'cancelled'

  const minutes = (now.getTime() - new Date(order.createdAt).getTime()) / 60_000
  if (minutes < 5) return 'new'
  if (minutes < 25) return 'collecting'
  if (minutes < DELIVERY_MINUTES) return 'delivering'
  return 'done'
}

export const STATUS_LABELS: Record<OrderStatus, string> = {
  new: 'Принят',
  collecting: 'Собирается в аптеке',
  delivering: 'Курьер в пути',
  done: 'Доставлен',
  cancelled: 'Отменён',
}

/** Можно ли ещё отменить: после выезда курьера — нет. */
export function canCancel(order: Order, now: Date = new Date()): boolean {
  const status = orderStatus(order, now)
  return status === 'new' || status === 'collecting'
}

/** Заказ вместе с данными аптеки и препарата. */
export function decorateOrder(order: Order, now: Date = new Date()) {
  const pharmacy = pharmacies.find(p => p.id === order.pharmacyId)
  const medicine = medicineBySlug.get(order.medicineSlug)
  const form = medicine?.forms.find(f => f.id === order.formId) ?? medicine?.forms[0]
  const status = orderStatus(order, now)

  return {
    code: order.code,
    status,
    statusLabel: STATUS_LABELS[status],
    canCancel: canCancel(order, now),
    quantity: order.quantity,
    price: order.price,
    deliveryFee: order.deliveryFee,
    total: order.total,
    name: order.name,
    phone: order.phone,
    address: order.address,
    comment: order.comment,
    createdAt: order.createdAt,
    etaAt: order.etaAt,
    pharmacy: pharmacy
      ? {
          id: pharmacy.id,
          chain: pharmacy.chain,
          address: pharmacy.address,
          phone: pharmacy.phone,
          lat: pharmacy.lat,
          lng: pharmacy.lng,
        }
      : null,
    medicine: medicine
      ? { slug: medicine.slug, name: medicine.name, form: form?.label ?? '' }
      : null,
  }
}
