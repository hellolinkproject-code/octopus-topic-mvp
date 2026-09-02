export function sendError(response, status, code, message, details) {
  return response.status(status).json({
    error: { code, message, ...(details ? { details } : {}) },
  })
}

export function invalidMethod(response, allowed) {
  response.setHeader('Allow', allowed.join(', '))
  return sendError(response, 405, 'METHOD_NOT_ALLOWED', '지원하지 않는 요청 방식입니다.')
}

export function validationError(response, error) {
  return sendError(
    response,
    400,
    'VALIDATION_ERROR',
    '입력값을 확인해 주세요.',
    error.flatten().fieldErrors,
  )
}

export function unauthorized(response) {
  return sendError(response, 401, 'UNAUTHORIZED', '로그인이 필요하거나 토큰이 만료되었습니다.')
}

export function serverError(response, error) {
  console.error(error)
  return sendError(response, 500, 'INTERNAL_ERROR', '서버에서 요청을 처리하지 못했습니다.')
}
