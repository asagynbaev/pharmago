import { requireUser, updateUser } from '../../utils/auth'

/** Правка профиля: имя и адрес доставки по умолчанию. */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const body = await readBody(event)

  const patch: { name?: string, address?: string } = {}

  if (typeof body?.name === 'string') {
    const name = body.name.trim()
    if (name.length > 80) {
      throw createError({ statusCode: 400, statusMessage: 'Имя слишком длинное' })
    }
    patch.name = name
  }

  if (typeof body?.address === 'string') {
    patch.address = body.address.trim().slice(0, 300)
  }

  const updated = await updateUser(user.id, patch)
  return { ok: true, user: updated }
})
