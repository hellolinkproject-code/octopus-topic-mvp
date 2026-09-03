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
import { resolveAllowedOfficialQuiz } from './_lib/officialQuiz.js'

const quizSchema = z
  .object({
    quizId: z.string().min(1).max(100),
    selections: z.array(z.number().int().nonnegative()).max(50),
  })
  .strict()

function calculateResult(quiz, selections) {
  const correctCount = quiz.questions.reduce(
    (count, question, index) => count + (selections[index] === question.answer ? 1 : 0),
    0,
  )
  const total = quiz.questions.length
  return {
    quizId: quiz.id,
    quizDate: quiz.dateKey,
    completedAt: new Date().toISOString(),
    selections,
    questions: quiz.questions,
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
    const quiz = resolveAllowedOfficialQuiz(parsed.data.quizId)
    if (!quiz) {
      return sendError(response, 404, 'QUIZ_NOT_FOUND', '제출할 수 있는 퀴즈를 찾을 수 없습니다.')
    }
    if (parsed.data.selections.length !== quiz.questions.length) {
      return sendError(
        response,
        400,
        'SELECTION_COUNT_MISMATCH',
        '선택한 답의 개수가 문제 개수와 일치하지 않습니다.',
      )
    }
    const hasInvalidSelection = parsed.data.selections.some(
      (selection, index) => selection >= quiz.questions[index].options.length,
    )
    if (hasInvalidSelection) {
      return sendError(response, 400, 'SELECTION_OUT_OF_RANGE', '선택지 범위를 확인해 주세요.')
    }

    const result = calculateResult(quiz, parsed.data.selections)
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
