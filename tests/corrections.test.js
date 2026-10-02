import { beforeAll, describe, expect, it } from 'vitest'
import { randomUUID } from 'node:crypto'
import customerApi from '../api/corrections.js'
import adminApi from '../api/admin-corrections.js'
import { createAccessToken } from '../api/_lib/auth.js'
import { adminLogin } from '../api/_lib/correctionAuth.js'
import { readOrders } from '../api/_lib/correctionStore.js'
import { validateFile } from '../api/_lib/corrections.js'
import { IMAGE_LIMIT, PDF_LIMIT } from '../src/lib/correctionProducts.js'
const secret = 'test-only-administrator-secret-over-32-characters'
function payload(productId = 'q54') {
  return {
    idempotencyKey: randomUUID(),
    productId,
    consent: true,
    customer: {
      name: 'Test learner',
      email: 'test@example.com',
      currentLevel: 'first',
      targetLevel: '4',
      examDate: '',
      depositorName: 'Test sender',
    },
    submissions: (productId === 'bundle' ? [53, 54] : [productId === 'q53' ? 53 : 54]).map(
      (questionNumber) => ({
        questionNumber,
        questionText: 'Describe the question.',
        answerText: 'Short answers also qualify for teacher correction.',
        attachments: [],
      }),
    ),
  }
}
const file = (mime, bytes) => ({ mime, size: bytes.length, data: bytes.toString('base64') })
const png = file('image/png', Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0]))
const pdf = file('application/pdf', Buffer.from('%PDF-1.4\n%%EOF'))
async function call(handler, method, body, query = '', token) {
  const res = {
    statusCode: 200,
    headers: {},
    setHeader(k, v) {
      this.headers[k] = v
    },
    status(code) {
      this.statusCode = code
      return this
    },
    json(data) {
      this.body = data
      return this
    },
    end(data) {
      this.bytes = data
      return this
    },
  }
  await handler(
    {
      method,
      body,
      url: `/api/test${query}`,
      headers: token ? { authorization: `Bearer ${token}` } : {},
    },
    res,
  )
  return res
}
let token
beforeAll(async () => {
  process.env.ADMIN_SECRET = secret
  process.env.JWT_SECRET = 'normal-user-secret-for-tests'
  delete process.env.BLOB_READ_WRITE_TOKEN
  delete process.env.BLOB_STORE_ID
  token = await adminLogin(secret)
})
describe('Teacher correction requests', () => {
  it('rejects an invalid product', async () => {
    expect(
      (await call(customerApi, 'POST', { ...payload(), productId: 'invalid' })).statusCode,
    ).toBe(400)
  })
  it.each([
    ['q53', 19900],
    ['q54', 29900],
    ['bundle', 39900],
  ])('sets server price for %s and ignores forged price/status', async (product, amount) => {
    const res = await call(customerApi, 'POST', {
      ...payload(product),
      amount: 1,
      price: 1,
      paymentStatus: 'confirmed',
      correctionStatus: 'completed',
    })
    expect(res.statusCode).toBe(201)
    expect(res.body.amount).toBe(amount)
    const saved = (await readOrders()).find((o) => o.id === res.body.orderId)
    expect(saved.paymentStatus).toBe('pending')
    expect(saved.correctionStatus).toBe('submitted')
  })
  it.each(['name', 'email', 'depositorName'])('rejects missing %s', async (field) => {
    const data = payload()
    data.customer[field] = ''
    expect((await call(customerApi, 'POST', data)).statusCode).toBe(400)
  })
  it('rejects invalid email, date, consent and extra customer fields', async () => {
    for (const change of [
      (d) => (d.customer.email = 'invalid'),
      (d) => (d.customer.examDate = '2026-02-30'),
      (d) => (d.consent = false),
      (d) => (d.customer.admin = true),
    ]) {
      const data = payload()
      change(data)
      expect((await call(customerApi, 'POST', data)).statusCode).toBe(400)
    }
  })
  it.each(['q53', 'q54', 'bundle'])('requires matching questions for %s', async (product) => {
    const data = payload(product)
    data.submissions = [{ ...data.submissions[0], questionNumber: product === 'q53' ? 54 : 53 }]
    expect((await call(customerApi, 'POST', data)).statusCode).toBe(400)
  })
  it('requires a problem and an answer', async () => {
    for (const field of ['questionText', 'answerText']) {
      const data = payload()
      data.submissions[0][field] = ''
      expect((await call(customerApi, 'POST', data)).statusCode).toBe(400)
    }
  })
  it('accepts an image-only answer', async () => {
    const data = payload()
    data.submissions[0].answerText = ''
    data.submissions[0].attachments = [png]
    expect((await call(customerApi, 'POST', data)).statusCode).toBe(201)
  })
  it('rejects unsupported MIME, forged bytes, and oversize files', () => {
    for (const bad of [
      { ...png, mime: 'image/svg+xml' },
      { ...png, size: IMAGE_LIMIT + 1 },
      file('image/png', Buffer.from('not png')),
      { ...png, size: 1 },
      { ...png, data: '!!!' },
    ])
      expect(() => validateFile(bad)).toThrow()
    expect(() => validateFile(png, true)).toThrow()
    expect(() => validateFile({ ...pdf, size: PDF_LIMIT + 1 }, true)).toThrow()
  })
  it('deduplicates parallel retries with a random internal UUID', async () => {
    const data = payload()
    const results = await Promise.all(
      Array.from({ length: 4 }, () => call(customerApi, 'POST', data)),
    )
    expect(new Set(results.map((r) => r.body.orderId)).size).toBe(1)
    expect(results[0].body.orderId).toMatch(/^[0-9a-f-]{36}$/)
    expect(results[0].body.orderId).not.toBe(data.idempotencyKey)
    expect((await readOrders()).filter((o) => o.id === results[0].body.orderId)).toHaveLength(1)
  })
  it('rejects reuse of a key for different content', async () => {
    const data = payload()
    await call(customerApi, 'POST', data)
    data.customer.name = 'Changed'
    expect((await call(customerApi, 'POST', data)).statusCode).toBe(409)
  })
  it('returns only completion-safe public fields with bank settings', async () => {
    const created = await call(customerApi, 'POST', payload())
    const response = await call(customerApi, 'GET', null, `?id=${created.body.orderId}`)
    expect(Object.keys(response.body).sort()).toEqual(
      ['amount', 'bank', 'createdAt', 'orderId', 'productName', 'productNameEn'].sort(),
    )
    expect(JSON.stringify(response.body)).not.toMatch(
      /test@example|Test learner|questionText|attachments|paymentStatus|pdfPath/,
    )
    expect(response.headers['Cache-Control']).toBe('no-store')
  })
  it('does not expose an order list publicly', async () => {
    expect((await call(customerApi, 'GET')).statusCode).toBe(404)
  })
})
describe('Administrator isolation and fulfilment', () => {
  it('rejects missing, wrong and ordinary-user credentials', async () => {
    expect((await call(adminApi, 'POST', { secret: 'wrong' }, '?action=auth')).statusCode).toBe(401)
    const userToken = await createAccessToken('normal-user')
    for (const bearer of [undefined, 'bad-token', userToken])
      expect((await call(adminApi, 'GET', null, '', bearer)).statusCode).toBe(401)
  })
  it('issues a short administrator session after successful authentication', async () => {
    const res = await call(adminApi, 'POST', { secret }, '?action=auth')
    expect(res.statusCode).toBe(200)
    expect(res.body.expiresIn).toBe(1800)
    expect((await call(adminApi, 'GET', null, '', res.body.token)).statusCode).toBe(200)
  })
  it('rejects mass assignment and invalid statuses', async () => {
    const id = (await call(customerApi, 'POST', payload())).body.orderId
    for (const patch of [
      { amount: 1 },
      { paymentStatus: 'paid' },
      { deliveryStatus: 'sent', sentAt: 'fake' },
      {},
    ])
      expect((await call(adminApi, 'PATCH', patch, `?id=${id}`, token)).statusCode).toBe(400)
  })
  it('enforces payment, PDF, completion and delivery prerequisites and audit timestamps', async () => {
    const id = (await call(customerApi, 'POST', payload())).body.orderId
    const patch = (body) => call(adminApi, 'PATCH', body, `?id=${id}`, token)
    const upload = (body) => call(adminApi, 'POST', body, `?id=${id}&action=report`, token)
    expect((await patch({ correctionStatus: 'in_review' })).statusCode).toBe(409)
    expect((await upload(pdf)).statusCode).toBe(409)
    expect((await patch({ paymentStatus: 'confirmed' })).body.order.paymentStatus).toBe('confirmed')
    expect((await patch({ correctionStatus: 'in_review' })).body.order.correctionStatus).toBe(
      'in_review',
    )
    expect((await patch({ correctionStatus: 'completed' })).statusCode).toBe(409)
    expect((await patch({ deliveryStatus: 'sent' })).statusCode).toBe(409)
    expect((await upload(png)).statusCode).toBe(400)
    expect((await upload(pdf)).body.order.report.uploadedAt).toBeTruthy()
    expect((await patch({ deliveryStatus: 'sent' })).statusCode).toBe(409)
    expect((await patch({ correctionStatus: 'completed' })).statusCode).toBe(200)
    const sent = await patch({ deliveryStatus: 'sent' })
    expect(sent.body.order.sentAt).toBeTruthy()
    expect(sent.body.order.statusHistory).toHaveLength(6)
    const repeated = await patch({ deliveryStatus: 'sent' })
    expect(repeated.body.order.sentAt).toBe(sent.body.order.sentAt)
    expect(repeated.body.order.statusHistory).toHaveLength(6)
    expect((await patch({ correctionStatus: 'in_review' })).statusCode).toBe(409)
    expect((await upload(pdf)).statusCode).toBe(409)
    expect(
      (await call(adminApi, 'GET', null, `?id=${id}&action=file&kind=report`)).statusCode,
    ).toBe(401)
    const download = await call(adminApi, 'GET', null, `?id=${id}&action=file&kind=report`, token)
    expect(download.bytes.toString()).toContain('%PDF-')
    expect(download.headers['Content-Type']).toBe('application/pdf')
    expect(JSON.stringify(sent.body)).not.toMatch(/correction-reports|keyHash|payloadHash/)
  })
  it('does not lose simultaneous updates to different orders', async () => {
    const a = (await call(customerApi, 'POST', payload())).body.orderId,
      b = (await call(customerApi, 'POST', payload())).body.orderId
    await Promise.all(
      [a, b].map((id) =>
        call(adminApi, 'PATCH', { paymentStatus: 'confirmed' }, `?id=${id}`, token),
      ),
    )
    for (const id of [a, b])
      expect((await call(adminApi, 'GET', null, `?id=${id}`, token)).body.order.paymentStatus).toBe(
        'confirmed',
      )
  })
})
