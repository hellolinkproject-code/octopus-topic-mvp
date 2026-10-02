import { z } from 'zod'
import { adminLogin, isAdmin } from './_lib/correctionAuth.js'
import { readOrders, readCorrectionFile } from './_lib/correctionStore.js'
import { patchSchema, changeOrder, uploadReport } from './_lib/corrections.js'
import {
  invalidMethod,
  serverError,
  validationError,
  sendError,
  unauthorized,
} from './_lib/http.js'
// Internal paths and idempotency hashes stay server-only, including for admin JSON.
function adminView(order) {
  const { keyHash, payloadHash, ...view } = order
  return {
    ...view,
    submissions: view.submissions.map((s) => ({
      ...s,
      attachments: s.attachments.map((f) => ({ mime: f.mime, size: f.size })),
    })),
    report: order.report ? { uploadedAt: order.report.uploadedAt } : null,
  }
}
export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store')
  response.setHeader('X-Content-Type-Options', 'nosniff')
  const url = new URL(request.url, 'http://local'),
    action = url.searchParams.get('action'),
    id = url.searchParams.get('id')
  try {
    if (action === 'auth') {
      if (request.method !== 'POST') return invalidMethod(response, ['POST'])
      const parsed = z
        .object({ secret: z.string().min(1).max(1024) })
        .strict()
        .safeParse(request.body)
      if (!parsed.success) return validationError(response, parsed.error)
      const token = await adminLogin(parsed.data.secret)
      return token ? response.status(200).json({ token, expiresIn: 1800 }) : unauthorized(response)
    }
    if (!(await isAdmin(request))) return unauthorized(response)
    if (!['GET', 'PATCH', 'POST'].includes(request.method))
      return invalidMethod(response, ['GET', 'PATCH', 'POST'])
    if (request.method === 'GET' && !id)
      return response.status(200).json({
        orders: (await readOrders())
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
          .map(adminView),
      })
    if (!z.uuid().safeParse(id).success)
      return sendError(response, 400, 'INVALID_ID', 'Invalid order ID.')
    const order = (await readOrders()).find((o) => o.id === id)
    if (!order) return sendError(response, 404, 'NOT_FOUND', 'Order not found.')
    if (request.method === 'GET' && action === 'file') {
      const kind = url.searchParams.get('kind'),
        number = Number(url.searchParams.get('question'))
      const path =
        kind === 'report'
          ? order.report?.pdfPath
          : kind === 'answer'
            ? order.submissions.find((s) => s.questionNumber === number)?.attachments[0]?.path
            : null
      const file = path ? await readCorrectionFile(path) : null
      if (!file) return sendError(response, 404, 'NOT_FOUND', 'File not found.')
      response.setHeader('Content-Type', file.contentType)
      response.setHeader(
        'Content-Disposition',
        `attachment; filename="${kind === 'report' ? 'report.pdf' : file.contentType === 'image/png' ? 'answer.png' : 'answer.jpg'}"`,
      )
      return response.status(200).end(file.bytes)
    }
    if (request.method === 'GET') return response.status(200).json({ order: adminView(order) })
    if (request.method === 'PATCH') {
      const parsed = patchSchema.safeParse(request.body)
      if (!parsed.success) return validationError(response, parsed.error)
      return response.status(200).json({ order: adminView(await changeOrder(id, parsed.data)) })
    }
    if (request.method === 'POST' && action === 'report')
      return response.status(200).json({ order: adminView(await uploadReport(id, request.body)) })
    return invalidMethod(response, ['GET', 'PATCH'])
  } catch (error) {
    return serverError(response, error)
  }
}
