import { quizQuestionBank, writingPromptBank } from '../data/mockData'

const DAY_MS = 24 * 60 * 60 * 1000

export function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getDayNumber(date = new Date()) {
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY_MS)
}

export function getDailyQuiz(date = new Date()) {
  const dayNumber = getDayNumber(date)
  const dateKey = getLocalDateKey(date)
  const pools = Object.values(quizQuestionBank)
  const questions = pools.map((pool, poolIndex) => ({
    ...pool[(dayNumber * (poolIndex + 1) + poolIndex * 3) % pool.length],
    number: poolIndex + 1,
  }))

  return {
    id: `daily-quiz-${dateKey}`,
    dateKey,
    questions,
  }
}

export function getDailyWritingPrompt(date = new Date()) {
  const dateKey = getLocalDateKey(date)
  const prompt = writingPromptBank[getDayNumber(date) % writingPromptBank.length]
  return {
    ...prompt,
    dateKey,
    dailyId: `writing-53-${dateKey}-${prompt.id}`,
  }
}
