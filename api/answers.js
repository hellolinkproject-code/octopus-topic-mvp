import { createHash } from 'node:crypto'
import { z } from 'zod'
import { requireUserId } from './_lib/auth.js'
import {
  invalidMethod,
  sendError,
  serverError,
  unauthorized,
  validationError,
} from './_lib/http.js'
import { publicState, readUser, updateUser } from './_lib/store.js'
import { essayPromptBank, writingPromptBank } from '../src/data/mockData.js'

const limits = {
  53: { min: 200, max: 300, reward: 30 },
  54: { min: 600, max: 700, reward: 0 },
}

const schema = z.object({
  title: z.string().trim().min(1).max(200),
  promptNumber: z.union([z.literal(53), z.literal(54)]),
  promptId: z.string().min(1).max(100),
  promptDate: z.string().max(50),
  content: z.string().trim().min(1).max(700),
  freeFeedback: z.record(z.string(), z.unknown()).optional(),
})

function getIdempotencyKey(userId, answer) {
  return createHash('sha256')
    .update(`${userId}|${answer.promptNumber}|${answer.promptId}|${answer.promptDate}`)
    .digest('hex')
}

function isSamePrompt(answer, candidate, idempotencyKey) {
  return (
    candidate.idempotencyKey === idempotencyKey ||
    (candidate.promptNumber === answer.promptNumber &&
      candidate.promptId === answer.promptId &&
      candidate.promptDate === answer.promptDate)
  )
}

export default async function handler(request, response) {
  if (!['GET', 'POST'].includes(request.method)) return invalidMethod(response, ['GET', 'POST'])

  const userId = await requireUserId(request)
  if (!userId) return unauthorized(response)

  try {
    const user = await readUser(userId)
    if (!user) return sendError(response, 404, 'USER_NOT_FOUND', '사용자 정보를 찾을 수 없습니다.')
    if (request.method === 'GET') return response.status(200).json({ answers: user.answers })

    const parsed = schema.safeParse(request.body)
    if (!parsed.success) return validationError(response, parsed.error)
    const content = parsed.data.content.trim()
    const rule = limits[parsed.data.promptNumber]
    if (content.length < rule.min || content.length > rule.max) {
      return sendError(
        response,
        400,
        'ANSWER_LENGTH_INVALID',
        `${parsed.data.promptNumber}번 답안은 ${rule.min}~${rule.max}자로 작성해 주세요.`,
      )
    }

    const idempotencyKey = getIdempotencyKey(userId, parsed.data)
    const bank = parsed.data.promptNumber === 54 ? essayPromptBank : writingPromptBank
    const prompt = bank.find((item) => item.id === parsed.data.promptId)
    const date = new Date(`${parsed.data.promptDate}T00:00:00Z`)
    const day = Math.floor(date.getTime() / 86400000)
    const today = Math.floor((Date.now() + 9 * 3600000) / 86400000)
    if (
      !prompt ||
      !Number.isFinite(day) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(parsed.data.promptDate) ||
      date.toISOString().slice(0, 10) !== parsed.data.promptDate ||
      bank[day % bank.length]?.id !== prompt.id
    ) {
      return sendError(response, 400, 'PROMPT_INVALID', '올바른 쓰기 문제를 선택해 주세요.')
    }
    const isExisting = user.answers.some((item) => isSamePrompt(parsed.data, item, idempotencyKey))
    if (!isExisting && (day < today - 1 || day > today + 1))
      return sendError(
        response,
        400,
        'PROMPT_EXPIRED',
        '오늘의 쓰기 문제를 다시 열어 주세요. 작성한 초안은 보관됩니다.',
      )

    const answer = {
      title: prompt.title,
      promptNumber: parsed.data.promptNumber,
      promptId: prompt.id,
      promptDate: parsed.data.promptDate,
      content,
      characterCount: content.length,
      earnedPoints: rule.reward,
      id: `answer-${idempotencyKey}`,
      idempotencyKey,
      createdAt: new Date().toISOString(),
    }
    let created = false
    const nextUser = await updateUser(userId, (current) => {
      created = !current.answers.some((item) => isSamePrompt(parsed.data, item, idempotencyKey))
      if (!created) return current
      return {
        ...current,
        points: current.points + rule.reward,
        answers: [answer, ...current.answers],
      }
    })
    const savedAnswer = nextUser.answers.find((item) =>
      isSamePrompt(parsed.data, item, idempotencyKey),
    )
    return response.status(created ? 201 : 200).json({
      answer: savedAnswer,
      awarded: created && rule.reward > 0,
      state: publicState(nextUser),
    })
  } catch (error) {
    return serverError(response, error)
  }
}
