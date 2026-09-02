import { get, put } from '@vercel/blob'

const memory = new Map()

function pathname(userId) {
  return `users/${userId}.json`
}

function useMemoryStore() {
  return !process.env.BLOB_READ_WRITE_TOKEN && process.env.NODE_ENV !== 'production'
}

export function createUser({ id, email, name, passwordRecord }) {
  const now = new Date().toISOString()
  return {
    id,
    email,
    name,
    ...passwordRecord,
    joinedAt: now,
    points: 0,
    completedQuizIds: [],
    latestQuizResult: null,
    answers: [],
    updatedAt: now,
  }
}

export function publicState(user) {
  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      joinedAt: user.joinedAt,
    },
    points: user.points,
    completedQuizIds: user.completedQuizIds,
    latestQuizResult: user.latestQuizResult,
    answers: user.answers,
  }
}

export async function readUser(userId) {
  if (useMemoryStore()) return memory.get(userId) || null

  const result = await get(pathname(userId), { access: 'private', useCache: false })
  if (!result || result.statusCode !== 200) return null
  return JSON.parse(await new Response(result.stream).text())
}

export async function writeUser(user) {
  const next = { ...user, updatedAt: new Date().toISOString() }
  if (useMemoryStore()) {
    memory.set(user.id, next)
    return next
  }

  await put(pathname(user.id), JSON.stringify(next), {
    access: 'private',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json',
  })
  return next
}
