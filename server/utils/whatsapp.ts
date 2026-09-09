/**
 * Отправка кода подтверждения в WhatsApp.
 *
 * Если в окружении заданы реквизиты WhatsApp Cloud API — уходит настоящее
 * сообщение по шаблону. Если нет, работает демонстрационный режим: код
 * пишется в лог сервера и возвращается клиенту, чтобы вход можно было
 * пройти без подключённого бизнес-аккаунта.
 */

export interface DeliveryResult {
  /** Ушло ли сообщение в настоящий WhatsApp. */
  delivered: boolean
  /** Код, показываемый в интерфейсе. Только в демо-режиме. */
  devCode?: string
  error?: string
}

interface WhatsAppConfig {
  token: string
  phoneNumberId: string
  template: string
  locale: string
  apiVersion: string
}

function readConfig(): WhatsAppConfig | null {
  const config = useRuntimeConfig()
  const token = String(config.whatsappToken ?? '')
  const phoneNumberId = String(config.whatsappPhoneNumberId ?? '')

  if (!token || !phoneNumberId) return null

  return {
    token,
    phoneNumberId,
    template: String(config.whatsappTemplate ?? 'pharmago_otp'),
    locale: String(config.whatsappLocale ?? 'ru'),
    apiVersion: String(config.whatsappApiVersion ?? 'v21.0'),
  }
}

/** Настроена ли настоящая отправка. */
export const isWhatsAppConfigured = (): boolean => readConfig() !== null

export async function sendOtpViaWhatsApp(
  phone: string,
  code: string,
): Promise<DeliveryResult> {
  const config = readConfig()

  if (!config) {
    // Демо-режим: без реквизитов Cloud API отправлять некуда.
    console.info(`[whatsapp] демо-режим, код для ${phone}: ${code}`)
    return { delivered: false, devCode: code }
  }

  const to = phone.replace(/\D/g, '')

  try {
    await $fetch(
      `https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.token}`,
          'Content-Type': 'application/json',
        },
        body: {
          messaging_product: 'whatsapp',
          to,
          type: 'template',
          template: {
            name: config.template,
            language: { code: config.locale },
            components: [
              // Тело шаблона: {{1}} — сам код.
              { type: 'body', parameters: [{ type: 'text', text: code }] },
              // Кнопка «копировать код» у authentication-шаблонов.
              {
                type: 'button',
                sub_type: 'url',
                index: '0',
                parameters: [{ type: 'text', text: code }],
              },
            ],
          },
        },
      },
    )

    return { delivered: true }
  }
  catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    console.error('[whatsapp] не удалось отправить код:', message)
    // Наружу подробности не отдаём — только факт неудачи.
    return { delivered: false, error: 'delivery-failed' }
  }
}
