const DRAFT_PREFIX = 'octopus-topic-answer'

export function getUserDraftKey(userId, promptNumber, dailyId) {
  return `${DRAFT_PREFIX}-${encodeURIComponent(userId)}-${promptNumber}-draft-${dailyId}`
}

export function getLegacyDraftKey(promptNumber, dailyId) {
  return `${DRAFT_PREFIX}-${promptNumber}-draft-${dailyId}`
}

export function readUserDraft(storage, userId, promptNumber, dailyId) {
  if (!userId) return ''
  return storage.getItem(getUserDraftKey(userId, promptNumber, dailyId)) || ''
}
