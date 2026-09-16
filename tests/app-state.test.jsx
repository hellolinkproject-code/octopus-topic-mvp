// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AppProvider, useApp } from '../src/context/AppContext'
const api = vi.hoisted(() => ({
  fetchMyState: vi.fn(),
  requestAnswerFeedback: vi.fn(),
  completeQuizRequest: vi.fn(),
}))
vi.mock('../src/lib/api', () => ({
  ...api,
  hasAccessToken: () => true,
  subscribeToAuthExpired: () => () => {},
  clearAccessToken: () => {},
  isAuthorizationError: () => false,
  loginRequest: vi.fn(),
  saveAnswerRequest: vi.fn(),
}))
const initial = {
  user: { id: 'test' },
  points: 100,
  answers: [],
  completedQuizIds: [],
  revision: 1,
}
function Probe() {
  const state = useApp()
  return (
    <div>
      <output>{state.user ? `${state.points}P` : 'signed out'}</output>
      <button onClick={() => void state.requestFeedback('answer')}>feedback</button>
      <button onClick={() => void state.completeQuiz('quiz', [])}>quiz</button>
      <button onClick={state.logout}>logout</button>
    </div>
  )
}
beforeEach(() => api.fetchMyState.mockResolvedValue(initial))
afterEach(() => {
  cleanup()
  vi.resetAllMocks()
})
it('ignores an older feedback response arriving after a newer quiz state', async () => {
  const user = userEvent.setup()
  let release
  api.requestAnswerFeedback.mockImplementation(
    () =>
      new Promise((resolve) => {
        release = resolve
      }),
  )
  api.completeQuizRequest.mockResolvedValue({ state: { ...initial, points: 80, revision: 3 } })
  render(
    <AppProvider>
      <Probe />
    </AppProvider>,
  )
  await screen.findByText('100P')
  await user.click(screen.getByText('feedback'))
  await user.click(screen.getByText('quiz'))
  await screen.findByText('80P')
  await act(async () => release({ state: { ...initial, points: 50, revision: 2 } }))
  expect(screen.getByText('80P')).toBeTruthy()
})
it('does not restore a logged-out account when feedback finishes', async () => {
  const user = userEvent.setup()
  let release
  api.requestAnswerFeedback.mockImplementation(
    () =>
      new Promise((resolve) => {
        release = resolve
      }),
  )
  render(
    <AppProvider>
      <Probe />
    </AppProvider>,
  )
  await screen.findByText('100P')
  await user.click(screen.getByText('feedback'))
  await user.click(screen.getByText('logout'))
  await act(async () => release({ state: { ...initial, points: 50, revision: 2 } }))
  await waitFor(() => expect(screen.getByText('signed out')).toBeTruthy())
})
