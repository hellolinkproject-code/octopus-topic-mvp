import { describe, expect, it } from 'vitest'
import { essayPromptBank, quizQuestionBank, writingPromptBank } from '../data/mockData'
import { getDailyQuiz, getDailyWritingPrompt, getLocalDateKey } from './dailyContent'

describe('daily problem bank selection', () => {
  it('uses the local calendar date as a stable key', () => {
    expect(getLocalDateKey(new Date(2026, 7, 27, 23, 59))).toBe('2026-08-27')
  })

  it('keeps the same quiz during a day and changes it the next day', () => {
    const morning = getDailyQuiz(new Date(2026, 7, 27, 8))
    const evening = getDailyQuiz(new Date(2026, 7, 27, 22))
    const tomorrow = getDailyQuiz(new Date(2026, 7, 28, 8))

    expect(evening).toEqual(morning)
    expect(tomorrow.id).not.toBe(morning.id)
    expect(tomorrow.questions.map((item) => item.id)).not.toEqual(
      morning.questions.map((item) => item.id),
    )
  })

  it('selects one valid question from each TOPIK-style pool', () => {
    const quiz = getDailyQuiz(new Date(2026, 7, 27))
    const idsByPool = Object.values(quizQuestionBank).map((pool) => pool.map((item) => item.id))

    expect(quiz.questions).toHaveLength(idsByPool.length)
    quiz.questions.forEach((item, index) => expect(idsByPool[index]).toContain(item.id))
  })

  it('keeps every bank item valid and uniquely identifiable', () => {
    const questions = Object.values(quizQuestionBank).flat()
    const ids = questions.map((item) => item.id)

    expect(new Set(ids).size).toBe(ids.length)
    questions.forEach((item) => {
      expect(item.options).toHaveLength(4)
      expect(item.answer).toBeGreaterThanOrEqual(0)
      expect(item.answer).toBeLessThan(4)
      expect(item.options[item.answer]).toBeTruthy()
      expect(item.explanation.length).toBeGreaterThan(10)
    })
  })

  it('rotates writing prompts while preserving the official 53 format', () => {
    const today = getDailyWritingPrompt(new Date(2026, 7, 27))
    const tomorrow = getDailyWritingPrompt(new Date(2026, 7, 28))

    expect(tomorrow.id).not.toBe(today.id)
    expect(today.number).toBe(53)
    expect(today.minCharacters).toBe(200)
    expect(today.maxCharacters).toBe(300)
    expect(writingPromptBank).toHaveLength(12)
  })

  it('rotates original 54 prompts in the official long-form format', () => {
    const today = getDailyWritingPrompt(54, new Date(2026, 7, 27))
    const tomorrow = getDailyWritingPrompt(54, new Date(2026, 7, 28))
    expect(today.number).toBe(54)
    expect(today.minCharacters).toBe(600)
    expect(today.maxCharacters).toBe(700)
    expect(today.questions).toHaveLength(3)
    expect(tomorrow.id).not.toBe(today.id)
    expect(essayPromptBank).toHaveLength(6)
  })
})
