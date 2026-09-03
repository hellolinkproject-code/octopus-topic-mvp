// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, useLocation } from 'react-router-dom'
import App from '../src/App'
import { AppProvider, useApp } from '../src/context/AppContext'
import { LanguageProvider } from '../src/i18n/LanguageContext'
import { ACCESS_TOKEN_KEY } from '../src/lib/api'

const serverState = {
  user: { id: 'user-a', email: 'a@example.com', name: 'A', joinedAt: '2026-09-01' },
  points: 30,
  completedQuizIds: [],
  latestQuizResult: null,
  answers: [],
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function memoryStorage() {
  const values = new Map()
  return {
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, String(value)),
  }
}

function Probe() {
  const app = useApp()
  return (
    <div>
      <span data-testid="user">{app.user?.email || ''}</span>
      <span data-testid="restore-error">{app.restoreError?.message || ''}</span>
      <button onClick={() => void app.login('a@example.com', 'password')}>login</button>
      <button onClick={() => void app.retryRestore()}>retry</button>
      <button
        onClick={() =>
          void app.saveAnswer({ promptNumber: 53 }).catch(() => {
            // The provider handles global expiration before the caller receives the error.
          })
        }
      >
        save
      </button>
    </div>
  )
}

function LocationProbe() {
  const location = useLocation()
  return (
    <output data-testid="location">{`${location.pathname}${location.search}${location.hash}`}</output>
  )
}

function renderProvider() {
  return render(
    <MemoryRouter>
      <AppProvider>
        <Probe />
      </AppProvider>
    </MemoryRouter>,
  )
}

describe('frontend authentication behavior', () => {
  beforeEach(() => {
    const storage = memoryStorage()
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: storage,
    })
    Object.defineProperty(window, 'localStorage', { configurable: true, value: storage })
    global.fetch = vi.fn()
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('stores the token and applies server state after login', async () => {
    fetch.mockResolvedValue(
      jsonResponse({ accessToken: 'login-token', expiresIn: 604800, state: serverState }),
    )
    renderProvider()
    await userEvent.click(screen.getByRole('button', { name: 'login' }))
    expect(await screen.findByText('a@example.com')).toBeTruthy()
    expect(localStorage.getItem(ACCESS_TOKEN_KEY)).toBe('login-token')
  })

  it('returns to the originally requested multilingual route after login', async () => {
    fetch.mockResolvedValue(
      jsonResponse({ accessToken: 'login-token', expiresIn: 604800, state: serverState }),
    )
    render(
      <MemoryRouter initialEntries={['/en/dashboard?source=login#progress']}>
        <LanguageProvider>
          <AppProvider>
            <App />
            <LocationProbe />
          </AppProvider>
        </LanguageProvider>
      </MemoryRouter>,
    )
    const user = userEvent.setup()
    await user.type(await screen.findByLabelText('Email'), 'a@example.com')
    await user.type(screen.getByLabelText('Password'), 'password')
    await user.click(screen.getByRole('button', { name: /Log in and learn/i }))
    await waitFor(() =>
      expect(screen.getByTestId('location').textContent).toBe(
        '/en/dashboard?source=login#progress',
      ),
    )
  })

  it('restores server state after a refresh', async () => {
    localStorage.setItem(ACCESS_TOKEN_KEY, 'saved-token')
    fetch.mockResolvedValue(jsonResponse(serverState))
    renderProvider()
    expect(await screen.findByText('a@example.com')).toBeTruthy()
    expect(fetch).toHaveBeenCalledWith(
      '/api/me',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer saved-token' }),
      }),
    )
  })

  it.each([401, 403])('clears the session when restore returns %s', async (status) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, 'expired-token')
    fetch.mockResolvedValue(jsonResponse({ error: { message: 'expired' } }, status))
    renderProvider()
    await waitFor(() => expect(localStorage.getItem(ACCESS_TOKEN_KEY)).toBeNull())
    expect(screen.getByTestId('user').textContent).toBe('')
    expect(screen.getByTestId('restore-error').textContent).toBe('')
  })

  it.each([
    ['500 response', () => jsonResponse({ error: { message: 'server error' } }, 500)],
    ['network error', () => Promise.reject(new TypeError('network down'))],
  ])('keeps the token on a %s', async (_label, failure) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, 'keep-token')
    fetch.mockImplementationOnce(failure)
    renderProvider()
    await waitFor(() => expect(screen.getByTestId('restore-error').textContent).not.toBe(''))
    expect(localStorage.getItem(ACCESS_TOKEN_KEY)).toBe('keep-token')
  })

  it('retries from the restore error screen and keeps the original route', async () => {
    localStorage.setItem(ACCESS_TOKEN_KEY, 'keep-token')
    fetch
      .mockResolvedValueOnce(jsonResponse({ error: { message: 'temporary failure' } }, 500))
      .mockResolvedValueOnce(jsonResponse(serverState))
    render(
      <MemoryRouter initialEntries={['/ko/dashboard']}>
        <LanguageProvider>
          <AppProvider>
            <App />
          </AppProvider>
        </LanguageProvider>
      </MemoryRouter>,
    )
    expect(
      await screen.findByRole('heading', { name: '학습 기록을 불러오지 못했어요' }),
    ).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: '다시 시도' }))
    expect(await screen.findByText(/A님/)).toBeTruthy()
  })

  it('clears global user state when an in-use save returns 401', async () => {
    localStorage.setItem(ACCESS_TOKEN_KEY, 'expired-during-use')
    fetch
      .mockResolvedValueOnce(jsonResponse(serverState))
      .mockResolvedValueOnce(jsonResponse({ error: { message: 'expired' } }, 401))
    renderProvider()
    expect(await screen.findByText('a@example.com')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'save' }))
    await waitFor(() => expect(screen.getByTestId('user').textContent).toBe(''))
    expect(localStorage.getItem(ACCESS_TOKEN_KEY)).toBeNull()
  })
})
