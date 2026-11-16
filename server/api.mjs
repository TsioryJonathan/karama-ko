import { createAssistant, loadProviders } from './ai.mjs'
import { REFUSAL, UNRELIABLE, checkAnswer, checkQuestion } from './guard.mjs'
import { createLimiter } from './limits.mjs'

const MAX_BODY = 12_000
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
      // Off-topic and manipulation attempts are answered here, for free, without calling a model.
      if (!checkQuestion(context.question).ok) return reply(200, { answer: REFUSAL, refused: true })
      if (!assistant.configured) return reply(503, { error: 'L’assistant n’est pas configuré sur cette installation.' })
      const refused = await limiter.take(ip)
      if (refused)
        return reply(refused.status, { error: refused.error }, refused.retryAfter ? { 'Retry-After': String(refused.retryAfter) } : {})
      try {
        // The model's answer is checked before anyone reads it; a defective one gets one more try.
        let result = await assistant.ask(context, request.signal)
        let verdict = result.answer ? checkAnswer(result.answer, context) : null
        if (verdict && !verdict.ok && verdict.retry) {
          result = await assistant.ask({ ...context, correction: verdict.correction }, request.signal)
          verdict = result.answer ? checkAnswer(result.answer, context) : null
        }
        if (verdict?.ok) return reply(200, { answer: verdict.answer })
        if (verdict) return reply(502, { error: UNRELIABLE })
        if (result.error === 'quota')
          return reply(503, { error: 'Le quota gratuit de l’assistant est épuisé pour le moment. Réessayez plus tard : les outils de calcul restent disponibles.' })
        if (result.error === 'incomplete')
          return reply(502, { error: 'L’explication n’a pas pu être terminée. Réessayez avec une question plus courte.' })
        return reply(502, { error: 'Le service d’explication est indisponible. Réessayez plus tard.' })
      } finally {
        limiter.release()
      }
    },
  }
}
