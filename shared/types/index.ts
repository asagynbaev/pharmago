/** Аптека — точка на карте с расписанием и услугами. */
export interface Pharmacy {
  id: string
  chain: string
  address: string
  district: string
  lat: number
  lng: number
  phone: string
  /** Минуты от полуночи. Для круглосуточных — 0. */
  opensAt: number
  /** Минуты от полуночи. 1440 — круглосуточно. */
  closesAt: number
  is24h: boolean
  delivery: boolean
  rating: number
  reviews: number
}

/** Аптека, обогащённая расчётными полями относительно пользователя и текущего времени. */
export interface PharmacyView extends Pharmacy {
  /** Расстояние по прямой от точки пользователя, км. */
  distance: number
  isOpen: boolean
  /** «до 22:00» / «круглосуточно» */
  hours: string
  /** «Открыто» / «Закрыто» / «24/7» */
  status: 'open' | 'closed' | 'night'
  statusLabel: string
}

export interface MedicineForm {
  id: string
  label: string
  short: string
  /** Множитель к базовой цене препарата. */
  factor: number
}

export interface Medicine {
  slug: string
  name: string
  substance: string
  manufacturer: string
  category: string
  /** Отпускается по рецепту. */
  prescription: boolean
  /** Базовая цена в сомах за основную форму выпуска. */
  basePrice: number
  forms: MedicineForm[]
  info: { title: string, text: string }[]
}

export type StockLevel = 'in' | 'low' | 'out'

/** Предложение: конкретный препарат в конкретной аптеке. */
export interface Offer {
  pharmacyId: string
  price: number
  stock: StockLevel
  /** ISO-время последнего обновления остатков. */
  updatedAt: string
}

/** Предложение вместе с данными аптеки — то, что показываем в списках. */
export interface OfferView extends Offer {
  pharmacy: PharmacyView
  stockLabel: string
}
