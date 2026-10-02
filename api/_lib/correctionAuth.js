import { createHash, timingSafeEqual } from 'node:crypto'
import { SignJWT, jwtVerify } from 'jose'
const issuer = 'octopus-teacher-admin',
  audience = 'octopus-teacher-console'
function key() {
  const secret = process.env.ADMIN_SECRET
  if (!secret || secret.length < 32) throw new Error('ADMIN_NOT_CONFIGURED')
  return createHash('sha256').update(`teacher-session:${secret}`).digest()
}
export async function adminLogin(secret) {
  const configured = process.env.ADMIN_SECRET
  key()
  if (
    typeof secret !== 'string' ||
    secret.length > 1024 ||
    !timingSafeEqual(
      createHash('sha256').update(secret).digest(),
      createHash('sha256').update(configured).digest(),
    )
  )
    return null
  return new SignJWT({ role: 'teacher-admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(issuer)
    .setAudience(audience)
    .setIssuedAt()
    .setExpirationTime('30m')
    .sign(key())
}
export async function isAdmin(request) {
  const [scheme, token] = (request.headers.authorization || '').split(' ')
  if (scheme !== 'Bearer' || !token) return false
  try {
    const { payload } = await jwtVerify(token, key(), { issuer, audience, algorithms: ['HS256'] })
    return payload.role === 'teacher-admin'
  } catch {
    return false
  }
}
