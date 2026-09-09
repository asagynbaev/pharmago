import { BISHKEK_CENTER } from '#shared/data/pharmacies'

export type LocationStatus = 'default' | 'locating' | 'granted' | 'denied' | 'unsupported'

const STORAGE_KEY = 'pharmago:location'

/**
 * Геопозиция пользователя, общая для всего приложения.
 *
 * По умолчанию — центр Бишкека, чтобы расстояния считались и без
 * разрешения на геолокацию. Разрешение запрашивается только по явному
 * действию пользователя.
 */
export function useUserLocation() {
  const coords = useState('user-location', () => ({ ...BISHKEK_CENTER }))
  const status = useState<LocationStatus>('user-location-status', () => 'default')

  /** Восстанавливает последнюю известную точку из localStorage. */
  function restore() {
    if (!import.meta.client) return
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (!saved) return
      const parsed = JSON.parse(saved) as { lat: number, lng: number }
      if (Number.isFinite(parsed.lat) && Number.isFinite(parsed.lng)) {
        coords.value = { lat: parsed.lat, lng: parsed.lng }
        status.value = 'granted'
      }
    }
    catch {
      // Повреждённое значение — просто игнорируем и остаёмся на центре города.
    }
  }

  function locate(): Promise<{ lat: number, lng: number }> {
    return new Promise((resolve) => {
      if (!import.meta.client || !('geolocation' in navigator)) {
        status.value = 'unsupported'
        resolve(coords.value)
        return
      }

      status.value = 'locating'
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const next = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          }
          coords.value = next
          status.value = 'granted'
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
          }
          catch {
            // Приватный режим — обойдёмся без запоминания.
          }
          resolve(next)
        },
        () => {
          status.value = 'denied'
          resolve(coords.value)
        },
        { enableHighAccuracy: true, timeout: 10_000, maximumAge: 300_000 },
      )
    })
  }

  function reset() {
    coords.value = { ...BISHKEK_CENTER }
    status.value = 'default'
    if (import.meta.client) {
      try {
        localStorage.removeItem(STORAGE_KEY)
      }
      catch {
        // Нечего чистить.
      }
    }
  }

  const label = computed(() => {
    switch (status.value) {
      case 'granted': return 'Расстояния от вашего местоположения'
      case 'locating': return 'Определяем местоположение…'
      case 'denied': return 'Доступ к геопозиции закрыт — считаем от центра города'
      case 'unsupported': return 'Браузер не умеет определять местоположение'
      default: return 'Расстояния от центра Бишкека'
    }
  })

  return { coords, status, label, locate, restore, reset }
}
