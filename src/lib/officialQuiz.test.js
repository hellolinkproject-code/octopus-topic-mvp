import { describe, expect, it } from 'vitest'
import { getDailyQuiz } from './dailyContent'
import { getKstDateKey, getPreviousKstDateKey } from './officialQuiz'
import { getPublicDailyQuiz } from './officialQuiz'
import { resolveAllowedOfficialQuiz } from '../../api/_lib/officialQuiz'

describe('KST official quiz resolver', () => {
  it('switches date keys exactly at KST midnight', () => {
    const beforeMidnight = new Date('2026-09-02T14:59:59.999Z')
    const midnight = new Date('2026-09-02T15:00:00.000Z')
    expect(getKstDateKey(beforeMidnight)).toBe('2026-09-02')
    expect(getPreviousKstDateKey(beforeMidnight)).toBe('2026-09-01')
    expect(getKstDateKey(midnight)).toBe('2026-09-03')
    expect(getPreviousKstDateKey(midnight)).toBe('2026-09-02')
  })

  it('allows only current and previous KST quiz IDs', () => {
    const beforeMidnight = new Date('2026-09-02T14:59:59.999Z')
    expect(resolveAllowedOfficialQuiz('daily-quiz-2026-09-02', beforeMidnight)).not.toBeNull()
    expect(resolveAllowedOfficialQuiz('daily-quiz-2026-09-01', beforeMidnight)).not.toBeNull()
    expect(resolveAllowedOfficialQuiz('daily-quiz-2026-09-03', beforeMidnight)).toBeNull()

    const midnight = new Date('2026-09-02T15:00:00.000Z')
    expect(resolveAllowedOfficialQuiz('daily-quiz-2026-09-03', midnight)).not.toBeNull()
    expect(resolveAllowedOfficialQuiz('daily-quiz-2026-09-02', midnight)).not.toBeNull()
    expect(resolveAllowedOfficialQuiz('daily-quiz-2026-09-01', midnight)).toBeNull()
  })

  it('uses the same question selection on client and server without leaking answers', () => {
    const now = new Date('2026-09-02T15:00:00.000Z')
    const clientQuiz = getDailyQuiz(now)
    const officialQuiz = getPublicDailyQuiz('2026-09-03')
    expect(clientQuiz.questions.map(({ id }) => id)).toEqual(
      officialQuiz.questions.map(({ id }) => id),
    )
    clientQuiz.questions.forEach((question) => {
      expect(question).not.toHaveProperty('answer')
      expect(question).not.toHaveProperty('explanation')
    })
  })
})
