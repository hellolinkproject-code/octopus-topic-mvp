import { afterEach, expect, it, vi } from 'vitest'
const remote = vi.hoisted(() => ({
  user: { id: 'test', points: 0 },
  revision: 1,
  put: vi.fn(),
  get: vi.fn(),
}))
vi.mock('@vercel/blob', () => {
  class BlobPreconditionFailedError extends Error {}
  return { BlobPreconditionFailedError, get: remote.get, put: remote.put }
})
import { BlobPreconditionFailedError } from '@vercel/blob'
import { updateUser } from '../api/_lib/store.js'
afterEach(() => vi.unstubAllEnvs())
it('requests an uncompressed body with a strong ETag and retries concurrent conflicts', async () => {
  vi.stubEnv('BLOB_READ_WRITE_TOKEN', 'mock-storage')
  remote.get.mockImplementation(async (_, options) => {
    const strong = options.headers?.['Accept-Encoding'] === 'identity'
    return {
      statusCode: 200,
      blob: { etag: strong ? String(remote.revision) : `W/"${remote.revision}"` },
      stream: new Response(JSON.stringify(remote.user)).body,
    }
  })
  remote.put.mockImplementation(async (_, body, options) => {
    expect(options.access).toBe('private')
    expect(options.allowOverwrite).toBe(true)
    if (options.ifMatch !== String(remote.revision)) throw new BlobPreconditionFailedError()
    remote.user = JSON.parse(body)
    remote.revision += 1
  })
  await Promise.all([
    updateUser('test', (user) => ({ ...user, points: user.points + 10 })),
    updateUser('test', (user) => ({ ...user, points: user.points + 30 })),
  ])
  expect(remote.user.points).toBe(40)
  expect(remote.put).toHaveBeenCalledTimes(3)
  expect(remote.get).toHaveBeenCalledWith('users/test.json', {
    access: 'private',
    useCache: false,
    headers: { 'Accept-Encoding': 'identity' },
  })
})
