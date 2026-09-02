import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { SignJWT, jwtVerify } from 'jose'

const issuer = 'octopus-topic-mvp'
const audience = 'octopus-topic-web'

function secret() {
  const value = process.env.JWT_SECRET
  if (!value) throw new Error('JWT_SECRET 환경 변수가 설정되지 않았습니다.')
  return new TextEncoder().encode(value)
}

export function normalizeEmail(email) {
  return email.trim().toLowerCase()
}

export function userIdFromEmail(email) {
  return createHash('sha256').update(normalizeEmail(email)).digest('hex').slice(0, 32)
}

export function createPasswordRecord(password) {
  const passwordSalt = randomBytes(16).toString('hex')
  const passwordHash = scryptSync(password, passwordSalt, 64).toString('hex')
  return { passwordSalt, passwordHash }
}

export function verifyPassword(password, user) {
  if (!user.passwordSalt || !user.passwordHash) return false
  const stored = Buffer.from(user.passwordHash, 'hex')
  const candidate = scryptSync(password, user.passwordSalt, 64)
  return stored.length === candidate.length && timingSafeEqual(stored, candidate)
}

export async function createAccessToken(userId) {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer(issuer)
    .setAudience(audience)
    .setExpirationTime('7d')
    .sign(secret())
}

export async function requireUserId(request) {
  const authorization = request.headers.authorization || ''
  const [scheme, token] = authorization.split(' ')
  if (scheme !== 'Bearer' || !token) return null

  try {
    const { payload } = await jwtVerify(token, secret(), { issuer, audience })
    return typeof payload.sub === 'string' ? payload.sub : null
  } catch {
    return null
  }
}
