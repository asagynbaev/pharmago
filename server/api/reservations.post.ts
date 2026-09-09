import { pharmacies } from '#shared/data/pharmacies'
import { medicineBySlug } from '#shared/data/medicines'
import { offerPrice, offerStock } from '#shared/utils/catalog'
import { requirePhone, requireText } from '../utils/validation'
import { currentUser } from '../utils/auth'
import {
  HOLD_HOURS,
  decorateReservation,
  makeCode,
  saveReservation,
  type Reservation,
} from '../utils/reservations'

/** Оформление брони: аптека держит товар три часа, оплата на месте. */
export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  const pharmacy = pharmacies.find(p => p.id === String(body?.pharmacyId))
  if (!pharmacy) {
    throw createError({ statusCode: 400, statusMessage: 'Аптека не найдена' })
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

  const name = requireText(body?.name, 'Имя')
  const phone = requirePhone(body?.phone)

  const now = new Date()
  const user = await currentUser(event)

  const reservation: Reservation = {
    code: makeCode(),
    userId: user?.id ?? null,
    pharmacyId: pharmacy.id,
    medicineSlug: medicine.slug,
    formId: form.id,
    price: offerPrice(medicine, pharmacy, form.id),
    name,
    phone,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + HOLD_HOURS * 3600_000).toISOString(),
  }

  await saveReservation(reservation)

  return {
    ok: true,
    ...decorateReservation(reservation),
    // Плоские поля оставлены для обратной совместимости с диалогом брони.
    reservation,
  }
})
