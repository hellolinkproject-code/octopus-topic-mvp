import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import feedbackHandler from '../api/feedback.js'
import * as userStore from '../api/_lib/store.js'
import { requestFeedback } from '../api/_lib/feedback.js'
import { createUser, readUser, updateUser } from '../api/_lib/store.js'
import { createAccessToken } from '../api/_lib/auth.js'

const content = '온라인 정보의 출처를 확인해야 한다. '.repeat(30).padEnd(600, '가').slice(0, 650)
const result = {
  summary: '정보를 확인하려는 주장이 명확합니다.',
  strengths: ['주제를 제시했습니다.'],
  improvements: ['반복 대신 구체적인 예를 들어 보세요.'],
  corrections: [
    {
      original: '온라인 정보의 출처를 확인해야 한다.',
      revised: '온라인 정보는 출처를 확인한 후 받아들여야 한다.',
      reason: '판단의 순서를 명확히 표현합니다.',
    },
  ],
  nextSteps: ['사회적 영향에 관한 예를 한 가지 덧붙여 보세요.'],
}
const providerPayload = (feedback = result) => ({
  status: 'completed',
  output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(feedback) }] }],
})
let serial = 0
async function seed(
  points = 100,
  answers = [{ id: 'answer-a', promptNumber: 54, promptId: 'digital-literacy', content }],
) {
  const id = `feedback-test-${++serial}`
  await updateUser(id, () => ({
    ...createUser({ id, email: 'test@example.com', name: 'Test' }),
    points,
    answers,
  }))
  return id
}
function response() {
  return {
    statusCode: 200,
    setHeader() {},
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
beforeEach(() => {
  vi.stubEnv('OPENAI_API_KEY', 'test-only-not-a-real-key')
  vi.stubEnv('JWT_SECRET', 'test-only-long-jwt-secret-not-for-production')
  vi.stubEnv('BLOB_READ_WRITE_TOKEN', '')
  vi.stubEnv('BLOB_STORE_ID', '')
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({ ok: true, json: async () => providerPayload() }),
  )
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('Mission 8 feedback', () => {
  it('saves feedback and charges once; a revisit performs no provider call', async () => {
    const id = await seed()
    const first = await requestFeedback(id, 'answer-a')
    expect(first.user.points).toBe(50)
    expect(first.feedback.summary).toBe(result.summary)
    expect(first.charged).toBe(true)
    const second = await requestFeedback(id, 'answer-a')
    expect(second.user.points).toBe(50)
    expect(second.charged).toBe(false)
    expect(fetch).toHaveBeenCalledTimes(1)
    expect((await readUser(id)).answers[0].aiFeedback).toEqual(first.feedback)
    const request = JSON.parse(fetch.mock.calls[0][1].body)
    expect(request.store).toBe(false)
    expect(request.input).not.toContain('test@example.com')
    expect(request.text.format.strict).toBe(true)
  })
  it('prevents concurrent generation while allowing unrelated point awards', async () => {
    const id = await seed()
    let release
    let started
    const entered = new Promise((resolve) => {
      started = resolve
    })
    fetch.mockImplementationOnce(() => {
      started()
      return new Promise((resolve) => {
        release = resolve
      })
    })
    const first = requestFeedback(id, 'answer-a')
    await entered
    await expect(requestFeedback(id, 'answer-a')).rejects.toMatchObject({ code: 'FEEDBACK_BUSY' })
    await updateUser(id, (user) => ({ ...user, points: user.points + 30 }))
    release({ ok: true, json: async () => providerPayload() })
    await first
    expect((await readUser(id)).points).toBe(80)
    expect(fetch).toHaveBeenCalledTimes(1)
  })
  it('does not spend points on a provider failure and permits retry', async () => {
    const id = await seed()
    fetch.mockResolvedValueOnce({ ok: false })
    await expect(requestFeedback(id, 'answer-a')).rejects.toMatchObject({ code: 'AI_UNAVAILABLE' })
    expect((await readUser(id)).points).toBe(100)
    expect((await readUser(id)).feedbackJob).toBeNull()
    await requestFeedback(id, 'answer-a')
    expect((await readUser(id)).points).toBe(50)
  })
  it.each([
    ['incomplete', { status: 'incomplete', output: [] }, 'AI_INCOMPLETE'],
    [
      'refusal',
      { status: 'completed', output: [{ content: [{ type: 'refusal' }] }] },
      'AI_REFUSED',
    ],
    ['malformed', providerPayload({}), 'AI_INVALID_RESULT'],
    [
      'fabricated quote',
      providerPayload({
        ...result,
        corrections: [{ original: 'This was not written.', revised: 'No.', reason: 'No.' }],
      }),
      'AI_INVALID_RESULT',
    ],
  ])('rejects %s without charging', async (_, payload, code) => {
    const id = await seed()
    fetch.mockResolvedValueOnce({ ok: true, json: async () => payload })
    await expect(requestFeedback(id, 'answer-a')).rejects.toMatchObject({ code })
    expect((await readUser(id)).points).toBe(100)
  })
  it('handles a timeout without charging', async () => {
    const id = await seed()
    fetch.mockRejectedValueOnce(new DOMException('timeout', 'TimeoutError'))
    await expect(requestFeedback(id, 'answer-a')).rejects.toMatchObject({ code: 'AI_TIMEOUT' })
    expect((await readUser(id)).points).toBe(100)
  })
  it('accepts a useful response with no sentence corrections', async () => {
    const id = await seed()
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => providerPayload({ ...result, corrections: [] }),
    })
    expect((await requestFeedback(id, 'answer-a')).feedback.corrections).toEqual([])
  })
  it('checks ownership, question type, points, and configuration before calling AI', async () => {
    const id = await seed(20)
    await expect(requestFeedback(id, 'someone-else')).rejects.toMatchObject({ status: 404 })
    await expect(requestFeedback(id, 'answer-a')).rejects.toMatchObject({
      code: 'INSUFFICIENT_POINTS',
    })
    const graph = await seed(100, [{ id: 'graph', promptNumber: 53 }])
    await expect(requestFeedback(graph, 'graph')).rejects.toMatchObject({ code: 'ESSAY_REQUIRED' })
    vi.stubEnv('OPENAI_API_KEY', '')
    await expect(requestFeedback(id, 'answer-a')).rejects.toMatchObject({
      code: 'AI_NOT_CONFIGURED',
    })
    expect(fetch).not.toHaveBeenCalled()
  })
  it('rejects unauthenticated requests, extra fields, and missing consent', async () => {
    const res = response()
    await feedbackHandler({ method: 'POST', headers: {}, body: {} }, res)
    expect(res.statusCode).toBe(401)
    const id = await seed()
    const token = await createAccessToken(id)
    for (const body of [
      { answerId: 'answer-a' },
      { answerId: 'answer-a', consent: true, cost: 0 },
    ]) {
      const invalid = response()
      await feedbackHandler(
        { method: 'POST', headers: { authorization: `Bearer ${token}` }, body },
        invalid,
      )
      expect(invalid.statusCode).toBe(400)
    }
    expect(fetch).not.toHaveBeenCalled()
  })
  it('limits daily attempts, including failures, before calling AI', async () => {
    const id = await seed()
    fetch.mockResolvedValue({ ok: false })
    for (let i = 0; i < 5; i++)
      await expect(requestFeedback(id, 'answer-a')).rejects.toMatchObject({
        code: 'AI_UNAVAILABLE',
      })
    await expect(requestFeedback(id, 'answer-a')).rejects.toMatchObject({ code: 'DAILY_LIMIT' })
    expect(fetch).toHaveBeenCalledTimes(5)
  })
  it('recovers an expired reservation without a point charge for the old job', async () => {
    const id = await seed()
    await updateUser(id, (user) => ({
      ...user,
      feedbackJob: { id: 'old', answerId: 'answer-a', expiresAt: Date.now() - 1 },
    }))
    await requestFeedback(id, 'answer-a')
    expect((await readUser(id)).points).toBe(50)
  })
  it('retains all concurrent updates rather than overwriting stale snapshots', async () => {
    const id = await seed(0)
    await Promise.all(
      Array.from({ length: 6 }, () =>
        updateUser(id, (user) => ({ ...user, points: user.points + 10 })),
      ),
    )
    expect((await readUser(id)).points).toBe(60)
  })
})

describe('feedback persistence failures', () => {
  it('does not charge or store a result when the final write fails', async () => {
    const id = await seed()
    const update = userStore.updateUser
    vi.spyOn(userStore, 'updateUser').mockImplementation((key, change) =>
      update(key, (user) => {
        const next = change(user)
        if (next?.answers.some((answer) => answer.aiFeedback))
          throw new Error('storage unavailable')
        return next
      }),
    )
    await expect(requestFeedback(id, 'answer-a')).rejects.toThrow('storage unavailable')
    const user = await readUser(id)
    expect(user.points).toBe(100)
    expect(user.answers[0].aiFeedback).toBeUndefined()
    expect(user.feedbackJob).toBeNull()
  })
  it('reconciles a committed result after the write response is lost', async () => {
    const id = await seed()
    const update = userStore.updateUser
    vi.spyOn(userStore, 'updateUser').mockImplementation(async (key, change) => {
      const saved = await update(key, change)
      if (saved.answers.some((answer) => answer.aiFeedback)) throw new Error('response lost')
      return saved
    })
    const response = await requestFeedback(id, 'answer-a')
    expect(response.user.points).toBe(50)
    expect(response.feedback.summary).toBe(result.summary)
    expect(fetch).toHaveBeenCalledTimes(1)
  })
})
