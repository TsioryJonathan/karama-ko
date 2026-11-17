import { createAssistant, loadProviders } from './ai.mjs'
import { REFUSAL, UNRELIABLE, checkAnswer, checkQuestion } from './guard.mjs'
import { createLimiter } from './limits.mjs'
import { PAGE_KINDS, createMetrics, createThrottle, hasAdminToken, isCountable } from './metrics.mjs'

const MAX_BODY = 12_000
const MAX_TRACK_BODY = 200
const reply = (status, data, headers = {}) =>
  Response.json(data, {
    status,
    headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers },
  })

/**
 * The API as plain Web Request → Response, so that the Node server and the Vercel functions run
 * the very same code. `ip` is the visitor's address as the caller trusts it.
 */
export function createApi({
  env = process.env,
  providers = loadProviders(env),
  fetcher = fetch,
  limiter,
  log,
  metrics = createMetrics({ env }),
  trackThrottle = createThrottle(120),
  adminThrottle = createThrottle(20),
  // Builds the figures the assistant works from. In production it is the built engine; the dev server passes its own.
  context: buildContext = async (value) => (await import('../dist-server/assistant.js')).assistantContext(value),
} = {}) {
  const assistant = createAssistant({ providers, fetcher, log })
  const number = (name) => (Number(env[name]) > 0 ? Number(env[name]) : undefined)
  limiter ??= createLimiter({
    rateLimit: number('AI_RATE_LIMIT_PER_MINUTE'),
    ipDailyLimit: number('AI_RATE_LIMIT_PER_IP_DAY'),
    dailyLimit: number('AI_DAILY_LIMIT'),
  })
  const allowedOrigins = (request) =>
    env.APP_ORIGIN ? env.APP_ORIGIN.split(',').map((o) => o.trim()) : [new URL(request.url).origin]

  return {
    configured: assistant.configured,
    async health() {
      return reply(200, { aiConfigured: assistant.configured })
    },
    /** A page reports that something happened: a kind and a name from the fixed vocabulary, nothing else. */
    async track(request, ip = 'unknown') {
      if (request.method !== 'POST') return reply(405, { error: 'Méthode non autorisée.' }, { Allow: 'POST' })
      const origin = request.headers.get('origin')
      if (origin && !allowedOrigins(request).includes(origin)) return reply(403, { error: 'Origine non autorisée.' })
      if (!metrics.enabled) return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } })
      if (!trackThrottle(ip)) return reply(429, { error: 'Trop de demandes.' }, { 'Retry-After': '60' })
      const raw = new Uint8Array(await request.arrayBuffer())
      if (raw.length > MAX_TRACK_BODY) return reply(413, { error: 'Demande trop volumineuse.' })
      let body
      try {
        body = JSON.parse(new TextDecoder().decode(raw))
      } catch {
        return reply(400, { error: 'JSON invalide.' })
      }
      if (!body || !PAGE_KINDS.includes(body.kind) || !isCountable(body.kind, body.name))
        return reply(400, { error: 'Événement inconnu.' })
      await metrics.record(body.kind, body.name)
      return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } })
    },
    /** The dashboard's figures, for whoever holds ADMIN_TOKEN. */
    async metrics(request, ip = 'unknown') {
      if (request.method !== 'GET') return reply(405, { error: 'Méthode non autorisée.' }, { Allow: 'GET' })
      if (!metrics.enabled || !env.ADMIN_TOKEN) return reply(503, { error: 'Le tableau de bord n’est pas configuré.' })
      if (!adminThrottle(ip)) return reply(429, { error: 'Trop de tentatives.' }, { 'Retry-After': '60' })
      if (!hasAdminToken(request, env.ADMIN_TOKEN)) return reply(401, { error: 'Mot de passe incorrect.' })
      try {
        return reply(200, await metrics.summary(Number(new URL(request.url).searchParams.get('days'))))
      } catch {
        return reply(502, { error: 'La base de mesures est indisponible.' })
      }
    },
    async assistant(request, ip = 'unknown') {
      if (request.method !== 'POST') return reply(405, { error: 'Méthode non autorisée.' }, { Allow: 'POST' })
      const origin = request.headers.get('origin')
      if (origin && !allowedOrigins(request).includes(origin)) return reply(403, { error: 'Origine non autorisée.' })
      if (!request.headers.get('content-type')?.startsWith('application/json'))
        return reply(415, { error: 'Une demande JSON est requise.' })
      if (Number(request.headers.get('content-length')) > MAX_BODY)
        return reply(413, { error: 'Demande trop volumineuse.' })
      const raw = new Uint8Array(await request.arrayBuffer())
      if (raw.length > MAX_BODY) return reply(413, { error: 'Demande trop volumineuse.' })
      let context
      try {
        context = await buildContext(JSON.parse(new TextDecoder().decode(raw)))
      } catch (e) {
        return reply(400, { error: e instanceof SyntaxError ? 'JSON invalide.' : e.message })
      }
      // Only the outcome is counted, with how long it took: never the question nor the answer.
      const started = Date.now()
      const count = async (name, response) => {
        await metrics.record('assistant', name, Date.now() - started)
        return response
      }
      await metrics.record('assistant', 'asked')
      // Off-topic and manipulation attempts are answered here, for free, without calling a model.
      if (!checkQuestion(context.question).ok) return count('refused', reply(200, { answer: REFUSAL, refused: true }))
      if (!assistant.configured) return count('failed', reply(503, { error: 'L’assistant n’est pas configuré sur cette installation.' }))
      const refused = await limiter.take(ip)
      if (refused)
        return count(
          'failed',
          reply(refused.status, { error: refused.error }, refused.retryAfter ? { 'Retry-After': String(refused.retryAfter) } : {}),
        )
      try {
        // The model's answer is checked before anyone reads it; a defective one gets one more try.
        let result = await assistant.ask(context, request.signal)
        let verdict = result.answer ? checkAnswer(result.answer, context) : null
        if (verdict && !verdict.ok && verdict.retry) {
          result = await assistant.ask({ ...context, correction: verdict.correction }, request.signal)
          verdict = result.answer ? checkAnswer(result.answer, context) : null
        }
        if (verdict?.ok) return count('answered', reply(200, { answer: verdict.answer }))
        if (verdict) return count('failed', reply(502, { error: UNRELIABLE }))
        if (result.error === 'quota')
          return count(
            'failed',
            reply(503, { error: 'Le quota gratuit de l’assistant est épuisé pour le moment. Réessayez plus tard : les outils de calcul restent disponibles.' }),
          )
        if (result.error === 'incomplete')
          return count('failed', reply(502, { error: 'L’explication n’a pas pu être terminée. Réessayez avec une question plus courte.' }))
        return count('failed', reply(502, { error: 'Le service d’explication est indisponible. Réessayez plus tard.' }))
      } finally {
        limiter.release()
      }
    },
  }
}
