import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

export const SESSION_COOKIE = '__Host-karama_admin'
export const SESSION_TTL = 8 * 60 * 60 * 1000
const signature = (value, secret) => createHmac('sha256', secret).update(`karama-admin-session:${value}`).digest('base64url')

export function issueSession(secret, now = Date.now()) {
  const value = `${now + SESSION_TTL}.${randomBytes(32).toString('base64url')}`
  return `${value}.${signature(value, secret)}`
}

export function hasAdminSession(request, secret, now = Date.now()) {
  if (!secret) return false
  const cookies = (request.headers.get('cookie') || '').split(';').map((item) => item.trim())
  const matches = cookies.filter((item) => item.startsWith(`${SESSION_COOKIE}=`))
  if (matches.length !== 1) return false
  const token = matches[0].slice(SESSION_COOKIE.length + 1)
  const parts = token.split('.')
  if (parts.length !== 3 || !/^\d+$/.test(parts[0]) || !/^[\w-]{43}$/.test(parts[1])) return false
  const expires = Number(parts[0])
  if (!Number.isSafeInteger(expires) || expires <= now || expires > now + SESSION_TTL) return false
  const expected = Buffer.from(signature(`${parts[0]}.${parts[1]}`, secret))
  const given = Buffer.from(parts[2])
  return given.length === expected.length && timingSafeEqual(given, expected)
}

// A browser-session cookie; the signed expiry also bounds restored or copied cookies.
export const sessionCookie = (value, clear = false) =>
  `${SESSION_COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict${clear ? '; Max-Age=0' : ''}`
