import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import {
  clearAccessToken,
  completeQuizRequest,
  fetchMyState,
  hasAccessToken,
  loginRequest,
  saveAnswerRequest,
} from '../lib/api'
import { initialState } from '../lib/storage'
const AppContext = createContext(null)
export function AppProvider({ children }) {
  const [state, setState] = useState(initialState)
  const [isInitializing, setIsInitializing] = useState(true)
  useEffect(() => {
    let active = true
    const initialize = async () => {
      if (!hasAccessToken()) {
        if (active) setIsInitializing(false)
        return
      }
      try {
        const nextState = await fetchMyState()
        if (active) setState(nextState)
      } catch {
        clearAccessToken()
        if (active) setState(initialState)
      } finally {
        if (active) setIsInitializing(false)
      }
    }
    void initialize()
    return () => {
      active = false
    }
  }, [])
  const actions = useMemo(
    () => ({
      login: async (email, password) => {
        const nextState = await loginRequest(email, password)
        setState(nextState)
        return nextState.user
      },
      logout: () => {
        clearAccessToken()
        setState(initialState)
      },
      completeQuiz: async (id, result) => {
        const nextState = await completeQuizRequest(id, result)
        setState(nextState)
        return nextState.latestQuizResult
      },
      saveAnswer: async (answer) => {
        const response = await saveAnswerRequest(answer)
        setState(response.state)
        return response.answer
      },
    }),
    [],
  )
  const value = useMemo(
    () => ({ ...state, ...actions, isInitializing }),
    [state, actions, isInitializing],
  )
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
export function useApp() {
  const context = useContext(AppContext)
  if (!context) throw new Error('useApp must be used inside AppProvider')
  return context
}
