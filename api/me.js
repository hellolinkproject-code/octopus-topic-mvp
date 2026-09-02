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

const quizSchema = z.object({
  action: z.literal('completeQuiz'),
  quizId: z.string().min(1).max(100),
  result: z.object({
    selections: z.array(z.number().int().nonnegative()),
    questions: z.array(z.record(z.string(), z.unknown())).min(1).max(50),
    quizId: z.string().min(1).max(100),
    quizDate: z.string().max(50),
    completedAt: z.string().max(50),
  }),
})

function calculateResult(result) {
  const correctCount = result.questions.reduce(
    (count, question, index) => count + (result.selections[index] === question.answer ? 1 : 0),
    0,
  )
  const total = result.questions.length
  return {
    ...result,
    correctCount,
    total,
    score: Math.round((correctCount / total) * 100),
    earnedPoints: correctCount * 10 + 20,
  }
}

export default async function handler(request, response) {
  if (!['GET', 'PATCH'].includes(request.method)) return invalidMethod(response, ['GET', 'PATCH'])

  const userId = await requireUserId(request)
  if (!userId) return unauthorized(response)

  try {
    const user = await readUser(userId)
    if (!user) return sendError(response, 404, 'USER_NOT_FOUND', '사용자 정보를 찾을 수 없습니다.')
    if (request.method === 'GET') return response.status(200).json(publicState(user))

    const parsed = quizSchema.safeParse(request.body)
    if (!parsed.success) return validationError(response, parsed.error)
    if (parsed.data.quizId !== parsed.data.result.quizId) {
      return sendError(response, 400, 'QUIZ_ID_MISMATCH', '퀴즈 식별자가 일치하지 않습니다.')
    }

    const result = calculateResult(parsed.data.result)
    const alreadyCompleted = user.completedQuizIds.includes(parsed.data.quizId)
    const nextUser = await writeUser({
      ...user,
      points: alreadyCompleted ? user.points : user.points + result.earnedPoints,
      completedQuizIds: alreadyCompleted
        ? user.completedQuizIds
        : [...user.completedQuizIds, parsed.data.quizId],
      latestQuizResult: { ...result, awarded: !alreadyCompleted },
    })
    return response.status(200).json(publicState(nextUser))
  } catch (error) {
    return serverError(response, error)
  }
}
