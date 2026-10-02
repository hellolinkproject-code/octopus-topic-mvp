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
