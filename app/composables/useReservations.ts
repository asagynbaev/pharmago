const STORAGE_KEY = 'pharmago:reservations'
const LIMIT = 20

/**
 * Коды броней этого браузера.
 *
 * Аккаунтов в сервисе нет, поэтому список своих броней держим локально,
 * а подробности подтягиваем с сервера по коду.
 */
export function useReservations() {
  const codes = useState<string[]>('reservation-codes', () => [])

  function read(): string[] {
    if (!import.meta.client) return []
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      const parsed = raw ? JSON.parse(raw) : []
      return Array.isArray(parsed) ? parsed.filter(c => typeof c === 'string') : []
    }
    catch {
      // Повреждённое значение — начинаем с чистого списка.
      return []
    }
  }

  function write(next: string[]) {
    codes.value = next
    if (!import.meta.client) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    }
    catch {
      // Приватный режим — обойдёмся без запоминания.
    }
  }

  /** Подтягивает сохранённые коды. Вызывать на клиенте после монтирования. */
  function restore() {
    codes.value = read()
  }

  function add(code: string) {
    const next = [code, ...read().filter(c => c !== code)].slice(0, LIMIT)
    write(next)
  }

  function remove(code: string) {
    write(read().filter(c => c !== code))
  }

  function clear() {
    write([])
  }

  return { codes, restore, add, remove, clear }
}
