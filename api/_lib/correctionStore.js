import { storagePath } from './storageNamespace.js'
import { BlobPreconditionFailedError, get, put } from '@vercel/blob'
import { apiError } from './http.js'

const memory = new Map()
const local = () =>
  !process.env.BLOB_READ_WRITE_TOKEN &&
  !process.env.BLOB_STORE_ID &&
  process.env.NODE_ENV !== 'production'
const ledgerPath = () => storagePath('correction-orders/ledger-v1.json')
async function readVersion(path) {
  if (local()) return memory.has(path) ? structuredClone(memory.get(path)) : { value: null }
  const result = await get(path, {
    access: 'private',
    useCache: false,
    headers: { 'Accept-Encoding': 'identity' },
  })
  if (!result) return { value: null }
  if (result.statusCode !== 200 || !result.blob.etag) throw new Error('CORRECTION_READ_FAILED')
  return { value: JSON.parse(await new Response(result.stream).text()), etag: result.blob.etag }
}
export async function readOrders() {
  return (await readVersion(ledgerPath())).value || []
}
// A single small-MVP ledger commits orders and idempotency atomically, without a second index.
// The synchronous callback can be retried; never perform file uploads inside it.
export async function updateOrders(change) {
  for (let attempt = 0; attempt < 8; attempt++) {
    const { value, etag } = await readVersion(ledgerPath())
    const next = change(value || [])
    try {
      if (local()) {
        if (memory.get(ledgerPath())?.etag !== etag) throw new BlobPreconditionFailedError()
        memory.set(ledgerPath(), { value: structuredClone(next), etag: (etag || 0) + 1 })
      } else {
        await put(ledgerPath(), JSON.stringify(next), {
          access: 'private',
          addRandomSuffix: false,
          allowOverwrite: Boolean(etag),
          ...(etag ? { ifMatch: etag } : {}),
          contentType: 'application/json',
        })
      }
      return next
    } catch (error) {
      if (
        !(error instanceof BlobPreconditionFailedError) &&
        (etag || !(await readVersion(ledgerPath())).value)
      )
        throw error
      await new Promise((resolve) => setTimeout(resolve, Math.min(25 * 2 ** attempt, 500)))
    }
  }
  throw apiError(409, 'WRITE_CONFLICT', 'Please retry. / 다시 시도해 주세요.')
}
export async function saveCorrectionFile(path, bytes, contentType) {
  if (local()) memory.set(path, { bytes, contentType })
  else
    await put(path, bytes, {
      access: 'private',
      addRandomSuffix: false,
      allowOverwrite: false,
      contentType,
    })
  return path
}
export async function readCorrectionFile(path) {
  if (local()) return memory.get(path)
  const result = await get(path, { access: 'private', useCache: false })
  if (!result || result.statusCode !== 200) return null
  return {
    bytes: Buffer.from(await new Response(result.stream).arrayBuffer()),
    contentType: result.blob.contentType,
  }
}
