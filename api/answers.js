import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { requireUserId } from './_lib/auth.js'
import {
  invalidMethod,
  sendError,
  serverError,
  unauthorized,
  validationError,
} from './_lib/http.js'
import { publicState, readUser, writeUser } from './_lib/store.js'

const limits = {
  53: { min: 200, max: 300, reward: 30 },
  54: { min: 600, max: 700, reward: 50 },
}

const schema = z.object({
  title: z.string().trim().min(1).max(200),
  promptNumber: z.union([z.literal(53), z.literal(54)]),
  promptId: z.string().min(1).max(100),
  promptDate: z.string().max(50),
  content: z.string().trim().min(1).max(700),
  characterCount: z.number().int().nonnegative().max(700),
  freeFeedback: z.record(z.string(), z.unknown()).optional(),
})

export default async function handler(request, response) {
  if (!['GET', 'POST'].includes(request.method)) return invalidMethod(response, ['GET', 'POST'])

  const userId = await requireUserId(request)
  if (!userId) return unauthorized(response)

  try {
    const user = await readUser(userId)
    if (!user) return sendError(response, 404, 'USER_NOT_FOUND', '사용자 정보를 찾을 수 없습니다.')
    if (request.method === 'GET') return response.status(200).json({ answers: user.answers })

    const parsed = schema.safeParse(request.body)
    if (!parsed.success) return validationError(response, parsed.error)
    const content = parsed.data.content.trim()
    const rule = limits[parsed.data.promptNumber]
    if (content.length < rule.min || content.length > rule.max) {
      return sendError(
        response,
        400,
        'ANSWER_LENGTH_INVALID',
        `${parsed.data.promptNumber}번 답안은 ${rule.min}~${rule.max}자로 작성해 주세요.`,
      )
    }

    const answer = {
      ...parsed.data,
      content,
      characterCount: content.length,
      earnedPoints: rule.reward,
      id: randomUUID(),
      createdAt: new Date().toISOString(),
    }
    const nextUser = await writeUser({
      ...user,
      points: user.points + rule.reward,
      answers: [answer, ...user.answers],
    })
    return response.status(201).json({ answer, state: publicState(nextUser) })
  } catch (error) {
    return serverError(response, error)
  }
}
