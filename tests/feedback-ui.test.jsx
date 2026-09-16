// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import FeedbackPanel from '../src/components/FeedbackPanel'
import { LanguageProvider } from '../src/i18n/LanguageContext'

const state = vi.hoisted(() => ({ points: 100, requestFeedback: vi.fn(), refreshState: vi.fn() }))
vi.mock('../src/context/AppContext', () => ({ useApp: () => state }))
const answer = { id: 'answer-a' }
function show(value = answer) {
  return render(
    <MemoryRouter initialEntries={['/ko/answers/answer-a']}>
      <LanguageProvider>
        <FeedbackPanel answer={value} />
      </LanguageProvider>
    </MemoryRouter>,
  )
}
afterEach(() => {
  cleanup()
  vi.resetAllMocks()
  state.points = 100
})
describe('Feedback request UI', () => {
  it('requires consent and disables duplicate requests while loading', async () => {
    const user = userEvent.setup()
    let release
    state.requestFeedback.mockImplementation(
      () =>
        new Promise((resolve) => {
          release = resolve
        }),
    )
    show()
    expect(screen.getByRole('button', { name: '50P로 맞춤 첨삭받기' }).disabled).toBe(true)
    await user.click(screen.getByRole('checkbox'))
    await user.click(screen.getByRole('button', { name: '50P로 맞춤 첨삭받기' }))
    expect(screen.getByRole('button', { name: '첨삭하는 중…' }).disabled).toBe(true)
    expect(screen.getByRole('status').textContent).toContain('살펴보고')
    release()
    expect(state.requestFeedback).toHaveBeenCalledTimes(1)
  })
  it('explains insufficient points and links to learning', () => {
    state.points = 10
    show()
    expect(
      screen.getByRole('link', { name: '퀴즈·53번으로 포인트 모으기' }).getAttribute('href'),
    ).toBe('/ko/dashboard')
    expect(screen.getByRole('button', { name: '50P로 맞춤 첨삭받기' }).disabled).toBe(true)
  })
  it('shows a provider failure and allows a retry', async () => {
    const user = userEvent.setup()
    state.requestFeedback.mockRejectedValue(
      Object.assign(new Error('일시 오류입니다.'), { name: 'ApiError' }),
    )
    show()
    await user.click(screen.getByRole('checkbox'))
    await user.click(screen.getByRole('button', { name: '50P로 맞춤 첨삭받기' }))
    expect((await screen.findByRole('alert')).textContent).toContain('일시 오류')
    expect(screen.getByRole('button', { name: '50P로 맞춤 첨삭받기' }).disabled).toBe(false)
  })
  it('renders a saved result and the no-corrections state without a purchase button', () => {
    show({
      ...answer,
      aiFeedback: {
        summary: '총평',
        strengths: ['장점'],
        improvements: ['개선'],
        corrections: [],
        nextSteps: ['연습'],
        cost: 50,
      },
    })
    expect(screen.getByText('총평')).toBeTruthy()
    expect(screen.getByText(/추가 문장 수정 제안이 없습니다/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: '50P로 맞춤 첨삭받기' })).toBeNull()
  })
})
