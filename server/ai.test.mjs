import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createAssistant, loadProviders } from './ai.mjs'

const context = { question: 'Explique.', scenarios: [] }
const ok = (text) =>
  Response.json({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text }] }] })
const make = (providers, fetcher, extra = {}) => createAssistant({ providers, fetcher, log: () => {}, ...extra })
const keyOf = (init) => init.headers.Authorization.replace('Bearer ', '')

test('providers follow AI_PROVIDERS, keys split on commas, providers without keys are skipped', () => {
  const providers = loadProviders({
    AI_PROVIDERS: 'gemini, Anthropic ,openai,unknown,openrouter',
    OPENAI_API_KEYS: ' a , b,,a ,c',
    ANTHROPIC_API_KEY: 'solo',
    GEMINI_API_KEYS: '',
    ANTHROPIC_MODEL: 'claude-test',
  })
  assert.deepEqual(
    providers.map((p) => [p.name, p.keys, p.model]),
    [
      ['anthropic', ['solo'], 'claude-test'],
      ['openai', ['a', 'b', 'c'], 'gpt-5-mini'],
    ],
  )
})

test('without AI_PROVIDERS, every provider that has a key is used', () => {
  const providers = loadProviders({ GEMINI_API_KEYS: 'g', OPENAI_API_KEY: 'o' })
  // Free tiers first.
  assert.deepEqual(providers.map((p) => p.name), ['gemini', 'openai'])
  assert.deepEqual(loadProviders({ ANTHROPIC_API_KEY: 'a', GROQ_API_KEYS: 'g1,g2', OPENROUTER_API_KEY: 'r' }).map((p) => p.name), ['groq', 'openrouter', 'anthropic'])
  assert.deepEqual(loadProviders({}), [])
})

test('keys take turns: successive requests start from the next key', async () => {
  const seen = []
  const ai = make([{ name: 'openai', keys: ['k1', 'k2', 'k3'], model: 'm' }], async (url, init) => {
    seen.push(keyOf(init))
    return ok('ok')
  })
  for (let i = 0; i < 6; i++) await ai.ask(context)
  assert.equal(new Set(seen).size, 3)
  assert.deepEqual(seen.slice(0, 3), [...seen.slice(3)], 'the cycle repeats')
})

test('a rejected or exhausted key hands over to the next one, and rests', async () => {
  const seen = []
  const ai = make([{ name: 'openai', keys: ['bad', 'limited', 'good'], model: 'm' }], async (url, init) => {
    const key = keyOf(init)
    seen.push(key)
    if (key === 'bad') return new Response('{}', { status: 401 })
    if (key === 'limited') return new Response('{}', { status: 429, headers: { 'retry-after': '30' } })
    return ok('réponse')
  }, { now: () => 1_000_000 })
  // Force a start on the first key.
  const original = Math.random
  Math.random = () => 0
  try {
    assert.deepEqual(await ai.ask(context), { answer: 'réponse' })
    assert.deepEqual(seen, ['bad', 'limited', 'good'])
    seen.length = 0
    for (let i = 0; i < 3; i++) assert.deepEqual(await ai.ask(context), { answer: 'réponse' })
    assert.deepEqual([...new Set(seen)], ['good'], 'the failed keys are left alone while they rest')
  } finally {
    Math.random = original
  }
})

test('a rested key comes back after its cooldown', async () => {
  let clock = 0
  let limited = true
  const seen = []
  const ai = make([{ name: 'openai', keys: ['a', 'b'], model: 'm' }], async (url, init) => {
    const key = keyOf(init)
    seen.push(key)
    return key === 'a' && limited ? new Response('{}', { status: 429 }) : ok('ok')
  }, { now: () => clock })
  const original = Math.random
  Math.random = () => 0
  try {
    await ai.ask(context)
    limited = false
    clock += 61_000
    seen.length = 0
    for (let i = 0; i < 2; i++) await ai.ask(context)
    assert.deepEqual([...new Set(seen)].sort(), ['a', 'b'])
  } finally {
    Math.random = original
  }
})

test('when a provider is down, the next provider in the order answers', async () => {
  const calls = []
  const ai = make(
    [
      { name: 'anthropic', keys: ['x1', 'x2'], model: 'claude-test' },
      { name: 'openai', keys: ['o1'], model: 'gpt-test' },
    ],
    async (url) => {
      calls.push(new URL(url).hostname)
      return url.includes('anthropic') ? new Response('{}', { status: 503 }) : ok('secours')
    },
  )
  assert.deepEqual(await ai.ask(context), { answer: 'secours' })
  assert.equal(calls.at(-1), 'api.openai.com')
  assert.ok(calls.filter((host) => host === 'api.anthropic.com').length >= 1)
})

test('a wrong model name skips the rest of that provider at once', async () => {
  const calls = []
  const ai = make(
    [
      { name: 'openai', keys: ['a', 'b', 'c'], model: 'nope' },
      { name: 'gemini', keys: ['g'], model: 'gemini-test' },
    ],
    async (url) => {
      calls.push(new URL(url).hostname)
      if (url.includes('openai')) return new Response('{}', { status: 404 })
      return Response.json({ candidates: [{ content: { parts: [{ text: 'gemini' }] }, finishReason: 'STOP' }] })
    },
  )
  assert.deepEqual(await ai.ask(context), { answer: 'gemini' })
  assert.equal(calls.filter((host) => host === 'api.openai.com').length, 1)
})

test('every provider speaks its own protocol and is read correctly', async () => {
  const checks = {
    anthropic: [(init) => init.headers['x-api-key'] === 'k' && JSON.parse(init.body).system, Response.json({ content: [{ type: 'text', text: 'A' }], stop_reason: 'end_turn' })],
    gemini: [(init) => init.headers['x-goog-api-key'] === 'k', Response.json({ candidates: [{ content: { parts: [{ text: 'G' }] }, finishReason: 'STOP' }] })],
    openrouter: [(init) => init.headers.Authorization === 'Bearer k' && JSON.parse(init.body).messages.length === 2, Response.json({ choices: [{ message: { content: 'R' }, finish_reason: 'stop' }] })],
    xai: [(init) => init.headers.Authorization === 'Bearer k' && JSON.parse(init.body).model === 'm', Response.json({ choices: [{ message: { content: 'X' }, finish_reason: 'stop' }] })],
    deepseek: [(init) => init.headers.Authorization === 'Bearer k' && JSON.parse(init.body).messages[0].role === 'system', Response.json({ choices: [{ message: { content: 'D' }, finish_reason: 'stop' }] })],
    groq: [(init) => init.headers.Authorization === 'Bearer k' && JSON.parse(init.body).messages[0].role === 'system', Response.json({ choices: [{ message: { content: 'Q' }, finish_reason: 'stop' }] })],
  }
  for (const [name, [verify, response]] of Object.entries(checks)) {
    const ai = make([{ name, keys: ['k'], model: 'm' }], async (url, init) => {
      assert.ok(verify(init), name)
      return response.clone()
    })
    assert.equal((await ai.ask(context)).answer, { anthropic: 'A', gemini: 'G', openrouter: 'R', groq: 'Q', xai: 'X', deepseek: 'D' }[name])
  }
})

test('an answer cut short is reported as incomplete, not retried on another key', async () => {
  let calls = 0
  const ai = make([{ name: 'openai', keys: ['a', 'b'], model: 'm' }], async () => {
    calls++
    return Response.json({ status: 'incomplete', output: [] })
  })
  assert.deepEqual(await ai.ask(context), { error: 'incomplete' })
  assert.equal(calls, 1)
})

test('it gives up after a bounded number of attempts and never reveals a key', async () => {
  const keys = Array.from({ length: 10 }, (_, i) => `secret-${i}`)
  let calls = 0
  const messages = []
  const ai = createAssistant({
    providers: [{ name: 'openai', keys, model: 'm' }],
    fetcher: async () => {
      calls++
      return new Response('secret-0', { status: 500 })
    },
    log: (line) => messages.push(line),
  })
  const result = await ai.ask(context)
  assert.deepEqual(result, { error: 'unavailable' })
  assert.ok(calls <= 6)
  assert.equal(JSON.stringify(result).includes('secret'), false)
  assert.equal(messages.join('\n').includes('secret'), false)
})

test('when every key is out of quota, the answer says the free allowance is spent', async () => {
  const ai = make(
    [
      { name: 'gemini', keys: ['g1', 'g2'], model: 'm' },
      { name: 'groq', keys: ['q1'], model: 'm' },
    ],
    async () => new Response('{}', { status: 429 }),
  )
  assert.deepEqual(await ai.ask(context), { error: 'quota' })
  // Still resting: no new call is made, and the answer stays the same.
  let calls = 0
  const resting = make([{ name: 'gemini', keys: ['g'], model: 'm' }], async () => (calls++, new Response('{}', { status: 429 })))
  await resting.ask(context)
  assert.deepEqual(await resting.ask(context), { error: 'quota' })
  assert.equal(calls, 1, 'a key that is resting is not called again')
})

test('a mix of quota and other failures is reported as unavailable, not as a spent quota', async () => {
  const ai = make(
    [{ name: 'gemini', keys: ['a', 'b'], model: 'm' }],
    async (url, init) => new Response('{}', { status: init.headers['x-goog-api-key'] === 'a' ? 429 : 500 }),
  )
  assert.deepEqual(await ai.ask(context), { error: 'unavailable' })
})

test('the planned setup: Grok first, Gemini next, DeepSeek last, each with its own models and keys', () => {
  const providers = loadProviders({
    AI_PROVIDERS: 'xai,gemini,deepseek',
    XAI_API_KEYS: 'x1,x2',
    GEMINI_API_KEYS: 'g1',
    DEEPSEEK_API_KEY: 'd1',
    DEEPSEEK_MODEL: 'deepseek-flash',
  })
  assert.deepEqual(
    providers.map((p) => [p.name, p.keys.length, p.model]),
    [
      ['xai', 2, 'grok-4.7'],
      ['gemini', 1, 'gemini-3.5-flash-lite'],
      ['deepseek', 1, 'deepseek-flash'],
    ],
  )
})

test('cost and quota switches are sent: DeepSeek without thinking, Groq with low reasoning hidden, Gemini with room to think', async () => {
  const bodies = {}
  for (const name of ['deepseek', 'groq', 'gemini']) {
    const ai = make([{ name, keys: ['k'], model: 'm' }], async (url, init) => {
      bodies[name] = JSON.parse(init.body)
      return name === 'gemini'
        ? Response.json({ candidates: [{ content: { parts: [{ text: 'ok' }] }, finishReason: 'STOP' }] })
        : Response.json({ choices: [{ message: { content: 'ok' }, finish_reason: 'stop' }] })
    })
    await ai.ask(context)
  }
  assert.deepEqual(bodies.deepseek.thinking, { type: 'disabled' })
  assert.equal(bodies.groq.reasoning_effort, 'low')
  assert.equal(bodies.groq.include_reasoning, false)
  assert.ok(bodies.gemini.generationConfig.maxOutputTokens >= 4096)
})
