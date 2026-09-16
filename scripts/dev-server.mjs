import { createServer } from 'node:http'
import { randomBytes } from 'node:crypto'
import { createServer as createViteServer } from 'vite'
import login from '../api/auth/login.js'
import me from '../api/me.js'
import answers from '../api/answers.js'
import quiz from '../api/quiz-attempts.js'
import feedback from '../api/feedback.js'

// Local development only. Production continues to use Vercel Functions.
process.env.JWT_SECRET ||= randomBytes(48).toString('base64url')
const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' })
const routes = {
  '/api/auth/login': login,
  '/api/me': me,
  '/api/answers': answers,
  '/api/quiz-attempts': quiz,
  '/api/feedback': feedback,
}
const server = createServer(async (request, response) => {
  const handler = routes[new URL(request.url, 'http://localhost').pathname]
  if (!handler) return vite.middlewares(request, response)
  response.status = (code) => {
    response.statusCode = code
    return response
  }
  response.json = (payload) => {
    response.setHeader('Content-Type', 'application/json')
    response.end(JSON.stringify(payload))
    return response
  }
  response.setHeader('Cache-Control', 'no-store')
  try {
    let body = ''
    for await (const chunk of request) {
      body += chunk
      if (Buffer.byteLength(body) > 16384)
        return response.status(413).json({ error: { message: '입력 내용이 너무 큽니다.' } })
    }
    request.body = body ? JSON.parse(body) : undefined
    await handler(request, response)
  } catch {
    response.status(400).json({ error: { message: '요청을 처리하지 못했습니다.' } })
  }
})
server.listen(5173, '127.0.0.1', () => console.log('Local app + API: http://127.0.0.1:5173'))
