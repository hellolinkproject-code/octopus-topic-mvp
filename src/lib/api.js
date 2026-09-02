const TOKEN_KEY = 'octopus-topic-access-token-v1'

export class ApiError extends Error {
  constructor(message, status, details) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }
}

async function parseResponse(response) {
  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new ApiError(
      payload?.error?.message || '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.',
      response.status,
      payload?.error?.details,
    )
  }

  return payload
}

async function authFetch(url, options = {}) {
  const token = localStorage.getItem(TOKEN_KEY)
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })

  if (response.status === 401) localStorage.removeItem(TOKEN_KEY)
  return parseResponse(response)
}

export function hasAccessToken() {
  return Boolean(localStorage.getItem(TOKEN_KEY))
}

export function clearAccessToken() {
  localStorage.removeItem(TOKEN_KEY)
}

export async function loginRequest(email, password) {
  const payload = await parseResponse(
    await fetch('/api/auth-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name: email.split('@')[0] }),
    }),
  )
  localStorage.setItem(TOKEN_KEY, payload.accessToken)
  return payload.state
}

export async function fetchMyState() {
  return authFetch('/api/me')
}

export async function completeQuizRequest(quizId, result) {
  return authFetch('/api/me', {
    method: 'PATCH',
    body: JSON.stringify({ action: 'completeQuiz', quizId, result }),
  })
}

export async function saveAnswerRequest(answer) {
  return authFetch('/api/answers', {
    method: 'POST',
    body: JSON.stringify(answer),
  })
}

export async function fetchAnswers() {
  return authFetch('/api/answers')
}
