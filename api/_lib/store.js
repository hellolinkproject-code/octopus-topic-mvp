import { BlobPreconditionFailedError, get, put } from '@vercel/blob'

const memory = new Map()

function pathname(userId) {
  return `users/${userId}.json`
}

function useMemoryStore() {
  return (
    !process.env.BLOB_READ_WRITE_TOKEN &&
    !process.env.BLOB_STORE_ID &&
    process.env.NODE_ENV !== 'production'
  )
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
    revision: user.revision || 0,
    points: user.points,
    completedQuizIds: user.completedQuizIds,
    latestQuizResult: user.latestQuizResult,
    answers: user.answers,
  }
}

async function readVersion(userId) {
  if (useMemoryStore()) {
    const record = memory.get(userId)
    return { user: record ? structuredClone(record.user) : null, etag: record?.etag }
  }

  const result = await get(pathname(userId), {
    access: 'private',
    useCache: false,
    // Conditional writes require a strong ETag, not the weak tag of a compressed response.
    headers: { 'Accept-Encoding': 'identity' },
  })
  if (!result) return { user: null }
  if (result.statusCode !== 200 || !result.blob.etag) throw new Error('USER_READ_FAILED')
  return { user: JSON.parse(await new Response(result.stream).text()), etag: result.blob.etag }
}

export async function readUser(userId) {
  return (await readVersion(userId)).user
}

async function writeVersion(user, etag) {
  const next = { ...user, revision: (user.revision || 0) + 1, updatedAt: new Date().toISOString() }
  if (useMemoryStore()) {
    if (memory.get(user.id)?.etag !== etag) throw new BlobPreconditionFailedError()
    memory.set(user.id, { user: structuredClone(next), etag: (etag || 0) + 1 })
    return next
  }

  await put(pathname(user.id), JSON.stringify(next), {
    access: 'private',
    addRandomSuffix: false,
    allowOverwrite: Boolean(etag),
    ...(etag ? { ifMatch: etag } : {}),
    contentType: 'application/json',
  })
  return next
}

// The callback may run again after a conflict. Keep external calls outside it.
export async function updateUser(userId, change) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const { user, etag } = await readVersion(userId)
    const next = change(user)
    if (next === user) return user
    try {
      return await writeVersion(next, etag)
    } catch (error) {
      if (error instanceof BlobPreconditionFailedError) {
        // Give concurrent writes time to become visible and avoid a tight retry loop.
        await new Promise((resolve) =>
          setTimeout(resolve, Math.min(50 * 2 ** attempt, 800) + Math.floor(Math.random() * 50)),
        )
        continue
      }
      // Concurrent creation: the first registration owns the password record.
      if (!etag && (await readUser(userId))) continue
      throw error
    }
  }
  throw new Error('USER_WRITE_CONFLICT')
}
