export const STORAGE_KEY = 'octopus-topic-v1'
export const initialState = { user:null, points:0, completedQuizIds:[], latestQuizResult:null, answers:[] }

export function loadState(storage = window.localStorage) {
  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (!raw) return initialState
    const parsed = JSON.parse(raw)
    return { ...initialState, ...parsed, completedQuizIds:Array.isArray(parsed.completedQuizIds)?parsed.completedQuizIds:[], answers:Array.isArray(parsed.answers)?parsed.answers:[] }
  } catch { return initialState }
}

export function saveState(state, storage = window.localStorage) { storage.setItem(STORAGE_KEY, JSON.stringify(state)) }
