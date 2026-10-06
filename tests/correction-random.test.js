import { describe, expect, it, vi } from 'vitest'
import { essayPromptBank, writingPromptBank } from '../src/data/mockData'
import { correctionQuestionText, randomCorrectionAnswer } from '../src/lib/correctionPrompts'

describe('Original writing bank and random assignment', () => {
  it('contains 120 distinct complete problems with valid charts and tasks', () => {
    const bank = [...writingPromptBank, ...essayPromptBank]
    expect(bank).toHaveLength(120)
    expect(new Set(bank.map((prompt) => prompt.id)).size).toBe(120)
    expect(new Set(bank.map((prompt) => prompt.title)).size).toBe(120)
    expect(new Set(bank.map(correctionQuestionText)).size).toBe(120)
    for (const prompt of bank) {
      expect(prompt.questions).toHaveLength(3)
      expect(new Set(prompt.questions).size).toBe(3)
      expect(prompt.description).toBeTruthy()
      expect(prompt.source).toContain('자체 제작')
      if (prompt.number === 53) {
        expect(prompt.chartData).toHaveLength(3)
        expect(prompt.series).toHaveLength(2)
        for (const row of prompt.chartData) {
          expect(row.values.map((item) => item.series)).toEqual(
            prompt.series.map((item) => item.key),
          )
          for (const item of row.values) {
            expect(item.value).toBeGreaterThanOrEqual(0)
            expect(item.value).toBeLessThanOrEqual(100)
            expect(correctionQuestionText(prompt)).toContain(String(item.value))
          }
        }
      } else {
        expect(prompt.topic).toBeTruthy()
        expect(prompt.outline).toHaveLength(3)
        expect(prompt.description).toContain('600~700자')
      }
    }
  })
  it.each([53, 54])(
    'persists random %s assignment and excludes the previous problem on reroll',
    (number) => {
      const values = new Map()
      const storage = {
        getItem: (key) => values.get(key),
        setItem: (key, value) => values.set(key, value),
      }
      const first = randomCorrectionAnswer(number, undefined, storage)
      const again = randomCorrectionAnswer(number, undefined, storage)
      expect(again).toEqual(first)
      const next = randomCorrectionAnswer(number, first.source.slice(7), storage)
      expect(next.source).not.toBe(first.source)
      expect(randomCorrectionAnswer(number, undefined, storage)).toEqual(next)
      expect(next.answerText).toBe('')
      expect(next.file).toBeNull()
    },
  )
  it('recovers from obsolete stored IDs and unavailable session storage', () => {
    const stale = { getItem: () => 'deleted-problem', setItem: vi.fn() }
    expect(randomCorrectionAnswer(53, undefined, stale).questionText).toContain('TOPIK II 53')
    const blocked = {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('blocked')
      },
    }
    expect(randomCorrectionAnswer(54, undefined, blocked).questionText).toContain('TOPIK II 54')
  })
})
