import { pharmacies } from '#shared/data/pharmacies'
import { medicineBySlug } from '#shared/data/medicines'

/** Бронь держится три часа — столько же, сколько в правилах сервиса. */
export const HOLD_HOURS = 3

export interface Reservation {
  code: string
  /** null — бронь оформлена без входа в аккаунт. */
  userId: string | null
  pharmacyId: string
  medicineSlug: string
  formId: string
  price: number
  name: string
  phone: string
  createdAt: string
  expiresAt: string
}

/**
 * Хранилище броней. Драйвер настроен в nuxt.config (файловый),
 * поэтому брони переживают перезапуск сервера.
 */
const storage = () => useStorage<Reservation>('reservations')

/** Код вида PG-483920 — его называют на кассе. */
export function makeCode(): string {
  return 'PG-' + String(Math.floor(Math.random() * 900000) + 100000)
}

export async function saveReservation(reservation: Reservation): Promise<void> {
  await storage().setItem(reservation.code, reservation)
}

export async function getReservation(code: string): Promise<Reservation | null> {
  return (await storage().getItem(code.trim().toUpperCase())) ?? null
}

/** Брони пользователя, свежие сверху. */
export async function listReservations(userId: string): Promise<Reservation[]> {
  const keys = await storage().getKeys()
  const all = await Promise.all(keys.map(k => storage().getItem(k)))
  return all
    .filter((r): r is Reservation => Boolean(r) && r!.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

/** Бронь вместе с данными аптеки и препарата — то, что показываем клиенту. */
export function decorateReservation(reservation: Reservation) {
  const pharmacy = pharmacies.find(p => p.id === reservation.pharmacyId)
  const medicine = medicineBySlug.get(reservation.medicineSlug)
  const form = medicine?.forms.find(f => f.id === reservation.formId) ?? medicine?.forms[0]

  return {
    code: reservation.code,
    price: reservation.price,
    name: reservation.name,
    phone: reservation.phone,
    createdAt: reservation.createdAt,
    expiresAt: reservation.expiresAt,
    expired: new Date(reservation.expiresAt).getTime() < Date.now(),
    holdHours: HOLD_HOURS,
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
