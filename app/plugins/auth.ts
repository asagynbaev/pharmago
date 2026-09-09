/**
 * Подтягивает текущего пользователя до маршрутизации.
 *
 * Плагины выполняются раньше route middleware, поэтому к моменту проверки
 * доступа в кабинет состояние уже известно. Если делать это в app.vue,
 * middleware отработает на пустом состоянии и уведёт гостя со входа
 * по кругу.
 */
export default defineNuxtPlugin(async () => {
  const { ready, fetchUser } = useAuth()
  // На клиенте состояние приезжает в payload — повторный запрос не нужен.
  if (!ready.value) await fetchUser()
})
