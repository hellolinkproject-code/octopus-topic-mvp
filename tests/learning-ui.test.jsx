// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { LanguageProvider } from '../src/i18n/LanguageContext'
import { getDailyQuiz } from '../src/lib/dailyContent'
import QuizPage from '../src/pages/QuizPage'
import WriteAnswerPage from '../src/pages/WriteAnswerPage'

const app = vi.hoisted(() => ({
  completeQuiz: vi.fn(),
  saveAnswer: vi.fn(),
  user: { id: 'user-a', email: 'a@example.com', name: 'A' },
  points: 0,
  logout: vi.fn(),
}))

vi.mock('../src/context/AppContext', () => ({ useApp: () => app }))

function memoryStorage() {
  const values = new Map()
  return {
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, String(value)),
  }
}

function renderRoute(path, element, routePath) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <LanguageProvider>
        <Routes>
          <Route path={routePath} element={element} />
          <Route path="/ko/quiz/result" element={<p>result route</p>} />
        </Routes>
      </LanguageProvider>
    </MemoryRouter>,
  )
}

async function finishQuiz(user) {
  const quiz = getDailyQuiz()
  for (let index = 0; index < quiz.questions.length; index += 1) {
    const radios = screen.getAllByRole('radio')
    await user.click(radios[0])
    await user.click(
      screen.getByRole('button', { name: index === quiz.questions.length - 1 ? /결과/ : /다음/ }),
    )
  }
  return quiz
}

describe('learning save UI', () => {
  beforeEach(() => {
    const storage = memoryStorage()
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: storage,
    })
    Object.defineProperty(window, 'localStorage', { configurable: true, value: storage })
    vi.clearAllMocks()
    window.scrollTo = vi.fn()
    Element.prototype.scrollIntoView = vi.fn()
  })

  afterEach(() => cleanup())

  it('submits only quiz selections and moves to the result on success', async () => {
    app.completeQuiz.mockResolvedValue({ quizId: 'verified', questions: [], selections: [] })
    renderRoute('/ko/quiz/today', <QuizPage />, '/:lang/quiz/today')
    const quiz = await finishQuiz(userEvent.setup())
    expect(app.completeQuiz).toHaveBeenCalledWith(quiz.id, Array(quiz.questions.length).fill(0))
    expect(await screen.findByText('result route')).toBeTruthy()
  })

  it('shows the server error when quiz saving fails', async () => {
    app.completeQuiz.mockRejectedValue(new Error('퀴즈 저장 실패'))
    renderRoute('/ko/quiz/today', <QuizPage />, '/:lang/quiz/today')
    await finishQuiz(userEvent.setup())
    expect((await screen.findByRole('alert')).textContent).toContain('퀴즈 저장 실패')
  })

  it('keeps the writing completion UI after a successful save', async () => {
    const content = '가'.repeat(200)
    app.saveAnswer.mockResolvedValue({ id: 'answer-1', content })
    renderRoute('/ko/writing/53/new', <WriteAnswerPage />, '/:lang/writing/:questionNumber/new')
    const user = userEvent.setup()
    fireEvent.change(screen.getByRole('textbox'), { target: { value: content } })
    await user.click(screen.getByRole('button', { name: /답안 저장/ }))
    await waitFor(() => expect(app.saveAnswer).toHaveBeenCalledTimes(1))
    expect((await screen.findByRole('button', { name: /저장 완료/ })).disabled).toBe(true)
  })

  it('shows the server error when writing saving fails', async () => {
    app.saveAnswer.mockRejectedValue(new Error('답안 저장 실패'))
    renderRoute('/ko/writing/53/new', <WriteAnswerPage />, '/:lang/writing/:questionNumber/new')
    const user = userEvent.setup()
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '가'.repeat(200) } })
    await user.click(screen.getByRole('button', { name: /답안 저장/ }))
    expect(await screen.findByText('답안 저장 실패')).toBeTruthy()
  })
})
