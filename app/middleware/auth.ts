/** Пускает в кабинет только вошедших, запомнив, куда человек шёл. */
export default defineNuxtRouteMiddleware((to) => {
  const { isAuthenticated } = useAuth()
  if (isAuthenticated.value) return

  return navigateTo({
    path: '/login',
    query: to.fullPath === '/account' ? undefined : { redirect: to.fullPath },
  })
})
