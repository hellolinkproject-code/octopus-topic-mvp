import { randomUUID } from 'node:crypto'
import assert from 'node:assert/strict'
import { essayPromptBank, writingPromptBank } from '../src/data/mockData.js'
import { getOfficialDailyQuiz } from '../api/_lib/officialQuiz.js'
import { getKstDateKey, getDateKeyDayNumber } from '../src/lib/kstDate.js'
const base = process.argv[2] || 'http://127.0.0.1:5173'
let token
async function call(path, body, method = 'POST') {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(75000),
  })
  return { status: response.status, body: await response.json() }
}
const login = await call('/api/auth/login', {
  email: `mission8-check-${randomUUID()}@example.com`,
  password: randomUUID(),
  name: 'Mission 8 test',
})
assert.equal(login.status, 200)
token = login.body.accessToken
const date = getKstDateKey()
const quiz = getOfficialDailyQuiz(date)
const payload = { quizId: quiz.id, selections: quiz.questions.map((question) => question.answer) }
const quizResults = await Promise.all([
  call('/api/quiz-attempts', payload),
  call('/api/quiz-attempts', payload),
])
if (quizResults.some((r) => r.status !== 200)) {
  const diagnostic = await call('/api/me', null, 'GET')
  console.log('Concurrent request diagnostic:', {
    status: diagnostic.status,
    revision: diagnostic.body.state?.revision,
    points: diagnostic.body.state?.points,
  })
}
assert.ok(
  quizResults.every((r) => r.status === 200),
  JSON.stringify(quizResults.map((r) => ({ status: r.status, error: r.body.error }))),
)
let state = (await call('/api/me', null, 'GET')).body.state
assert.equal(state.points, 50)
console.log('PASS: login, server quiz scoring, concurrent duplicate reward prevention')
const day = getDateKeyDayNumber(date)
async function save(number) {
  const bank = number === 53 ? writingPromptBank : essayPromptBank
  const prompt = bank[day % bank.length]
  const text =
    number === 53
      ? '자료의 수치를 비교하면 항목에 따른 차이를 확인할 수 있다. '
      : '사회가 변화하면서 서로 다른 의견을 이해하고 문제를 해결하는 노력이 중요해지고 있다. 개인의 실천과 사회의 지원이 함께 이루어져야 한다. '
  const length = number === 53 ? 220 : 650
  return call('/api/answers', {
    title: prompt.title,
    promptNumber: number,
    promptId: prompt.id,
    promptDate: date,
    content: text.repeat(30).slice(0, length).padEnd(length, '다'),
  })
}
const graph = await save(53)
assert.equal(graph.status, 201)
assert.equal(graph.body.state.points, 80)
const essay = await save(54)
assert.equal(essay.status, 201)
assert.equal(essay.body.answer.earnedPoints, 0)
assert.equal(essay.body.state.points, 80)
const retry = await save(54)
assert.equal(retry.status, 200)
assert.equal(retry.body.state.points, 80)
console.log(
  'PASS: Question 53 earns 30P; Question 54 saves free; repeated saves do not award points',
)
const invalid = await call('/api/feedback', { answerId: essay.body.answer.id, consent: false })
assert.equal(invalid.status, 400)
if (process.argv.includes('--feedback')) {
  const feedback = await call('/api/feedback', { answerId: essay.body.answer.id, consent: true })
  if (feedback.status === 503 && feedback.body.error.code === 'AI_NOT_CONFIGURED') {
    state = (await call('/api/me', null, 'GET')).body.state
    assert.equal(state.points, 80)
    console.log(
      'PASS: missing OpenAI key returns explicit setup error and does not charge points. Live AI success NOT verified.',
    )
  } else {
    assert.equal(feedback.status, 200, feedback.body.error?.code)
    assert.equal(feedback.body.state.points, 30)
    assert.ok(feedback.body.feedback.summary)
    const repeat = await call('/api/feedback', { answerId: essay.body.answer.id, consent: true })
    assert.equal(repeat.body.charged, false)
    assert.equal(repeat.body.state.points, 30)
    console.log('PASS: live AI result saved, charged once, and reused without another charge')
  }
}
console.log(
  'Smoke checks complete. One synthetic demo account remains for this run; no real learner data was modified.',
)
