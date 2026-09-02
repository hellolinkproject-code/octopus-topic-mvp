import { z } from 'zod'
import {
  createAccessToken,
  createPasswordRecord,
  normalizeEmail,
  userIdFromEmail,
  verifyPassword,
} from './_lib/auth.js'
import { invalidMethod, sendError, serverError, validationError } from './_lib/http.js'
import { createUser, publicState, readUser, writeUser } from './_lib/store.js'

const schema = z.object({
  email: z.email('올바른 이메일 주소를 입력해 주세요.'),
  password: z.string().min(4, '비밀번호는 4자 이상이어야 합니다.').max(100),
  name: z.string().trim().min(1).max(50).optional(),
})

export default async function handler(request, response) {
  if (request.method !== 'POST') return invalidMethod(response, ['POST'])

  const parsed = schema.safeParse(request.body)
  if (!parsed.success) return validationError(response, parsed.error)

  try {
    const email = normalizeEmail(parsed.data.email)
    const id = userIdFromEmail(email)
    let user = await readUser(id)
    if (!user) {
      user = await writeUser(
        createUser({
          id,
          email,
          name: parsed.data.name || email.split('@')[0],
          passwordRecord: createPasswordRecord(parsed.data.password),
        }),
      )
    } else if (!user.passwordHash) {
      user = await writeUser({ ...user, ...createPasswordRecord(parsed.data.password) })
    } else if (!verifyPassword(parsed.data.password, user)) {
      return sendError(
        response,
        401,
        'INVALID_CREDENTIALS',
        '이메일 또는 비밀번호가 올바르지 않습니다.',
      )
    }
    const accessToken = await createAccessToken(id)
    return response.status(200).json({ accessToken, expiresIn: 604800, state: publicState(user) })
  } catch (error) {
    return serverError(response, error)
  }
}
