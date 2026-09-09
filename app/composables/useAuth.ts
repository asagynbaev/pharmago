export interface AuthUser {
  id: string
  phone: string
  name: string
  address: string
  createdAt: string
}

interface CodeRequestResult {
  ok: true
  phone: string
  maskedPhone: string
  recovered: boolean
  retryAfter: number
  delivered: boolean
  /** Код приходит в ответе только в демо-режиме, без Cloud API. */
  devCode?: string
  whatsappConfigured: boolean
}

/**
 * Аккаунт пользователя.
 *
 * Сессия живёт в httpOnly-куке, поэтому токена на клиенте нет — состояние
 * подтягивается с сервера и переезжает в клиент через payload Nuxt.
 */
export function useAuth() {
  const user = useState<AuthUser | null>('auth-user', () => null)
  const whatsappConfigured = useState('auth-wa', () => true)
  // null у user означает и «гость», и «ещё не спрашивали» — различаем флагом.
  const ready = useState('auth-ready', () => false)

  const isAuthenticated = computed(() => user.value !== null)

  /** Тянет текущего пользователя. На сервере пробрасывает куки запроса. */
  async function fetchUser() {
    const request = useRequestFetch()
    try {
      const data = await request<{ user: AuthUser | null, whatsappConfigured: boolean }>(
        '/api/auth/me',
      )
      user.value = data.user
      whatsappConfigured.value = data.whatsappConfigured
    }
    catch {
      user.value = null
    }
    finally {
      ready.value = true
    }
  }

  /** Шаг 1: запросить код. Принимает номер либо билет восстановления. */
  function requestCode(payload: { phone?: string, recoveryToken?: string }) {
    return $fetch<CodeRequestResult>('/api/auth/request-code', {
      method: 'POST',
      body: payload,
    })
  }

  /** Шаг 2: подтвердить код и открыть сессию. */
  async function verifyCode(payload: {
    phone?: string
    recoveryToken?: string
    code: string
    name?: string
  }) {
    const data = await $fetch<{ user: AuthUser }>('/api/auth/verify', {
      method: 'POST',
      body: payload,
    })
    user.value = data.user
    return data.user
  }

  /** «Не помню номер»: по коду брони или заказа. */
  function recoverByCode(code: string) {
    return $fetch<{ maskedPhone: string, recoveryToken: string }>('/api/auth/recover', {
      method: 'POST',
      body: { code },
    })
  }

  async function updateProfile(patch: { name?: string, address?: string }) {
    const data = await $fetch<{ user: AuthUser }>('/api/auth/profile', {
      method: 'PATCH',
      body: patch,
    })
    user.value = data.user
    return data.user
  }

  async function logout() {
    await $fetch('/api/auth/logout', { method: 'POST' })
    user.value = null
    // Кабинет закрыт — уводим на главную, чтобы не остаться на 401-странице.
    await navigateTo('/')
  }

  /** Имя для приветствия: имя, а если его нет — номер. */
  const displayName = computed(() => {
    if (!user.value) return ''
    return user.value.name || user.value.phone
  })

  return {
    user,
    ready,
    isAuthenticated,
    displayName,
    whatsappConfigured,
    fetchUser,
    requestCode,
    verifyCode,
    recoverByCode,
    updateProfile,
    logout,
  }
}
