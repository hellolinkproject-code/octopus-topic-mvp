import { afterEach, expect, it, vi } from 'vitest'
import { storagePath } from '../api/_lib/storageNamespace.js'
afterEach(() => vi.unstubAllEnvs())
it('keeps production storage paths unchanged', () => {
  vi.stubEnv('VERCEL_ENV', 'production')
  expect(storagePath('users/test.json')).toBe('users/test.json')
})
it('isolates preview branches with stable storage paths across deployments', () => {
  vi.stubEnv('VERCEL_ENV', 'preview')
  vi.stubEnv('VERCEL_GIT_COMMIT_REF', 'feat/teacher-correction-mvp')
  const first = storagePath('correction-orders/ledger-v1.json')
  expect(first).toMatch(/^preview\/[a-f0-9]{20}\/correction-orders\/ledger-v1.json$/)
  expect(storagePath('correction-orders/ledger-v1.json')).toBe(first)
  expect(storagePath('users/test.json')).toMatch(/^preview\//)
  vi.stubEnv('VERCEL_GIT_COMMIT_REF', 'other')
  expect(storagePath('correction-orders/ledger-v1.json')).not.toBe(first)
})
it('fails closed if a preview deployment lacks branch metadata', () => {
  vi.stubEnv('VERCEL_ENV', 'preview')
  vi.stubEnv('VERCEL_GIT_COMMIT_REF', '')
  expect(() => storagePath('users/test.json')).toThrow('PREVIEW_BRANCH_REQUIRED')
})
