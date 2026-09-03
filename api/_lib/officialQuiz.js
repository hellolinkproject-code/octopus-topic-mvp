import { quizQuestionBank } from '../../src/data/quizQuestionBank.js'
import { getDateKeyDayNumber, getKstDateKey, getPreviousKstDateKey } from '../../src/lib/kstDate.js'
import { quizAnswerKey } from './quizAnswerKey.js'

const QUIZ_ID_PATTERN = /^daily-quiz-(\d{4}-\d{2}-\d{2})$/

export function getOfficialDailyQuiz(dateKey) {
  const dayNumber = getDateKeyDayNumber(dateKey)
  if (dayNumber === null) return null
  const questions = Object.values(quizQuestionBank).map((pool, poolIndex) => {
    const publicQuestion = pool[(dayNumber * (poolIndex + 1) + poolIndex * 3) % pool.length]
    return { ...publicQuestion, ...quizAnswerKey[publicQuestion.id], number: poolIndex + 1 }
  })
  return { id: `daily-quiz-${dateKey}`, dateKey, questions }
}

export function resolveAllowedOfficialQuiz(quizId, now = new Date()) {
  const match = QUIZ_ID_PATTERN.exec(quizId)
  if (!match) return null
  const dateKey = match[1]
  const allowedDates = new Set([getKstDateKey(now), getPreviousKstDateKey(now)])
  return allowedDates.has(dateKey) ? getOfficialDailyQuiz(dateKey) : null
}
