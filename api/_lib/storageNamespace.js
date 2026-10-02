import { createHash } from 'node:crypto'
// Preview and production can share a Blob store. Isolate every preview branch.
// Stable across deployments of the same branch so persistence remains testable.
export function storagePath(path) {
  if (process.env.VERCEL_ENV !== 'preview') return path
  const branch = process.env.VERCEL_GIT_COMMIT_REF
  if (!branch) throw new Error('PREVIEW_BRANCH_REQUIRED')
  const namespace = createHash('sha256').update(branch).digest('hex').slice(0, 20)
  return `preview/${namespace}/${path}`
}
