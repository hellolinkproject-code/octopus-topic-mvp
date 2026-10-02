import { storagePath } from './storageNamespace.js'
import { createHash, randomUUID } from 'node:crypto'
import { z } from 'zod'
import {
  CORRECTION_PRODUCTS,
  CORRECTION_STATUS,
  IMAGE_LIMIT,
  PDF_LIMIT,
} from '../../src/lib/correctionProducts.js'
import { apiError } from './http.js'
import { readOrders, updateOrders, saveCorrectionFile } from './correctionStore.js'
const fileSchema = z
  .object({
    mime: z.string(),
    data: z.string().max(Math.ceil(PDF_LIMIT / 3) * 4),
    size: z.number().int().positive(),
  })
  .strict()
const submission = z
  .object({
    questionNumber: z.union([z.literal(53), z.literal(54)]),
    questionText: z.string().trim().min(1).max(10000),
    answerText: z.string().trim().max(10000).default(''),
    attachments: z.array(fileSchema).max(1).default([]),
  })
  .strict()
  .refine((s) => s.answerText || s.attachments.length, 'Answer text or image required')
export const orderSchema = z
  .object({
    idempotencyKey: z.uuid(),
    productId: z.enum(['q53', 'q54', 'bundle']),
    consent: z.literal(true),
    customer: z
      .object({
        name: z.string().trim().min(1).max(100),
        email: z.email().max(254),
        currentLevel: z.enum(['first', '1', '2', '3', '4', '5', '6']),
        targetLevel: z.enum(['3', '4', '5', '6']),
        examDate: z.union([z.literal(''), z.iso.date()]),
        depositorName: z.string().trim().min(1).max(100),
      })
      .strict(),
    submissions: z.array(submission).min(1).max(2),
  })
  .refine((data) => {
    const expected = CORRECTION_PRODUCTS[data.productId].questionNumbers
    return (
      expected.length === data.submissions.length &&
      expected.every((n) => data.submissions.filter((s) => s.questionNumber === n).length === 1)
    )
  }, 'Submissions must match product')
export function validateFile(file, report = false) {
  const parsed = fileSchema.safeParse(file)
  if (!parsed.success) throw apiError(400, 'FILE_INVALID', 'Invalid file. / 파일을 확인해 주세요.')
  const limit = report ? PDF_LIMIT : IMAGE_LIMIT
  const allowed = report ? ['application/pdf'] : ['image/jpeg', 'image/png']
  if (!allowed.includes(file.mime))
    throw apiError(400, 'FILE_TYPE', 'Unsupported file type. / 지원하지 않는 파일 형식입니다.')
  if (
    file.size > limit ||
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(file.data)
  )
    throw apiError(
      400,
      'FILE_SIZE',
      'File too large or invalid. / 파일 크기 또는 형식을 확인해 주세요.',
    )
  const bytes = Buffer.from(file.data, 'base64')
  if (!bytes.length || bytes.length !== file.size || bytes.length > limit)
    throw apiError(400, 'FILE_SIZE', 'File size mismatch. / 파일 크기를 확인해 주세요.')
  const valid =
    file.mime === 'application/pdf'
      ? bytes.subarray(0, 5).toString() === '%PDF-'
      : file.mime === 'image/png'
        ? bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
        : bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
  if (!valid)
    throw apiError(
      400,
      'FILE_SIGNATURE',
      'File content does not match type. / 파일 내용과 형식이 다릅니다.',
    )
  return bytes
}
const digest = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex')
export function publicOrder(order) {
  return {
    orderId: order.id,
    productName: CORRECTION_PRODUCTS[order.productId].name,
    productNameEn: CORRECTION_PRODUCTS[order.productId].nameEn,
    amount: order.amount,
    createdAt: order.createdAt,
  }
}
export async function createOrder(data) {
  // Validate every file before any persistent side effect.
  for (const s of data.submissions) for (const f of s.attachments) validateFile(f)
  const keyHash = digest(data.idempotencyKey)
  const payloadHash = digest(data)
  const existing = (await readOrders()).find((o) => o.keyHash === keyHash)
  if (existing) {
    if (existing.payloadHash !== payloadHash)
      throw apiError(
        409,
        'IDEMPOTENCY_CONFLICT',
        'This request was already used. / 이미 사용한 신청 키입니다.',
      )
    return existing
  }
  const id = randomUUID(),
    now = new Date().toISOString()
  const submissions = await Promise.all(
    data.submissions.map(async (s) => ({
      ...s,
      attachments: await Promise.all(
        s.attachments.map(async (f) => {
          const path = storagePath(
            `correction-assets/${id}/${s.questionNumber}-${randomUUID()}.${f.mime === 'image/png' ? 'png' : 'jpg'}`,
          )
          await saveCorrectionFile(path, validateFile(f), f.mime)
          return { path, mime: f.mime, size: f.size }
        }),
      ),
    })),
  )
  const order = {
    id,
    keyHash,
    payloadHash,
    createdAt: now,
    updatedAt: now,
    productId: data.productId,
    amount: CORRECTION_PRODUCTS[data.productId].price,
    customer: data.customer,
    submissions,
    consent: { version: '2026-10-02', at: now },
    paymentStatus: 'pending',
    correctionStatus: 'submitted',
    deliveryStatus: 'not_sent',
    report: null,
    sentAt: null,
    statusHistory: [{ type: 'ORDER_CREATED', at: now }],
  }
  const orders = await updateOrders((current) => {
    const duplicate = current.find((o) => o.keyHash === keyHash)
    if (duplicate) {
      if (duplicate.payloadHash !== payloadHash)
        throw apiError(409, 'IDEMPOTENCY_CONFLICT', 'Request conflict. / 신청 내용이 다릅니다.')
      return current
    }
    return [order, ...current]
  })
  return orders.find((o) => o.keyHash === keyHash)
}
export const patchSchema = z
  .object({
    paymentStatus: z.enum(CORRECTION_STATUS.payment).optional(),
    correctionStatus: z.enum(CORRECTION_STATUS.correction).optional(),
    deliveryStatus: z.enum(CORRECTION_STATUS.delivery).optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length === 1)
export async function changeOrder(id, patch) {
  const orders = await updateOrders((current) =>
    current.map((order) => {
      if (order.id !== id) return order
      const next = { ...order, ...patch }
      for (const [key, values] of [
        ['paymentStatus', CORRECTION_STATUS.payment],
        ['correctionStatus', CORRECTION_STATUS.correction],
        ['deliveryStatus', CORRECTION_STATUS.delivery],
      ])
        if (values.indexOf(next[key]) < values.indexOf(order[key]))
          throw apiError(
            409,
            'STATUS_REGRESSION',
            'Status cannot move backwards. / 이전 상태로 변경할 수 없습니다.',
          )
      if (next.correctionStatus !== 'submitted' && next.paymentStatus !== 'confirmed')
        throw apiError(
          409,
          'PAYMENT_REQUIRED',
          'Confirm payment first. / 입금을 먼저 확인해 주세요.',
        )
      if (next.correctionStatus === 'completed' && !next.report)
        throw apiError(409, 'PDF_REQUIRED', 'Upload PDF first. / PDF를 먼저 업로드해 주세요.')
      if (next.deliveryStatus === 'sent' && (!next.report || next.correctionStatus !== 'completed'))
        throw apiError(
          409,
          'NOT_COMPLETED',
          'Complete correction and upload PDF first. / PDF 업로드 및 첨삭 완료가 필요합니다.',
        )
      if (Object.keys(patch).every((k) => order[k] === patch[k])) return order
      const now = new Date().toISOString()
      return {
        ...next,
        updatedAt: now,
        sentAt: next.deliveryStatus === 'sent' ? order.sentAt || now : null,
        statusHistory: [
          ...order.statusHistory,
          { type: Object.keys(patch)[0], value: Object.values(patch)[0], at: now },
        ],
      }
    }),
  )
  return orders.find((o) => o.id === id)
}
export async function uploadReport(id, file) {
  const bytes = validateFile(file, true)
  const order = (await readOrders()).find((o) => o.id === id)
  if (!order) throw apiError(404, 'NOT_FOUND', 'Order not found.')
  if (order.paymentStatus !== 'confirmed' || order.deliveryStatus === 'sent')
    throw apiError(409, 'REPORT_LOCKED', 'Confirm payment; sent reports cannot be replaced.')
  const path = storagePath(`correction-reports/${id}/${randomUUID()}.pdf`)
  await saveCorrectionFile(path, bytes, 'application/pdf')
  const now = new Date().toISOString()
  const orders = await updateOrders((current) =>
    current.map((o) => {
      if (o.id !== id) return o
      if (o.deliveryStatus === 'sent') throw apiError(409, 'REPORT_LOCKED', 'Already sent.')
      return {
        ...o,
        report: { pdfPath: path, uploadedAt: now },
        updatedAt: now,
        statusHistory: [...o.statusHistory, { type: 'PDF_UPLOADED', at: now }],
      }
    }),
  )
  return orders.find((o) => o.id === id)
}
