import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import answersHandler from '../api/answers.js'
import loginHandler from '../api/auth-login.js'
import meHandler from '../api/me.js'
import { createAccessToken } from '../api/_lib/auth.js'
import { getOfficialDailyQuiz } from '../api/_lib/officialQuiz.js'

const NOW = new Date('2026-09-02T15:00:00.000Z')
const QUIZ_ID = 'daily-quiz-2026-09-03'

function request(method, body, token) {
  return { method, body, headers: token ? { authorization: `Bearer ${token}` } : {} }
}

function response() {
  return {
    statusCode: 200,
    headers: {},
    setHeader(name, value) {
      this.headers[name] = value
    },
    status(code) {
      this.statusCode = code
      return this
    },
    json(body) {
      this.body = body
      return this
    },
  }
}

async function call(handler, req) {
  const res = response()
  await handler(req, res)
  return res
}

describe('Mission 7 API contracts', () => {
  let token
  let userId

  beforeAll(async () => {
    process.env.JWT_SECRET = 'test-secret-that-is-long-enough-for-mission-seven'
    delete process.env.BLOB_READ_WRITE_TOKEN
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
    const login = await call(
      loginHandler,
      request('POST', {
        email: `api-${Date.now()}@example.com`,
        password: 'demo-password',
        name: 'API Tester',
      }),
    )
    token = login.body.accessToken
    userId = login.body.state.user.id
  })

  afterAll(() => vi.useRealTimers())

  it('returns 401 for missing, malformed, and expired JWTs', async () => {
    const expired = await createAccessToken(userId, '-1s')
    for (const invalidToken of [undefined, 'not-a-jwt', expired]) {
      const res = await call(meHandler, request('GET', undefined, invalidToken))
      expect(res.statusCode).toBe(401)
      expect(res.body.error).toMatchObject({ code: 'UNAUTHORIZED' })
    }
  })

  it('returns the documented 400 and 405 error contracts', async () => {
    const invalidLogin = await call(loginHandler, request('POST', { email: 'bad', password: '1' }))
    expect(invalidLogin.statusCode).toBe(400)
    expect(invalidLogin.body.error).toMatchObject({ code: 'VALIDATION_ERROR' })

    const wrongMethod = await call(meHandler, request('POST', {}, token))
    expect(wrongMethod.statusCode).toBe(405)
    expect(wrongMethod.headers.Allow).toBe('GET, PATCH')
    expect(wrongMethod.body.error).toMatchObject({ code: 'METHOD_NOT_ALLOWED' })
  })

  it('returns 404 for an unknown quiz', async () => {
    const res = await call(
      meHandler,
      request('PATCH', { quizId: 'daily-quiz-2020-01-01', selections: [0, 0, 0] }, token),
    )
    expect(res.statusCode).toBe(404)
    expect(res.body.error).toMatchObject({ code: 'QUIZ_NOT_FOUND' })
  })

  it('rejects extra quiz fields and cannot trust forged answers', async () => {
    const before = await call(meHandler, request('GET', undefined, token))
    const forged = await call(
      meHandler,
      request(
        'PATCH',
        {
          quizId: QUIZ_ID,
          selections: [0, 0, 0],
          questions: [{ answer: 0 }, { answer: 0 }, { answer: 0 }],
          score: 100,
          earnedPoints: 9999,
        },
        token,
      ),
    )
    expect(forged.statusCode).toBe(400)
    expect(forged.body.error.code).toBe('VALIDATION_ERROR')
    const after = await call(meHandler, request('GET', undefined, token))
    expect(after.body.points).toBe(before.body.points)
  })

  it('rejects mismatched counts and out-of-range selections', async () => {
    const count = await call(
      meHandler,
      request('PATCH', { quizId: QUIZ_ID, selections: [0] }, token),
    )
    expect(count.statusCode).toBe(400)
    expect(count.body.error.code).toBe('SELECTION_COUNT_MISMATCH')

    const range = await call(
      meHandler,
      request('PATCH', { quizId: QUIZ_ID, selections: [0, 99, 0] }, token),
    )
    expect(range.statusCode).toBe(400)
    expect(range.body.error.code).toBe('SELECTION_OUT_OF_RANGE')
  })

  it('scores from the official bank, returns review data, and awards once', async () => {
    const quiz = getOfficialDailyQuiz('2026-09-03')
    const selections = quiz.questions.map((question) => question.answer)
    const before = await call(meHandler, request('GET', undefined, token))
    const first = await call(meHandler, request('PATCH', { quizId: QUIZ_ID, selections }, token))
    expect(first.statusCode).toBe(200)
    expect(first.body.points).toBe(before.body.points + 50)
    expect(first.body.latestQuizResult).toMatchObject({
      score: 100,
      earnedPoints: 50,
      awarded: true,
    })
    expect(first.body.latestQuizResult.questions[0]).toHaveProperty('answer')
    expect(first.body.latestQuizResult.questions[0]).toHaveProperty('explanation')

    const second = await call(meHandler, request('PATCH', { quizId: QUIZ_ID, selections }, token))
    expect(second.statusCode).toBe(200)
    expect(second.body.points).toBe(first.body.points)
    expect(second.body.latestQuizResult.awarded).toBe(false)
  })

  it('stores an answer once and makes a sequential retry idempotent', async () => {
    const content = '가'.repeat(200)
    const payload = {
      title: '53번 테스트',
      promptNumber: 53,
      promptId: 'prompt-53-a',
      promptDate: '2026-09-03',
      content,
      characterCount: content.length,
    }
    const before = await call(meHandler, request('GET', undefined, token))
    const first = await call(answersHandler, request('POST', payload, token))
    expect(first.statusCode).toBe(201)
    expect(first.body.awarded).toBe(true)
    expect(first.body.state.points).toBe(before.body.points + 30)

    const retry = await call(answersHandler, request('POST', payload, token))
    expect(retry.statusCode).toBe(200)
    expect(retry.body.awarded).toBe(false)
    expect(retry.body.answer.id).toBe(first.body.answer.id)
    expect(retry.body.state.points).toBe(first.body.state.points)
    expect(retry.body.state.answers).toHaveLength(first.body.state.answers.length)
  })

  it('stores different prompts independently', async () => {
    const content = '나'.repeat(200)
    const before = await call(meHandler, request('GET', undefined, token))
    const saved = await call(
      answersHandler,
      request(
        'POST',
        {
          title: '다른 53번 테스트',
          promptNumber: 53,
          promptId: 'prompt-53-b',
          promptDate: '2026-09-03',
          content,
          characterCount: content.length,
        },
        token,
      ),
    )
    expect(saved.statusCode).toBe(201)
    expect(saved.body.awarded).toBe(true)
    expect(saved.body.state.points).toBe(before.body.points + 30)
    expect(saved.body.state.answers).toHaveLength(before.body.answers.length + 1)
  })
})
