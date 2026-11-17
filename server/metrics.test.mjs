import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createApi } from './api.mjs'
import { createMemoryStore, createMetrics, createThrottle, hasAdminToken, isCountable, summarize, usesNeonHttp } from './metrics.mjs'

const TOKEN = 'a-long-test-password'
const at = (iso) => () => new Date(iso)
const request = (path, { method = 'GET', body, token, origin } = {}) =>
  new Request(`http://localhost${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(origin ? { Origin: origin } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
const api = (extra = {}) => {
  const metrics = createMetrics({ store: createMemoryStore(), now: at('2026-11-17T10:00:00Z') })
  return { metrics, api: createApi({ env: { ADMIN_TOKEN: TOKEN }, providers: [], metrics, ...extra }) }
}

test('only the fixed vocabulary can be counted', () => {
  assert.equal(isCountable('visit', 'site'), true)
  assert.equal(isCountable('tool', 'comparer'), true)
  assert.equal(isCountable('tool', 'a question typed by a visitor'), false)
  assert.equal(isCountable('constructor', 'site'), false)
  assert.equal(isCountable('__proto__', 'site'), false)
})

test('counts add up per day, kind and name, and unknown ones are dropped', async () => {
  const m = createMetrics({ store: createMemoryStore(), now: at('2026-11-17T10:00:00Z') })
  assert.equal(await m.record('visit', 'site'), true)
  await m.record('visit', 'site')
  await m.record('tool', 'fin')
  assert.equal(await m.record('tool', 'secret-name'), false)
  const s = await m.summary(7)
  assert.equal(s.visits, 2)
  assert.equal(s.tools.find((t) => t.name === 'fin').count, 1)
  assert.equal(s.daily.length, 7)
  assert.equal(s.daily.at(-1).visits, 2)
  assert.equal(s.daily[0].visits, 0)
})

test('the assistant summary gives the average time of the answers only', () => {
  const rows = [
    { day: '2026-11-17', kind: 'assistant', name: 'asked', count: 4, ms: 0 },
    { day: '2026-11-17', kind: 'assistant', name: 'answered', count: 2, ms: 5000 },
    { day: '2026-11-17', kind: 'assistant', name: 'failed', count: 1, ms: 900 },
    { day: '2026-11-17', kind: 'assistant', name: 'refused', count: 1, ms: 3 },
  ]
  const s = summarize(rows, 3, new Date('2026-11-17T10:00:00Z'))
  assert.deepEqual(s.assistant, { asked: 4, answered: 2, refused: 1, failed: 1, avgMs: 2500 })
  assert.equal(s.daily.at(-1).asked, 4)
})

test('without a database nothing is recorded and nothing breaks', async () => {
  const m = createMetrics({ env: {} })
  assert.equal(m.enabled, false)
  assert.equal(await m.record('visit', 'site'), false)
})

test('a failing store never throws into the caller', async () => {
  const broken = {
    add: async () => {
      throw new Error('down')
    },
    since: async () => [],
  }
  assert.equal(await createMetrics({ store: broken }).record('visit', 'site'), false)
})

test('/api/track accepts a known event, refuses the rest', async () => {
  const { api: a, metrics } = api()
  assert.equal((await a.track(request('/api/track', { method: 'POST', body: { kind: 'tool', name: 'comparer' } }))).status, 204)
  assert.equal((await metrics.summary(1)).tools.find((t) => t.name === 'comparer').count, 1)
  for (const body of [
    { kind: 'tool', name: 'inconnu' },
    { kind: 'assistant', name: 'answered' },
    { kind: 'nope', name: 'x' },
    null,
    'text',
  ])
    assert.equal((await a.track(request('/api/track', { method: 'POST', body }))).status, 400)
  assert.equal((await a.track(request('/api/track'))).status, 405)
  assert.equal((await a.track(request('/api/track', { method: 'POST', body: { kind: 'visit', name: 'site' }, origin: 'https://evil.example' }))).status, 403)
  const big = { kind: 'visit', name: 'site', pad: 'x'.repeat(500) }
  assert.equal((await a.track(request('/api/track', { method: 'POST', body: big }))).status, 413)
})

test('/api/track is throttled per visitor, and answers 202 (not kept) when metrics are off', async () => {
  const { api: a } = api({ trackThrottle: createThrottle(2) })
  const send = () => a.track(request('/api/track', { method: 'POST', body: { kind: 'visit', name: 'site' } }), '1.2.3.4')
  assert.equal((await send()).status, 204)
  assert.equal((await send()).status, 204)
  assert.equal((await send()).status, 429)
  const off = createApi({ env: {}, providers: [], metrics: createMetrics({ env: {} }) })
  assert.equal((await off.track(request('/api/track', { method: 'POST', body: { kind: 'visit', name: 'site' } }))).status, 202)
})

test('/api/metrics needs the password', async () => {
  const { api: a } = api()
  assert.equal((await a.metrics(request('/api/metrics'))).status, 401)
  assert.equal((await a.metrics(request('/api/metrics', { token: 'wrong' }))).status, 401)
  const ok = await a.metrics(request('/api/metrics?days=7', { token: TOKEN }))
  assert.equal(ok.status, 200)
  assert.equal((await ok.json()).days, 7)
  assert.equal((await a.metrics(request('/api/metrics', { method: 'POST' }))).status, 405)
})

test('/api/metrics says it is not configured rather than letting anyone in', async () => {
  const noToken = createApi({ env: {}, providers: [], metrics: createMetrics({ store: createMemoryStore() }) })
  assert.equal((await noToken.metrics(request('/api/metrics', { token: '' }))).status, 503)
  const noDb = createApi({ env: { ADMIN_TOKEN: TOKEN }, providers: [], metrics: createMetrics({ env: {} }) })
  assert.equal((await noDb.metrics(request('/api/metrics', { token: TOKEN }))).status, 503)
})

test('password attempts are throttled', async () => {
  const { api: a } = api({ adminThrottle: createThrottle(3) })
  for (let i = 0; i < 3; i++) assert.equal((await a.metrics(request('/api/metrics', { token: 'x' }), '9.9.9.9')).status, 401)
  assert.equal((await a.metrics(request('/api/metrics', { token: TOKEN }), '9.9.9.9')).status, 429)
})

test('the password is compared exactly', () => {
  const req = (value) => new Request('http://localhost', { headers: value ? { Authorization: value } : {} })
  assert.equal(hasAdminToken(req(`Bearer ${TOKEN}`), TOKEN), true)
  assert.equal(hasAdminToken(req(`bearer ${TOKEN}`), TOKEN), true)
  assert.equal(hasAdminToken(req(`Bearer ${TOKEN}x`), TOKEN), false)
  assert.equal(hasAdminToken(req(), TOKEN), false)
  assert.equal(hasAdminToken(req('Bearer '), ''), false)
  assert.equal(hasAdminToken(req('Bearer '), undefined), false)
})

test('the assistant outcomes are counted, never the question', async () => {
  const metrics = createMetrics({ store: createMemoryStore(), now: at('2026-11-17T10:00:00Z') })
  const a = createApi({
    env: {},
    providers: [],
    metrics,
    context: async (value) => ({ question: value.question }),
  })
  const ask = (question) =>
    a.assistant(request('/api/assistant', { method: 'POST', body: { question } }), '1.1.1.1')
  assert.equal((await ask('Écris-moi un code python qui calcule l’IRSA')).status, 200)
  assert.equal((await ask('Explique mon net.')).status, 503)
  const { assistant } = await metrics.summary(1)
  assert.deepEqual(assistant, { asked: 2, answered: 0, refused: 1, failed: 1, avgMs: 0 })
  assert.equal(JSON.stringify(await metrics.summary(1)).includes('python'), false)
})

test('Neon is reached over HTTP, any other Postgres over a normal connection', () => {
  assert.equal(usesNeonHttp('postgresql://u:p@ep-cool-123-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require'), true)
  assert.equal(usesNeonHttp('postgres://karama:karama@db:5432/karama'), false)
  assert.equal(usesNeonHttp('postgres://u:p@localhost/db'), false)
  assert.equal(usesNeonHttp('not a url'), false)
})
