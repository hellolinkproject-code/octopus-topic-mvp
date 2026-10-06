// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import App from '../src/App'
import { AppProvider } from '../src/context/AppContext'
import { LanguageProvider } from '../src/i18n/LanguageContext'
import { ACCESS_TOKEN_KEY } from '../src/lib/api'
function show(route) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <LanguageProvider>
        <AppProvider>
          <App />
        </AppProvider>
      </LanguageProvider>
    </MemoryRouter>,
  )
}
beforeEach(() => {
  const storage = new Map()
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (k) => storage.get(k) || null,
      setItem: (k, v) => storage.set(k, v),
      removeItem: (k) => storage.delete(k),
    },
  })
  sessionStorage.clear()
  vi.spyOn(Math, 'random').mockReturnValue(0)
  global.fetch = vi.fn()
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})
it.each(['ko', 'en', 'zh', 'vi', 'mn', 'ja'])(
  'renders correction route without login in %s',
  async (lang) => {
    show(`/${lang}/correction`)
    expect(
      await screen.findByRole('heading', {
        name: lang === 'ko' ? '한국어 선생님 첨삭 신청' : 'Request a Korean teacher’s correction',
      }),
    ).toBeTruthy()
    expect(screen.getAllByRole('radio')).toHaveLength(3)
  },
)
it('remains usable if existing learner session restoration fails', async () => {
  localStorage.setItem(ACCESS_TOKEN_KEY, 'old-token')
  fetch.mockRejectedValue(new Error('network down'))
  show('/ko/correction')
  expect(await screen.findByRole('heading', { name: '한국어 선생님 첨삭 신청' })).toBeTruthy()
  await waitFor(() => expect(fetch).toHaveBeenCalled())
  expect(screen.queryByText('학습 기록을 불러오지 못했어요')).toBeNull()
})
it('shows separate problem and answer fields for both bundle questions', async () => {
  show('/ko/correction?product=bundle')
  expect(await screen.findByLabelText('53 · 문제 내용 또는 문제 설명')).toBeTruthy()
  expect(screen.getByLabelText('54 · 문제 내용 또는 문제 설명')).toBeTruthy()
  expect(screen.getByLabelText('53 · 답안 직접 입력')).toBeTruthy()
  expect(screen.getByLabelText('54 · 답안 직접 입력')).toBeTruthy()
})
it('guards missing answers without sending a request', async () => {
  show('/ko/correction')
  await screen.findByText('개인정보 수집 및 이용')
  fireEvent.submit(screen.getByRole('button', { name: '첨삭 신청하기' }).closest('form'))
  expect(await screen.findByRole('alert')).toBeTruthy()
  expect(fetch).not.toHaveBeenCalled()
})
it('labels all 12 survey cards as pre-launch opinions and renders FAQ', async () => {
  show('/ko/')
  expect(await screen.findAllByText('TOPIK 학습자 · 사전 설문')).toHaveLength(12)
  expect(screen.getByText('누가 첨삭하나요?').tagName).toBe('SUMMARY')
  expect(
    screen.getByRole('link', { name: '한국어 선생님 첨삭 신청하기' }).getAttribute('href'),
  ).toBe('/ko/correction')
})
it('shows only administrator authentication before a token exists', async () => {
  show('/ko/admin/corrections')
  expect(await screen.findByLabelText('관리자 Secret')).toBeTruthy()
  expect(screen.queryByText('주문 필터')).toBeNull()
})

it('provides service problem data and supports an external problem', async () => {
  show('/ko/correction?question=53')
  const question = await screen.findByLabelText('53 · 문제 내용 또는 문제 설명')
  expect(question.value).toContain('2020년: 74')
  expect(question.value).toContain('60대')
  fireEvent.click(screen.getByRole('button', { name: '53 · 다른 랜덤 문제 받기' }))
  expect(question.value).toContain('편리성: 2021년: 62')
  fireEvent.change(screen.getByLabelText('53 · 답안 작성 방식'), { target: { value: 'external' } })
  const externalQuestion = screen.getByLabelText('53 · 문제 내용 또는 문제 설명')
  expect(externalQuestion.value).toBe('')
  fireEvent.change(externalQuestion, { target: { value: '외부 문제 원문' } })
  expect(externalQuestion.value).toBe('외부 문제 원문')
})

it('restores the linked answer and its exact original problem after async session loading', async () => {
  localStorage.setItem(ACCESS_TOKEN_KEY, 'test-token')
  let restore
  fetch.mockImplementation(
    () =>
      new Promise((resolve) => {
        restore = resolve
      }),
  )
  show('/ko/correction?question=53&answerId=saved-original')
  expect(screen.getByLabelText('53 · 문제 내용 또는 문제 설명').value).toBe('')
  restore(
    new Response(
      JSON.stringify({
        state: {
          user: { id: 'user-1', name: 'Test' },
          points: 0,
          completedQuizIds: [],
          answers: [
            {
              id: 'saved-original',
              promptNumber: 53,
              promptId: 'transport',
              title: '대중교통 만족도 변화',
              promptDate: '2025-01-01',
              content: '내가 작성한 원래 답안',
              createdAt: '2025-01-01T00:00:00Z',
            },
          ],
        },
      }),
      { status: 200 },
    ),
  )
  await waitFor(() =>
    expect(screen.getByLabelText('53 · 답안 직접 입력').value).toBe('내가 작성한 원래 답안'),
  )
  expect(screen.getByLabelText('53 · 문제 내용 또는 문제 설명').value).toContain(
    '대중교통 만족도 변화',
  )
  expect(screen.getByLabelText('53 · 문제 내용 또는 문제 설명').value).toContain(
    '쾌적성: 2021년: 48, 2025년: 71',
  )
  expect(screen.getByLabelText('53 · 내가 저장한 답안').value).toBe('answer:saved-original')
  fireEvent.click(screen.getByRole('radio', { name: /TOPIK 53·54번 세트/ }))
  expect(screen.getByLabelText('54 · 답안 작성 방식').value).toBe('random')
  expect(screen.getByLabelText('54 · 문제 내용 또는 문제 설명').value).toContain('TOPIK II 54')
})

it('does not substitute a different service problem when the linked answer is unavailable', async () => {
  show('/ko/correction?answerId=someone-elses-answer')
  expect((await screen.findByRole('status')).textContent).toContain('불러오지 못했습니다')
  expect(screen.getByLabelText('54 · 문제 내용 또는 문제 설명').value).toBe('')
  expect(screen.getByLabelText('54 · 답안 직접 입력').value).toBe('')
})

it('renders the selected 53 graph and hides it for an external problem', async () => {
  show('/ko/correction?question=53')
  const graph = await screen.findByRole('img', {
    name: /연령대별 온라인 쇼핑 이용률 변화.*20대: 2020년 74%/,
  })
  expect(graph.querySelectorAll('.exam-graph-bar')).toHaveLength(6)
  fireEvent.click(screen.getByRole('button', { name: '53 · 다른 랜덤 문제 받기' }))
  expect(
    screen.getByRole('img', { name: /대중교통 만족도 변화.*쾌적성: 2021년 48%, 2025년 71%/ }),
  ).toBeTruthy()
  fireEvent.change(screen.getByLabelText('53 · 답안 작성 방식'), { target: { value: 'external' } })
  expect(document.querySelector('.exam-graph')).toBeNull()
})

it('assigns a random essay without a problem list and keeps the question read-only', async () => {
  show('/ko/correction')
  const source = await screen.findByLabelText('54 · 답안 작성 방식')
  expect(source.querySelectorAll('option')).toHaveLength(2)
  expect(source.value).toBe('random')
  const problem = screen.getByLabelText('54 · 문제 내용 또는 문제 설명')
  expect(problem.readOnly).toBe(true)
  const original = problem.value
  fireEvent.click(screen.getByRole('button', { name: '54 · 다른 랜덤 문제 받기' }))
  expect(problem.value).not.toBe(original)
  expect(problem.value).toContain('600~700자')
})

it('protects a written answer before rerolling and can cancel or confirm', async () => {
  show('/ko/correction')
  const problem = await screen.findByLabelText('54 · 문제 내용 또는 문제 설명')
  const original = problem.value
  const answer = screen.getByLabelText('54 · 답안 직접 입력')
  fireEvent.change(answer, { target: { value: '작성 중인 답안' } })
  fireEvent.click(screen.getByRole('button', { name: '54 · 다른 랜덤 문제 받기' }))
  expect(screen.getByRole('alert').textContent).toContain('초기화')
  expect(problem.value).toBe(original)
  expect(answer.value).toBe('작성 중인 답안')
  fireEvent.click(screen.getByRole('button', { name: '현재 문제 유지' }))
  expect(screen.queryByRole('alert')).toBeNull()
  expect(answer.value).toBe('작성 중인 답안')
  fireEvent.click(screen.getByRole('button', { name: '54 · 다른 랜덤 문제 받기' }))
  fireEvent.click(screen.getByRole('button', { name: '문제 바꾸기', exact: true }))
  expect(problem.value).not.toBe(original)
  expect(answer.value).toBe('')
})

it('keeps the assigned problem across a form remount and product switching', async () => {
  const view = show('/ko/correction')
  const original = (await screen.findByLabelText('54 · 문제 내용 또는 문제 설명')).value
  fireEvent.click(screen.getByRole('radio', { name: /TOPIK 53번 첨삭/ }))
  fireEvent.click(screen.getByRole('radio', { name: /TOPIK 54번 첨삭/ }))
  expect(screen.getByLabelText('54 · 문제 내용 또는 문제 설명').value).toBe(original)
  view.unmount()
  show('/ko/correction')
  expect((await screen.findByLabelText('54 · 문제 내용 또는 문제 설명')).value).toBe(original)
})
