import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createLimiter, createMemoryLimiter } from './limits.mjs'

const MINUTE = 60_000
const DAY = 86_400_000

test('per visitor and minute: the next minute starts clean, another visitor is unaffected', async () => {
  let clock = 10 * DAY
  const limiter = createMemoryLimiter({ rateLimit: 2, now: () => clock })
  for (const ip of ['a', 'a']) {
    assert.equal(await limiter.take(ip), null)
    limiter.release()
  }
  const refused = await limiter.take('a')
  assert.equal(refused.status, 429)
  assert.ok(refused.retryAfter > 0 && refused.retryAfter <= 60)
  assert.equal(await limiter.take('b'), null)
  limiter.release()
  clock += MINUTE + 1
  assert.equal(await limiter.take('a'), null)
})

test('per visitor and day, then for the whole site', async () => {
  let clock = 10 * DAY
  const limiter = createMemoryLimiter({ rateLimit: 100, ipDailyLimit: 3, dailyLimit: 5, now: () => clock })
  const go = async (ip) => {
    const result = await limiter.take(ip)
    if (!result) limiter.release()
    return result
  }
  for (let i = 0; i < 3; i++) assert.equal(await go('a'), null)
  assert.match((await go('a')).error, /aujourd’hui/)
  assert.equal(await go('b'), null)
  assert.equal(await go('b'), null)
  assert.match((await go('c')).error, /capacité/)
  clock += DAY
  assert.equal(await go('a'), null, 'a new day resets everything')
})

test('at most a few requests at once', async () => {
  const limiter = createMemoryLimiter({ maxActive: 2 })
  assert.equal(await limiter.take('a'), null)
  assert.equal(await limiter.take('b'), null)
  assert.equal((await limiter.take('c')).status, 429)
  limiter.release()
  assert.equal(await limiter.take('c'), null)
})

test('createLimiter gives the in-memory limiter, with the free-tier defaults', async () => {
  const limiter = createLimiter()
  assert.equal(limiter.kind, 'memory')
  for (let i = 0; i < 5; i++) {
    assert.equal(await limiter.take('a'), null)
    limiter.release()
  }
  assert.equal((await limiter.take('a')).status, 429)
})
