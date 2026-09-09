export type ToastIcon = 'loader' | 'check' | 'fail' | null

export interface Toast {
  id: number
  title: string
  text?: string
  icon: ToastIcon
  /** Время жизни, мс. 0 — не закрывать автоматически. */
  duration: number
}

let nextId = 0

/** Больше трёх плашек одновременно — уже шум, старые вытесняем. */
const MAX_VISIBLE = 3

/**
 * Всплывающие уведомления. Состояние общее для всего приложения,
 * поэтому вызвать можно из любого компонента или composable.
 */
export function useToast() {
  const toasts = useState<Toast[]>('pg-toasts', () => [])
  // Таймеры живут вне реактивного состояния — их не нужно сериализовать.
  const timers = new Map<number, ReturnType<typeof setTimeout>>()

  function dismiss(id: number) {
    const timer = timers.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.delete(id)
    }
    toasts.value = toasts.value.filter(t => t.id !== id)
  }

  function show(options: {
    title: string
    text?: string
    icon?: ToastIcon
    duration?: number
  }) {
    const toast: Toast = {
      id: nextId++,
      title: options.title,
      text: options.text,
      icon: options.icon === undefined ? 'loader' : options.icon,
      duration: options.duration ?? 2600,
    }

    toasts.value = [...toasts.value, toast].slice(-MAX_VISIBLE)

    if (toast.duration > 0 && import.meta.client) {
      timers.set(toast.id, setTimeout(() => dismiss(toast.id), toast.duration))
    }

    return () => dismiss(toast.id)
  }

  const success = (title: string, text?: string) =>
    show({ title, text, icon: 'check', duration: 3200 })

  const error = (title: string, text?: string) =>
    show({ title, text, icon: 'fail', duration: 4000 })

  const info = (title: string, text?: string) =>
    show({ title, text, icon: null })

  return { toasts, show, success, error, info, dismiss }
}
