import { randomBytes, randomInt, timingSafeEqual } from 'node:crypto'
import type { H3Event } from 'h3'

/** Сколько живёт код подтверждения. */
const OTP_TTL_MS = 5 * 60_000
/** Сколько попыток ввода кода даём до сброса. */
const OTP_MAX_ATTEMPTS = 5
/** Не чаще одного кода в минуту на номер. */
const OTP_RESEND_MS = 60_000
/** Сколько живёт сессия. */
const SESSION_TTL_MS = 30 * 24 * 3600_000

export const SESSION_COOKIE = 'pharmago_session'

export interface User {
  id: string
  phone: string
  name: string
  /** Адрес доставки по умолчанию — подставляется в форму заказа. */
  address: string
  createdAt: string
}

interface Session {
  token: string
  userId: string
  createdAt: string
  expiresAt: string
}

interface OtpRecord {
  code: string
  phone: string
  expiresAt: string
  sentAt: string
  attempts: number
}

const users = () => useStorage<User>('users')
const sessions = () => useStorage<Session>('sessions')
const otps = () => useStorage<OtpRecord>('otp')

/** Ключ пользователя — нормализованный номер без плюса. */
const userKey = (phone: string) => phone.replace(/\D/g, '')

/* -------------------------------------------------------------- */
/* Пользователи                                                    */
/* -------------------------------------------------------------- */

export async function findUserByPhone(phone: string): Promise<User | null> {
  return (await users().getItem(userKey(phone))) ?? null
}

export async function findUserById(id: string): Promise<User | null> {
  // id совпадает с ключом хранилища, отдельный индекс не нужен.
  return (await users().getItem(id)) ?? null
}

/** Возвращает существующего пользователя или заводит нового. */
export async function upsertUser(phone: string, name?: string): Promise<User> {
  const key = userKey(phone)
  const existing = await users().getItem(key)

  if (existing) {
    if (name && name !== existing.name) {
      const updated = { ...existing, name }
      await users().setItem(key, updated)
      return updated
    }
    return existing
  }

  const user: User = {
    id: key,
    phone,
    name: name ?? '',
    address: '',
    createdAt: new Date().toISOString(),
  }
  await users().setItem(key, user)
  return user
}

export async function updateUser(
  id: string,
  patch: Partial<Pick<User, 'name' | 'address'>>,
): Promise<User | null> {
  const user = await users().getItem(id)
  if (!user) return null
  const updated = { ...user, ...patch }
  await users().setItem(id, updated)
  return updated
}

/* -------------------------------------------------------------- */
/* Коды подтверждения                                              */
/* -------------------------------------------------------------- */

export interface OtpIssue {
  code: string
  /** Сколько секунд ждать до повторной отправки. */
  retryAfter: number
}

/**
 * Выдаёт код подтверждения. Если предыдущий ещё «свежий», повторно
 * отправлять не даём — иначе номер можно завалить сообщениями.
 */
export async function issueOtp(phone: string): Promise<OtpIssue | { retryAfter: number, throttled: true }> {
  const key = userKey(phone)
  const existing = await otps().getItem(key)

  if (existing) {
    const since = Date.now() - new Date(existing.sentAt).getTime()
    if (since < OTP_RESEND_MS) {
      return { throttled: true, retryAfter: Math.ceil((OTP_RESEND_MS - since) / 1000) }
    }
  }

  // randomInt даёт криптостойкое значение, в отличие от Math.random.
  const code = String(randomInt(100000, 1000000))
  const now = new Date()

  await otps().setItem(key, {
    code,
    phone,
    sentAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + OTP_TTL_MS).toISOString(),
    attempts: 0,
  })

  return { code, retryAfter: Math.ceil(OTP_RESEND_MS / 1000) }
}

export type OtpCheck =
  | { ok: true }
  | { ok: false, reason: 'missing' | 'expired' | 'attempts' | 'mismatch' }

/** Сверяет код. Сравнение постоянное по времени, попытки ограничены. */
export async function checkOtp(phone: string, input: string): Promise<OtpCheck> {
  const key = userKey(phone)
  const record = await otps().getItem(key)

  if (!record) return { ok: false, reason: 'missing' }

  if (new Date(record.expiresAt).getTime() < Date.now()) {
    await otps().removeItem(key)
    return { ok: false, reason: 'expired' }
  }

  if (record.attempts >= OTP_MAX_ATTEMPTS) {
    await otps().removeItem(key)
    return { ok: false, reason: 'attempts' }
  }

  const given = String(input).replace(/\D/g, '')
  const expected = record.code
  const same
    = given.length === expected.length
      && timingSafeEqual(Buffer.from(given), Buffer.from(expected))

  if (!same) {
    await otps().setItem(key, { ...record, attempts: record.attempts + 1 })
    return { ok: false, reason: 'mismatch' }
  }

  await otps().removeItem(key)
  return { ok: true }
}

/* -------------------------------------------------------------- */
/* Сессии                                                          */
/* -------------------------------------------------------------- */

export async function createSession(event: H3Event, userId: string): Promise<string> {
  const token = randomBytes(32).toString('base64url')
  const now = new Date()

  await sessions().setItem(token, {
    token,
    userId,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + SESSION_TTL_MS).toISOString(),
  })

  setCookie(event, SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
    // На localhost secure ломает установку куки, в проде включаем.
    secure: !import.meta.dev,
  })

  return token
}

export async function destroySession(event: H3Event): Promise<void> {
  const token = getCookie(event, SESSION_COOKIE)
  if (token) await sessions().removeItem(token)
  deleteCookie(event, SESSION_COOKIE, { path: '/' })
}

/** Пользователь текущего запроса или null. */
export async function currentUser(event: H3Event): Promise<User | null> {
  const token = getCookie(event, SESSION_COOKIE)
  if (!token) return null

  const session = await sessions().getItem(token)
  if (!session) return null

  if (new Date(session.expiresAt).getTime() < Date.now()) {
    await sessions().removeItem(token)
    deleteCookie(event, SESSION_COOKIE, { path: '/' })
    return null
  }

  return findUserById(session.userId)
}

/** Пользователь текущего запроса или 401. */
export async function requireUser(event: H3Event): Promise<User> {
  const user = await currentUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Нужно войти в аккаунт' })
  }
  return user
}

/* -------------------------------------------------------------- */
/* Восстановление доступа                                          */
/* -------------------------------------------------------------- */

/** Сколько живёт разрешение на вход по коду брони или заказа. */
const RECOVERY_TTL_MS = 10 * 60_000

interface RecoveryTicket {
  phone: string
  expiresAt: string
}

const recovery = () => useStorage<RecoveryTicket>('recovery')

/**
 * Человек не помнит номер, но помнит код брони или заказа. По коду выдаём
 * разовый билет: клиент увидит только маскированный номер, а полный
 * останется на сервере — так номер нельзя выяснить перебором кодов.
 */
export async function issueRecoveryTicket(phone: string): Promise<string> {
  const token = randomBytes(24).toString('base64url')
  await recovery().setItem(token, {
    phone,
    expiresAt: new Date(Date.now() + RECOVERY_TTL_MS).toISOString(),
  })
  return token
}

/** Читает билет, не гася его: код можно запросить повторно. */
export async function readRecoveryTicket(token: string): Promise<string | null> {
  const ticket = await recovery().getItem(token)
  if (!ticket) return null

  if (new Date(ticket.expiresAt).getTime() < Date.now()) {
    await recovery().removeItem(token)
    return null
  }

  return ticket.phone
}

/** Гасит билет после успешного входа, чтобы им нельзя было воспользоваться снова. */
export async function consumeRecoveryTicket(token: string): Promise<void> {
  await recovery().removeItem(token)
}

/** +996555123456 → +996 55• ••• •56 */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 6) return '•'.repeat(digits.length)
  const head = digits.slice(0, 5)
  const tail = digits.slice(-2)
  return `+${head}• ••• •${tail}`
}
