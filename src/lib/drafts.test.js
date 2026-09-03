import { describe, expect, it } from 'vitest'
import { getLegacyDraftKey, getUserDraftKey, readUserDraft } from './drafts'

function memoryStorage(entries = []) {
  const values = new Map(entries)
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
    has: (key) => values.has(key),
  }
}

describe('user-scoped writing drafts', () => {
  it('restores only the current user draft', () => {
    const dailyId = 'writing-53-2026-09-03-prompt'
    const storage = memoryStorage([
      [getUserDraftKey('user-a', 53, dailyId), 'A draft'],
      [getUserDraftKey('user-b', 53, dailyId), 'B draft'],
    ])
    expect(readUserDraft(storage, 'user-a', 53, dailyId)).toBe('A draft')
    expect(readUserDraft(storage, 'user-b', 53, dailyId)).toBe('B draft')
  })

  it('does not restore or delete a legacy draft without a user ID', () => {
    const dailyId = 'writing-53-2026-09-03-prompt'
    const legacyKey = getLegacyDraftKey(53, dailyId)
    const storage = memoryStorage([[legacyKey, 'legacy draft']])
    expect(readUserDraft(storage, 'user-a', 53, dailyId)).toBe('')
    expect(storage.has(legacyKey)).toBe(true)
  })
})
