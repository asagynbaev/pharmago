/** Кыргызский номер: +996 XXX XX-XX-XX и любые его написания. */
export function normalizePhone(input: unknown): string | null {
  const digits = String(input ?? '').replace(/\D/g, '')
  if (digits.length === 9) return '+996' + digits
  if (digits.length === 12 && digits.startsWith('996')) return '+' + digits
  if (digits.length === 13 && digits.startsWith('0996')) return '+' + digits.slice(1)
  if (digits.length === 10 && digits.startsWith('0')) return '+996' + digits.slice(1)
  return null
}

export function requireText(input: unknown, field: string, min = 2, max = 500): string {
  const value = String(input ?? '').trim()
  if (value.length < min || value.length > max) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Поле «' + field + '» заполнено неверно',
    })
  }
  return value
}

export function requirePhone(input: unknown): string {
  const phone = normalizePhone(input)
  if (!phone) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Укажите телефон в формате +996 XXX XX-XX-XX',
    })
  }
  return phone
}
