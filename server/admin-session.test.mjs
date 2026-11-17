import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createApi } from './api.mjs'
import { createMetrics, createMemoryStore, createThrottle } from './metrics.mjs'
import { SESSION_COOKIE, SESSION_TTL, issueSession, hasAdminSession } from './admin-session.mjs'

const secret = 'a-long-test-password'
const setup = (extra = {}) => createApi({ env: { ADMIN_TOKEN: secret }, providers: [], metrics: createMetrics({ store: createMemoryStore() }), ...extra })
const login = (password = secret, headers = {}) => new Request('https://karama.test/api/admin-session', {
  method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Karama-Admin': '1', Origin: 'https://karama.test', ...headers },
  body: JSON.stringify({ password }),
})
const metricsRequest = (cookie) => new Request('https://karama.test/api/metrics', { headers: { Cookie: cookie } })

test('login creates an HttpOnly Secure Strict cookie, not a credential in JSON; cookie opens metrics', async () => {
  const api = setup()
  const response = await api.adminSession(login())
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { ok: true })
  assert.equal(response.headers.get('cache-control'), 'no-store')
  const cookie = response.headers.get('set-cookie')
  for (const attr of ['HttpOnly', 'Secure', 'SameSite=Strict', 'Path=/']) assert.ok(cookie.includes(attr))
  assert.ok(cookie.startsWith(`${SESSION_COOKIE}=`))
  assert.equal(cookie.includes(secret), false)
  assert.equal((await api.metrics(metricsRequest(cookie.split(';')[0]))).status, 200)
  // A second instance with the same secret verifies the session without local state.
  assert.equal((await setup().metrics(metricsRequest(cookie.split(';')[0]))).status, 200)
  assert.equal((await api.metrics(metricsRequest(''))).status, 401)
})

test('invalid passwords including malformed input never set a session; login is throttled', async () => {
  const api = setup({ adminThrottle: createThrottle(3) })
  for (const value of ['wrong', null, '\n']) {
    const response = await api.adminSession(login(value))
    assert.equal(response.status, 401)
    assert.equal(response.headers.has('set-cookie'), false)
  }
  assert.equal((await api.adminSession(login())).status, 429)
})

test('session rejects expiry, tampering, password rotation, duplicates and a password as a cookie', () => {
  const now = Date.now()
  const token = issueSession(secret, now)
  const request = (value) => metricsRequest(`${SESSION_COOKIE}=${value}`)
  assert.equal(hasAdminSession(request(token), secret, now), true)
  assert.equal(hasAdminSession(request(token), secret, now + SESSION_TTL), false)
  assert.equal(hasAdminSession(request(token + 'x'), secret, now), false)
  assert.equal(hasAdminSession(request('9' + token), secret, now), false)
  assert.equal(hasAdminSession(request(token), 'rotated-secret', now), false)
  assert.equal(hasAdminSession(request(secret), secret, now), false)
  assert.equal(hasAdminSession(metricsRequest(`${SESSION_COOKIE}=${token}; ${SESSION_COOKIE}=${token}`), secret, now), false)
  assert.notEqual(issueSession(secret, now), token)
})

test('session changes reject cross-origin, cross-site and simple requests; logout clears cookie', async () => {
  const api = setup()
  assert.equal((await api.adminSession(login(secret, { Origin: 'https://evil.test' }))).status, 403)
  assert.equal((await api.adminSession(login(secret, { 'Sec-Fetch-Site': 'cross-site' }))).status, 403)
  assert.equal((await api.adminSession(login(secret, { 'X-Karama-Admin': '' }))).status, 403)
  assert.equal((await api.adminSession(new Request('https://karama.test/api/admin-session'))).status, 405)
  const logout = await api.adminSession(new Request('https://karama.test/api/admin-session', { method: 'DELETE', headers: { 'X-Karama-Admin': '1' } }))
  assert.equal(logout.status, 200)
  assert.ok(logout.headers.get('set-cookie').includes('Max-Age=0'))
  const off = setup({ env: {} })
  assert.equal((await off.adminSession(login())).status, 503)
})
