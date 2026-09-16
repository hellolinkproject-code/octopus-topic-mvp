import { requireUserId } from './_lib/auth.js'
import { invalidMethod, sendError, serverError, unauthorized } from './_lib/http.js'
import { publicState, readUser } from './_lib/store.js'

export default async function handler(request, response) {
  if (request.method !== 'GET') return invalidMethod(response, ['GET'])

  const userId = await requireUserId(request)
  if (!userId) return unauthorized(response)

  try {
    const user = await readUser(userId)
    if (!user) return sendError(response, 404, 'USER_NOT_FOUND', '사용자 정보를 찾을 수 없습니다.')
    return response.status(200).json({ state: publicState(user) })
  } catch (error) {
    return serverError(response, error)
  }
}
