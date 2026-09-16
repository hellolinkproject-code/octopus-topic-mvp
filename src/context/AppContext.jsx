import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import {
  clearAccessToken,
  completeQuizRequest,
  fetchMyState,
  hasAccessToken,
  isAuthorizationError,
  loginRequest,
  requestAnswerFeedback,
  saveAnswerRequest,
  subscribeToAuthExpired,
} from '../lib/api'
import { initialState } from '../lib/storage'
const AppContext = createContext(null)
export function AppProvider({ children }) {
  const [state, setState] = useState(initialState)
  const [isInitializing, setIsInitializing] = useState(true)
  const [restoreError, setRestoreError] = useState(null)

  const restoreSession = useCallback(async () => {
    if (!hasAccessToken()) {
      setState(initialState)
      setRestoreError(null)
      setIsInitializing(false)
      return
    }
    setIsInitializing(true)
    try {
      const nextState = await fetchMyState()
      setState(nextState)
      setRestoreError(null)
    } catch (error) {
      if (isAuthorizationError(error)) {
        setState(initialState)
        setRestoreError(null)
      } else {
        setRestoreError(error)
      }
    } finally {
      setIsInitializing(false)
    }
  }, [])

  useEffect(() => {
    let active = true
    const unsubscribe = subscribeToAuthExpired(() => {
      if (!active) return
      setState(initialState)
      setRestoreError(null)
      setIsInitializing(false)
    })
    void restoreSession()
    return () => {
      active = false
      unsubscribe()
    }
  }, [restoreSession])
  const acceptState = useCallback((next) => {
    setState((current) => {
      if (current.user?.id !== next.user.id) return current
      if ((current.revision || 0) > (next.revision || 0)) return current
      return next
    })
  }, [])
  const actions = useMemo(
    () => ({
      login: async (email, password) => {
        const nextState = await loginRequest(email, password)
        setState(nextState)
        setRestoreError(null)
        return nextState.user
      },
      logout: () => {
        clearAccessToken()
        setState(initialState)
        setRestoreError(null)
      },
      retryRestore: restoreSession,
      refreshState: async () => {
        const nextState = await fetchMyState()
        acceptState(nextState)
      },
      requestFeedback: async (answerId) => {
        const response = await requestAnswerFeedback(answerId)
        acceptState(response.state)
        return response.feedback
      },
      completeQuiz: async (id, selections) => {
        const { state: nextState } = await completeQuizRequest(id, selections)
        acceptState(nextState)
        return nextState.latestQuizResult
      },
      saveAnswer: async (answer) => {
        const response = await saveAnswerRequest(answer)
        acceptState(response.state)
        return { ...response.answer, awarded: response.awarded }
      },
    }),
    [restoreSession, acceptState],
  )
  const value = useMemo(
    () => ({ ...state, ...actions, isInitializing, restoreError }),
    [state, actions, isInitializing, restoreError],
  )
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
export function useApp() {
  const context = useContext(AppContext)
  if (!context) throw new Error('useApp must be used inside AppProvider')
  return context
}
