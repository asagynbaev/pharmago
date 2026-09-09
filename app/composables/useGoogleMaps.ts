/// <reference types="google.maps" />

export type MapsStatus
  = | 'idle'
    | 'loading'
    | 'ready'
    /** Скрипт не загрузился: нет сети или блокировщик. */
    | 'error'
    /** Google отклонил ключ: ограничения, биллинг, неверный ключ. */
    | 'denied'
    | 'no-key'

/**
 * Скрипт Google Maps грузится один раз на всё приложение, поэтому промис
 * живёт на уровне модуля, а не внутри компонента.
 */
let loadPromise: Promise<typeof google.maps> | null = null

const CALLBACK = '__pharmagoMapsReady'

/**
 * Google вызывает window.gm_authFailure, когда ключ не принят: неверный,
 * с лишними ограничениями или без биллинга. Без этого обработчика на месте
 * карты остаётся пустой прямоугольник, поэтому переводим состояние в 'denied'
 * и показываем схему.
 */
const authFailed = ref(false)

function watchAuthFailure() {
  if (!import.meta.client) return
  const w = window as unknown as Record<string, unknown>
  if (w.gm_authFailure) return
  w.gm_authFailure = () => { authFailed.value = true }
}

function loadMapsScript(apiKey: string): Promise<typeof google.maps> {
  if (loadPromise) return loadPromise

  loadPromise = new Promise((resolve, reject) => {
    // Скрипт мог уже приехать (например, после навигации назад).
    if (window.google?.maps) {
      resolve(window.google.maps)
      return
    }

    const params = new URLSearchParams({
      key: apiKey,
      v: 'weekly',
      // Только marker: Places нигде не используется, а её запрос требовал бы
      // от ключа лишнего разрешения и ронял загрузку ApiTargetBlockedMapError.
      libraries: 'marker',
      language: 'ru',
      region: 'KG',
      loading: 'async',
      callback: CALLBACK,
    })

    // Google вызывает глобальную функцию, когда API готов.
    ;(window as unknown as Record<string, unknown>)[CALLBACK] = () => {
      resolve(window.google.maps)
      delete (window as unknown as Record<string, unknown>)[CALLBACK]
    }

    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?${params}`
    script.async = true
    script.onerror = () => {
      loadPromise = null
      reject(new Error('Не удалось загрузить Google Maps'))
    }
    document.head.append(script)
  })

  return loadPromise
}

/**
 * Готовит Google Maps JS API к использованию.
 *
 * Без ключа возвращает статус 'no-key' — вызывающий компонент показывает
 * схематичную карту вместо настоящей, и сайт остаётся рабочим.
 */
export function useGoogleMaps() {
  const config = useRuntimeConfig()
  const apiKey = String(config.public.googleMapsApiKey ?? '')
  // Пусто по умолчанию: с Map ID Google берёт оформление из облачной консоли
  // и игнорирует наши стили, которыми мы убираем чужие POI с карты.
  const mapId = String(config.public.googleMapsMapId ?? '')

  const own = ref<MapsStatus>(apiKey ? 'idle' : 'no-key')
  const error = ref<string | null>(null)
  const maps = shallowRef<typeof google.maps | null>(null)

  // Отказ авторизации приходит асинхронно, уже после успешной загрузки скрипта.
  const status = computed<MapsStatus>(() =>
    authFailed.value && own.value !== 'no-key' ? 'denied' : own.value,
  )

  async function load() {
    if (!apiKey) {
      own.value = 'no-key'
      return null
    }
    if (own.value === 'ready') return maps.value

    watchAuthFailure()
    own.value = 'loading'
    try {
      maps.value = await loadMapsScript(apiKey)
      own.value = 'ready'
      return maps.value
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
      own.value = 'error'
      return null
    }
  }

  return {
    status,
    error: readonly(error),
    maps,
    mapId,
    hasKey: Boolean(apiKey),
    load,
  }
}
