import { z } from 'zod'
import { requireUserId } from './_lib/auth.js'
import { requestFeedback } from './_lib/feedback.js'
import { invalidMethod, serverError, unauthorized, validationError } from './_lib/http.js'
import { publicState } from './_lib/store.js'

const schema = z.object({ answerId: z.string().min(1).max(100), consent: z.literal(true) }).strict()

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store')
  if (request.method !== 'POST') return invalidMethod(response, ['POST'])
  const userId = await requireUserId(request)
  if (!userId) return unauthorized(response)
  const parsed = schema.safeParse(request.body)
  if (!parsed.success) return validationError(response, parsed.error)
  try {
    const { user, feedback, charged } = await requestFeedback(userId, parsed.data.answerId)
    return response.status(200).json({ feedback, charged, state: publicState(user) })
  } catch (error) {
    return serverError(response, error)
  }
}
