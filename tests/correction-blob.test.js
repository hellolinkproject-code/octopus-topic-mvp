import { afterEach, expect, it, vi } from 'vitest'
const remote = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn(), value: null, revision: 0 }))
vi.mock('@vercel/blob', () => {
  class BlobPreconditionFailedError extends Error {}
  return { BlobPreconditionFailedError, get: remote.get, put: remote.put }
})
import { BlobPreconditionFailedError } from '@vercel/blob'
import { updateOrders, readOrders, saveCorrectionFile } from '../api/_lib/correctionStore.js'
afterEach(() => vi.unstubAllEnvs())
it('uses private conditional writes and retries concurrent ledger creation without losing an order', async () => {
  vi.stubEnv('BLOB_READ_WRITE_TOKEN', 'mock-private-store')
  remote.get.mockImplementation(async (path, options) => {
    expect(path).toBe('correction-orders/ledger-v1.json')
    expect(options).toMatchObject({
      access: 'private',
      useCache: false,
      headers: { 'Accept-Encoding': 'identity' },
    })
    return remote.value
      ? {
          statusCode: 200,
          blob: { etag: String(remote.revision) },
          stream: new Response(JSON.stringify(remote.value)).body,
        }
      : null
  })
  remote.put.mockImplementation(async (path, body, options) => {
    expect(options.access).toBe('private')
    expect(options.addRandomSuffix).toBe(false)
    if (remote.value && options.ifMatch !== String(remote.revision))
      throw new BlobPreconditionFailedError()
    remote.value = JSON.parse(body)
    remote.revision++
  })
  await Promise.all(['one', 'two'].map((id) => updateOrders((current) => [...current, { id }])))
  expect((await readOrders()).map((o) => o.id).sort()).toEqual(['one', 'two'])
  expect(remote.put).toHaveBeenCalledTimes(3)
})
it('stores immutable files with private access and never returns provider URLs', async () => {
  vi.stubEnv('BLOB_READ_WRITE_TOKEN', 'mock-private-store')
  remote.put.mockReset().mockResolvedValue({ url: 'https://private.invalid/file' })
  const path = 'correction-reports/test/random.pdf'
  expect(await saveCorrectionFile(path, Buffer.from('%PDF-'), 'application/pdf')).toBe(path)
  expect(remote.put).toHaveBeenCalledWith(path, expect.any(Buffer), {
    access: 'private',
    addRandomSuffix: false,
    allowOverwrite: false,
    contentType: 'application/pdf',
  })
})
