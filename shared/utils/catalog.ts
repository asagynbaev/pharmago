import type {
  Medicine,
  Offer,
  Pharmacy,
  PharmacyView,
  StockLevel,
} from '../types'
import { BISHKEK_CENTER } from '../data/pharmacies'
import { medicineBySlug } from '../data/medicines'

/**
 * Детерминированный хеш строки в диапазон [0, 1).
 *
 * Цены и остатки в демо-режиме генерируются, а не приходят из учётных систем
 * аптек. Хеш вместо Math.random() гарантирует, что сервер и клиент получат
 * одинаковые числа — иначе гидратация Vue сломается.
 */
export function seededUnit(seed: string): number {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0) / 4294967296
}

/** Расстояние по большому кругу между двумя точками, км. */
export function haversineKm(
  a: { lat: number, lng: number },
  b: { lat: number, lng: number },
): number {
  const R = 6371
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h
    = Math.sin(dLat / 2) ** 2
      + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

/** 1320 → «22:00» */
export function minutesToClock(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/** Открыта ли аптека в указанный момент. */
export function isOpenAt(pharmacy: Pharmacy, at: Date): boolean {
  if (pharmacy.is24h) return true
  const minutes = at.getHours() * 60 + at.getMinutes()
  return minutes >= pharmacy.opensAt && minutes < pharmacy.closesAt
}

/**
 * Дополняет аптеку расчётными полями: расстоянием до пользователя,
 * статусом «открыто / закрыто / круглосуточно» и подписью расписания.
 */
export function decoratePharmacy(
  pharmacy: Pharmacy,
  origin: { lat: number, lng: number } = BISHKEK_CENTER,
  now: Date = new Date(),
): PharmacyView {
  const open = isOpenAt(pharmacy, now)
  const status = pharmacy.is24h ? 'night' : open ? 'open' : 'closed'
  return {
    ...pharmacy,
    distance: Number(haversineKm(origin, pharmacy).toFixed(1)),
    isOpen: open,
    hours: pharmacy.is24h
      ? 'круглосуточно'
      : `${minutesToClock(pharmacy.opensAt)}–${minutesToClock(pharmacy.closesAt)}`,
    status,
    statusLabel:
      status === 'night' ? '24/7' : status === 'open' ? 'Открыто' : 'Закрыто',
  }
}

const STOCK_LABELS: Record<StockLevel, string> = {
  in: 'В наличии',
  low: 'Осталось мало',
  out: 'Нет в наличии',
}

export function stockLabel(stock: StockLevel): string {
  return STOCK_LABELS[stock]
}

/**
 * Сети держат немного разную наценку — это делает разброс цен
 * в выдаче похожим на настоящий, а не случайным шумом.
 */
const CHAIN_MARKUP: Record<string, number> = {
  'Неман': 1.0,
  'Бимед': 0.94,
  'Аптека Плюс': 1.09,
  'Айболит': 0.9,
  'Фармамир': 1.14,
  'Здоровье': 1.02,
}

/** Цена конкретного препарата в конкретной аптеке, сом. */
export function offerPrice(
  medicine: Medicine,
  pharmacy: Pharmacy,
  formId?: string,
): number {
  const form
    = medicine.forms.find(f => f.id === formId) ?? medicine.forms[0]!
  const jitter = 0.9 + seededUnit(`${medicine.slug}:${pharmacy.id}`) * 0.28
  const markup = CHAIN_MARKUP[pharmacy.chain] ?? 1
  const price = medicine.basePrice * form.factor * markup * jitter
  // Аптеки округляют ценники до целых сомов.
  return Math.round(price)
}

/** Остаток препарата в аптеке. */
export function offerStock(
  medicine: Medicine,
  pharmacy: Pharmacy,
): StockLevel {
  const roll = seededUnit(`stock:${medicine.slug}:${pharmacy.id}`)
  // Рецептурные препараты есть далеко не везде.
  const outThreshold = medicine.prescription ? 0.28 : 0.12
  if (roll < outThreshold) return 'out'
  if (roll < outThreshold + 0.16) return 'low'
  return 'in'
}

/** Сколько минут назад аптека последний раз обновляла остатки. */
export function offerFreshnessMinutes(
  medicine: Medicine,
  pharmacy: Pharmacy,
): number {
  const roll = seededUnit(`fresh:${medicine.slug}:${pharmacy.id}`)
  // Большинство партнёров отдаёт остатки часто, хвост — раз в несколько часов.
  return Math.round(3 + roll ** 3 * 480)
}

export function formatFreshness(minutes: number): string {
  if (minutes < 60) return `${minutes} мин назад`
  const hours = Math.round(minutes / 60)
  const plural = hours === 1 ? 'час' : hours < 5 ? 'часа' : 'часов'
  return `${hours} ${plural} назад`
}

/** Все предложения по препарату во всех аптеках. */
export function buildOffers(
  medicineSlug: string,
  allPharmacies: Pharmacy[],
  formId?: string,
  now: Date = new Date(),
): Offer[] {
  const medicine = medicineBySlug.get(medicineSlug)
  if (!medicine) return []

  return allPharmacies.map((pharmacy) => {
    const minutesAgo = offerFreshnessMinutes(medicine, pharmacy)
    return {
      pharmacyId: pharmacy.id,
      price: offerPrice(medicine, pharmacy, formId),
      stock: offerStock(medicine, pharmacy),
      updatedAt: new Date(now.getTime() - minutesAgo * 60_000).toISOString(),
    }
  })
}

/** Медиана числового ряда. */
export function median(values: number[]): number {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2
    ? sorted[mid]!
    : Math.round((sorted[mid - 1]! + sorted[mid]!) / 2)
}

/** Склонение существительного по числу: 1 аптека, 2 аптеки, 5 аптек. */
export function plural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few
  return many
}

/** Цена с разделителем разрядов: 1 240 сом. */
export function formatPrice(value: number): string {
  return new Intl.NumberFormat('ru-RU').format(Math.round(value))
}

/** Расстояние с запятой вместо точки, как принято в русской типографике. */
export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} м`
  return `${km.toFixed(1).replace('.', ',')} км`
}

/**
 * Нестрогий поиск по названию и действующему веществу:
 * терпит регистр, частичный ввод и поиск по подстроке.
 */
export function matchMedicines(query: string): Medicine[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const { medicines } = medicineIndex
  const scored = medicines
    .map((m) => {
      const name = m.name.toLowerCase()
      const substance = m.substance.toLowerCase()
      let score = 0
      if (name.startsWith(q)) score = 100
      else if (name.includes(q)) score = 70
      else if (substance.startsWith(q)) score = 60
      else if (substance.includes(q)) score = 40
      else if (m.category.toLowerCase().includes(q)) score = 20
      return { m, score }
    })
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score || a.m.name.localeCompare(b.m.name, 'ru'))
  return scored.map(x => x.m)
}

// Ленивая ссылка на каталог — избавляет от циклического импорта модулей.
const medicineIndex = {
  get medicines() {
    return [...medicineBySlug.values()]
  },
}
