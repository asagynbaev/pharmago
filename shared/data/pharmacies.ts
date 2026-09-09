import type { Pharmacy } from '../types'

/** Центр Бишкека — точка отсчёта по умолчанию (площадь Ала-Тоо). */
export const BISHKEK_CENTER = { lat: 42.8767, lng: 74.6033 }

/**
 * Аптеки Бишкека. Координаты соответствуют реальным улицам и микрорайонам
 * города; названия сетей, телефоны и расписание — демонстрационные.
 */
export const pharmacies: Pharmacy[] = [
  { id: 'neman-kievskaya', chain: 'Неман', address: 'ул. Киевская, 114', district: 'Центр', lat: 42.8738, lng: 74.5921, phone: '+996 312 61-00-00', opensAt: 480, closesAt: 1320, is24h: false, delivery: true, rating: 4.7, reviews: 312 },
  { id: 'neman-ibraimova', chain: 'Неман', address: 'ул. Ибраимова, 42', district: 'Аламедин', lat: 42.8712, lng: 74.6135, phone: '+996 312 61-00-01', opensAt: 480, closesAt: 1320, is24h: false, delivery: true, rating: 4.5, reviews: 148 },
  { id: 'neman-tunguch', chain: 'Неман', address: 'мкр. Тунгуч, 5', district: 'Тунгуч', lat: 42.8925, lng: 74.6210, phone: '+996 312 61-00-02', opensAt: 480, closesAt: 1260, is24h: false, delivery: false, rating: 4.4, reviews: 96 },
  { id: 'neman-isanova', chain: 'Неман', address: 'ул. Исанова, 79', district: 'Центр', lat: 42.8731, lng: 74.5866, phone: '+996 312 61-00-03', opensAt: 480, closesAt: 1320, is24h: false, delivery: true, rating: 4.8, reviews: 204 },
  { id: 'neman-chuy-219', chain: 'Неман', address: 'пр. Чуй, 219', district: 'Центр', lat: 42.8770, lng: 74.6112, phone: '+996 312 61-00-04', opensAt: 540, closesAt: 1260, is24h: false, delivery: false, rating: 4.3, reviews: 87 },

  { id: 'bimed-chuy', chain: 'Бимед', address: 'пр. Чуй, 158', district: 'Центр', lat: 42.8769, lng: 74.5843, phone: '+996 312 90-11-22', opensAt: 480, closesAt: 1260, is24h: false, delivery: false, rating: 4.6, reviews: 267 },
  { id: 'bimed-yunusalieva', chain: 'Бимед', address: 'ул. Юнусалиева, 80', district: 'Джал', lat: 42.8462, lng: 74.5688, phone: '+996 312 90-11-23', opensAt: 540, closesAt: 1260, is24h: false, delivery: false, rating: 4.2, reviews: 74 },
  { id: 'bimed-baytik', chain: 'Бимед', address: 'ул. Байтик Баатыра, 27', district: 'Асанбай', lat: 42.8318, lng: 74.5936, phone: '+996 312 90-11-24', opensAt: 480, closesAt: 1320, is24h: false, delivery: true, rating: 4.5, reviews: 131 },
  { id: 'bimed-abdrahmanova', chain: 'Бимед', address: 'ул. Абдрахманова, 148', district: 'Центр', lat: 42.8693, lng: 74.6019, phone: '+996 312 90-11-25', opensAt: 480, closesAt: 1320, is24h: false, delivery: true, rating: 4.6, reviews: 189 },
  { id: 'bimed-panfilova', chain: 'Бимед', address: 'ул. Панфилова, 121', district: 'Центр', lat: 42.8752, lng: 74.6068, phone: '+996 312 90-11-26', opensAt: 540, closesAt: 1200, is24h: false, delivery: false, rating: 4.1, reviews: 58 },

  { id: 'plus-ahunbaeva', chain: 'Аптека Плюс', address: 'ул. Ахунбаева, 97', district: 'Асанбай', lat: 42.8471, lng: 74.6044, phone: '+996 312 54-33-44', opensAt: 0, closesAt: 1440, is24h: true, delivery: true, rating: 4.9, reviews: 421 },
  { id: 'plus-manasa', chain: 'Аптека Плюс', address: 'пр. Манаса, 40', district: 'Центр', lat: 42.8703, lng: 74.5827, phone: '+996 312 54-33-45', opensAt: 0, closesAt: 1440, is24h: true, delivery: true, rating: 4.8, reviews: 356 },
  { id: 'plus-vostok5', chain: 'Аптека Плюс', address: 'мкр. Восток-5, 12', district: 'Восток-5', lat: 42.8735, lng: 74.6472, phone: '+996 312 54-33-46', opensAt: 480, closesAt: 1380, is24h: false, delivery: true, rating: 4.4, reviews: 112 },
  { id: 'plus-ankara', chain: 'Аптека Плюс', address: 'ул. Анкара, 1/1', district: 'Ак-Орго', lat: 42.8395, lng: 74.5218, phone: '+996 312 54-33-47', opensAt: 540, closesAt: 1260, is24h: false, delivery: false, rating: 4.2, reviews: 63 },

  { id: 'aybolit-jal', chain: 'Айболит', address: 'мкр. Джал, 23', district: 'Джал', lat: 42.8302, lng: 74.5497, phone: '+996 312 65-55-66', opensAt: 540, closesAt: 1200, is24h: false, delivery: false, rating: 4.3, reviews: 91 },
  { id: 'aybolit-densyaopina', chain: 'Айболит', address: 'ул. Ден Сяопина, 108', district: 'Джал', lat: 42.8361, lng: 74.5602, phone: '+996 312 65-55-67', opensAt: 540, closesAt: 1200, is24h: false, delivery: false, rating: 4.0, reviews: 47 },
  { id: 'aybolit-kokjar', chain: 'Айболит', address: 'мкр. Кок-Жар, 3', district: 'Кок-Жар', lat: 42.8156, lng: 74.5772, phone: '+996 312 65-55-68', opensAt: 540, closesAt: 1200, is24h: false, delivery: false, rating: 4.1, reviews: 39 },

  { id: 'farmamir-toktogula', chain: 'Фармамир', address: 'ул. Токтогула, 110', district: 'Центр', lat: 42.8701, lng: 74.5896, phone: '+996 312 30-77-88', opensAt: 480, closesAt: 1380, is24h: false, delivery: true, rating: 4.7, reviews: 238 },
  { id: 'farmamir-jibek', chain: 'Фармамир', address: 'ул. Жибек Жолу, 394', district: 'Центр', lat: 42.8836, lng: 74.5951, phone: '+996 312 30-77-89', opensAt: 480, closesAt: 1320, is24h: false, delivery: true, rating: 4.4, reviews: 127 },
  { id: 'farmamir-alamedin1', chain: 'Фармамир', address: 'мкр. Аламедин-1, 44', district: 'Аламедин', lat: 42.8788, lng: 74.6413, phone: '+996 312 30-77-90', opensAt: 540, closesAt: 1260, is24h: false, delivery: false, rating: 4.3, reviews: 84 },
  { id: 'farmamir-salieva', chain: 'Фармамир', address: 'ул. Салиева, 65', district: 'Аламедин', lat: 42.8853, lng: 74.6304, phone: '+996 312 30-77-91', opensAt: 480, closesAt: 1320, is24h: false, delivery: true, rating: 4.5, reviews: 103 },

  { id: 'zdorovie-gorkogo', chain: 'Здоровье', address: 'ул. Горького, 41', district: 'Восток-5', lat: 42.8487, lng: 74.6218, phone: '+996 312 48-99-00', opensAt: 0, closesAt: 1440, is24h: true, delivery: false, rating: 4.6, reviews: 294 },
  { id: 'zdorovie-moskovskaya', chain: 'Здоровье', address: 'ул. Московская, 172', district: 'Центр', lat: 42.8664, lng: 74.5878, phone: '+996 312 48-99-01', opensAt: 540, closesAt: 1200, is24h: false, delivery: false, rating: 4.2, reviews: 76 },
  { id: 'zdorovie-yug2', chain: 'Здоровье', address: 'мкр. Юг-2, 18', district: 'Юг-2', lat: 42.8333, lng: 74.5824, phone: '+996 312 48-99-02', opensAt: 0, closesAt: 1440, is24h: true, delivery: true, rating: 4.7, reviews: 168 },
]

export const districts = [...new Set(pharmacies.map(p => p.district))].sort((a, b) =>
  a.localeCompare(b, 'ru'),
)

export const chains = [...new Set(pharmacies.map(p => p.chain))].sort((a, b) =>
  a.localeCompare(b, 'ru'),
)
