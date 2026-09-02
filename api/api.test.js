import { beforeAll, describe, expect, it } from 'vitest'
import answersHandler from './answers.js'
import loginHandler from './auth-login.js'
import meHandler from './me.js'

function request(method, body, token) {
  return {
    method,
    body,
    headers: token ? { authorization: `Bearer ${token}` } : {},
  }
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

describe('Mission 7 API', () => {
  let token
  let email

  beforeAll(() => {
    process.env.JWT_SECRET = 'test-secret-that-is-long-enough-for-mission-seven'
    delete process.env.BLOB_READ_WRITE_TOKEN
  })

  it('rejects invalid login input', async () => {
    const res = await call(loginHandler, request('POST', { email: 'bad', password: '1' }))
    expect(res.statusCode).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
  })

  it('creates a demo user and JWT', async () => {
    email = `api-${Date.now()}@example.com`
    const res = await call(
      loginHandler,
      request('POST', { email, password: 'demo-password', name: 'API Tester' }),
    )
    expect(res.statusCode).toBe(200)
    expect(res.body.state.user.email).toBe(email)
    expect(res.body.state.points).toBe(0)
    token = res.body.accessToken
  })

  it('rejects an incorrect password for an existing user', async () => {
    const res = await call(
      loginHandler,
      request('POST', { email, password: 'wrong-password', name: 'API Tester' }),
    )
    expect(res.statusCode).toBe(401)
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS')
  })

  it('protects profile data with JWT', async () => {
    const unauthorized = await call(meHandler, request('GET'))
    expect(unauthorized.statusCode).toBe(401)

    const authorized = await call(meHandler, request('GET', undefined, token))
    expect(authorized.statusCode).toBe(200)
    expect(authorized.body.user.name).toBe('API Tester')
  })

  it('calculates quiz points on the server and blocks duplicate rewards', async () => {
    const quiz = {
      action: 'completeQuiz',
      quizId: 'test-quiz',
      result: {
        selections: [0, 1],
        questions: [{ answer: 0 }, { answer: 0 }],
        quizId: 'test-quiz',
        quizDate: '2026-09-02',
        completedAt: new Date().toISOString(),
      },
    }
    const first = await call(meHandler, request('PATCH', quiz, token))
    expect(first.statusCode).toBe(200)
    expect(first.body.points).toBe(30)
    expect(first.body.latestQuizResult.awarded).toBe(true)

    const second = await call(meHandler, request('PATCH', quiz, token))
    expect(second.body.points).toBe(30)
    expect(second.body.latestQuizResult.awarded).toBe(false)
  })

  it('validates and stores a writing answer', async () => {
    const invalid = await call(
      answersHandler,
      request(
        'POST',
        {
          title: '53번 테스트',
          promptNumber: 53,
          promptId: 'prompt-53',
          promptDate: '2026-09-02',
          content: '짧은 답안',
          characterCount: 5,
        },
        token,
      ),
    )
    expect(invalid.statusCode).toBe(400)
    expect(invalid.body.error.code).toBe('ANSWER_LENGTH_INVALID')

    const content = '가'.repeat(200)
    const saved = await call(
      answersHandler,
      request(
        'POST',
        {
          title: '53번 테스트',
          promptNumber: 53,
          promptId: 'prompt-53',
          promptDate: '2026-09-02',
          content,
          characterCount: content.length,
        },
        token,
      ),
    )
    expect(saved.statusCode).toBe(201)
    expect(saved.body.answer.earnedPoints).toBe(30)
    expect(saved.body.state.points).toBe(60)

    const list = await call(answersHandler, request('GET', undefined, token))
    expect(list.statusCode).toBe(200)
    expect(list.body.answers).toHaveLength(1)
  })
})
