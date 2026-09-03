import { quizQuestionBank } from '../data/quizQuestionBank'
import { getDateKeyDayNumber, getKstDateKey } from './kstDate'

export { getKstDateKey, getPreviousKstDateKey } from './kstDate'

export function getPublicDailyQuiz(dateKey) {
  const dayNumber = getDateKeyDayNumber(dateKey)
  if (dayNumber === null) return null
  const questions = Object.values(quizQuestionBank).map((pool, poolIndex) => ({
    ...pool[(dayNumber * (poolIndex + 1) + poolIndex * 3) % pool.length],
    number: poolIndex + 1,
  }))
  return { id: `daily-quiz-${dateKey}`, dateKey, questions }
}

export function getDailyQuizForClient(date = new Date()) {
  return getPublicDailyQuiz(getKstDateKey(date))
}
