import { essayPromptBank, writingPromptBank } from '../data/mockData'
import { getDailyQuizForClient } from './officialQuiz'
import { getWritingTaskNumber, isEssayTask, WRITING_TASK } from './writingTask'

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
  return getDailyQuizForClient(date)
}

export function getDailyWritingPrompt(
  questionNumberOrDate = WRITING_TASK.GRAPH,
  selectedDate = new Date(),
) {
  const questionNumber =
    questionNumberOrDate instanceof Date
      ? WRITING_TASK.GRAPH
      : getWritingTaskNumber(questionNumberOrDate)
  const date = questionNumberOrDate instanceof Date ? questionNumberOrDate : selectedDate
  const dateKey = getLocalDateKey(date)
  const bank = isEssayTask(questionNumber) ? essayPromptBank : writingPromptBank
  const prompt = bank[getDayNumber(date) % bank.length]
  return {
    ...prompt,
    dateKey,
    dailyId: `writing-${prompt.number}-${dateKey}-${prompt.id}`,
  }
}
