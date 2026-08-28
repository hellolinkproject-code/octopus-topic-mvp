import { describe, expect, it } from 'vitest'
import { awardQuiz, calculateQuizResult } from './progress'
const questions = [{ answer: 0 }, { answer: 2 }, { answer: 1 }]
describe('quiz progress', () => {
  it('calculates score and points', () =>
    expect(calculateQuizResult(questions, [0, 2, 0])).toEqual({
      correctCount: 2,
      total: 3,
      score: 67,
      earnedPoints: 40,
    }))
  it('awards once per quiz', () => {
    const first = awardQuiz(
      { points: 10, completedQuizIds: [], latestQuizResult: null },
      'daily-1',
      { earnedPoints: 50 },
    )
    const second = awardQuiz(first, 'daily-1', { earnedPoints: 50 })
    expect(first.points).toBe(60)
    expect(second.points).toBe(60)
    expect(second.latestQuizResult.awarded).toBe(false)
  })
})
