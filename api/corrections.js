import { orderSchema, createOrder, publicOrder } from './_lib/corrections.js'
import { readOrders } from './_lib/correctionStore.js'
import { invalidMethod, serverError, validationError, sendError } from './_lib/http.js'
export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store')
  response.setHeader('X-Content-Type-Options', 'nosniff')
  try {
    if (request.method === 'POST') {
      const parsed = orderSchema.safeParse(request.body)
      if (!parsed.success) return validationError(response, parsed.error)
      const order = await createOrder(parsed.data)
      return response.status(201).json(publicOrder(order))
    }
    if (request.method === 'GET') {
      const id = new URL(request.url, 'http://local').searchParams.get('id')
      const order = (await readOrders()).find((o) => o.id === id)
      if (!order)
        return sendError(response, 404, 'NOT_FOUND', 'Order not found. / 신청을 찾을 수 없습니다.')
      const bank =
        process.env.BANK_NAME && process.env.BANK_ACCOUNT && process.env.BANK_ACCOUNT_HOLDER
          ? {
              name: process.env.BANK_NAME,
              account: process.env.BANK_ACCOUNT,
              holder: process.env.BANK_ACCOUNT_HOLDER,
            }
          : null
      return response.status(200).json({ ...publicOrder(order), bank })
    }
    return invalidMethod(response, ['GET', 'POST'])
  } catch (error) {
    return serverError(response, error)
  }
}
