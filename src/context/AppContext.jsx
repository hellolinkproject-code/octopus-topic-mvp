import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { initialState, loadState, saveState } from '../lib/storage'
import { awardQuiz } from '../lib/progress'
import { getWritingReward } from '../lib/writingTask'
const AppContext = createContext(null)
export function AppProvider({ children }) {
  const [state, setState] = useState(initialState)
  const [isInitializing, setIsInitializing] = useState(true)
  useEffect(() => {
    const timer = setTimeout(() => {
      setState(loadState())
      setIsInitializing(false)
    }, 420)
    return () => clearTimeout(timer)
  }, [])
  useEffect(() => {
    if (!isInitializing) saveState(state)
  }, [state, isInitializing])
  const actions = useMemo(
    () => ({
      login: (email, name) =>
        setState((c) => ({
          ...c,
          user: { email, name: name || email.split('@')[0], joinedAt: new Date().toISOString() },
        })),
      logout: () => setState((c) => ({ ...c, user: null })),
      completeQuiz: (id, result) => setState((c) => awardQuiz(c, id, result)),
      saveAnswer: (answer) => {
        const earnedPoints = getWritingReward(answer.promptNumber)
        const saved = {
          ...answer,
          earnedPoints,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
        }
        setState((c) => ({ ...c, points: c.points + earnedPoints, answers: [saved, ...c.answers] }))
        return saved
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
