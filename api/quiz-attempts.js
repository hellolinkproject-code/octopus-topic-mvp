import { z } from 'zod'
import { requireUserId } from './_lib/auth.js'
import {
  invalidMethod,
  sendError,
  serverError,
  unauthorized,
  validationError,
} from './_lib/http.js'
import { resolveAllowedOfficialQuiz } from './_lib/officialQuiz.js'
import { publicState, readUser, updateUser } from './_lib/store.js'

const schema = z
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
  if (request.method !== 'POST') return invalidMethod(response, ['POST'])

  const userId = await requireUserId(request)
  if (!userId) return unauthorized(response)

  try {
    const user = await readUser(userId)
    if (!user) return sendError(response, 404, 'USER_NOT_FOUND', '사용자 정보를 찾을 수 없습니다.')

    const parsed = schema.safeParse(request.body)
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
    const nextUser = await updateUser(userId, (current) => {
      const alreadyCompleted = current.completedQuizIds.includes(parsed.data.quizId)
      return {
        ...current,
        points: alreadyCompleted ? current.points : current.points + result.earnedPoints,
        completedQuizIds: alreadyCompleted
          ? current.completedQuizIds
          : [...current.completedQuizIds, parsed.data.quizId],
        latestQuizResult: { ...result, awarded: !alreadyCompleted },
      }
    })
    return response.status(200).json({ state: publicState(nextUser) })
  } catch (error) {
    return serverError(response, error)
  }
}
