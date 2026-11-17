import { createHash, timingSafeEqual } from 'node:crypto'

/**
 * What can be counted. The vocabulary is fixed, so nothing a visitor types (a question, an amount, a name)
 * can ever reach the store: an unknown kind or name is dropped.
 */
export const VOCABULARY = {
  visit: ['site'],
  tool: ['calculateur', 'comparer', 'negocier', 'explorer', 'fiche', 'embaucher', 'equipe', 'annee', 'fin', 'sauvegardes', 'integrer'],
  option: ['overtime', 'premiums', 'ostie', 'cadre', 'share'],
  assistant: ['asked', 'answered', 'refused', 'failed'],
}
/** The page may report these; the assistant outcomes are counted by the server alone, so they cannot be forged. */
export const PAGE_KINDS = ['visit', 'tool', 'option']
export const isCountable = (kind, name) => Object.hasOwn(VOCABULARY, kind) && VOCABULARY[kind].includes(name)

const DAY = 86_400_000
export const isoDay = (date) => date.toISOString().slice(0, 10)

/** In memory: tests, and a server started without a database. */
export function createMemoryStore() {
  const rows = new Map()
  return {
    async add(day, kind, name, ms = 0) {
      const key = `${day}|${kind}|${name}`
      const row = rows.get(key) ?? { day, kind, name, count: 0, ms: 0 }
      row.count += 1
      row.ms += ms
      rows.set(key, row)
    },
    async since(day) {
      return [...rows.values()].filter((row) => row.day >= day)
    },
  }
}

/** One row per day, kind and name: a counter, nothing about who or what was typed. */
export async function createNeonStore(url) {
  const { neon } = await import('@neondatabase/serverless')
  const sql = neon(url)
  return {
    async add(day, kind, name, ms = 0) {
      await sql`
        INSERT INTO metrics (day, kind, name, count, ms) VALUES (${day}, ${kind}, ${name}, 1, ${ms})
        ON CONFLICT (day, kind, name) DO UPDATE SET count = metrics.count + 1, ms = metrics.ms + EXCLUDED.ms`
    },
    async since(day) {
      return sql`
        SELECT day::text AS day, kind, name, count::float8 AS count, ms::float8 AS ms
        FROM metrics WHERE day >= ${day} ORDER BY day`
    },
  }
}

/** Plain Postgres: the Docker setup, or any server that is not Neon. */
export async function createPgStore(url) {
  const { default: pg } = await import('pg')
  const pool = new pg.Pool({ connectionString: url, max: 3 })
  return {
    async add(day, kind, name, ms = 0) {
      await pool.query(
        `INSERT INTO metrics (day, kind, name, count, ms) VALUES ($1, $2, $3, 1, $4)
         ON CONFLICT (day, kind, name) DO UPDATE SET count = metrics.count + 1, ms = metrics.ms + EXCLUDED.ms`,
        [day, kind, name, ms],
      )
    },
    async since(day) {
      const { rows } = await pool.query(
        `SELECT day::text AS day, kind, name, count::float8 AS count, ms::float8 AS ms
         FROM metrics WHERE day >= $1 ORDER BY day`,
        [day],
      )
      return rows
    },
  }
}

/** Neon is reached over HTTP, which suits short-lived functions; any other Postgres over a normal connection. */
export const usesNeonHttp = (url) => {
  try {
    return new URL(url).hostname.endsWith('.neon.tech')
  } catch {
    return false
  }
}
export const createStore = (url) => (usesNeonHttp(url) ? createNeonStore(url) : createPgStore(url))

/** Rows → what the dashboard shows. Days without any visit are kept, at zero, so the chart has no gap. */
export function summarize(rows, days, today = new Date()) {
  const list = Array.from({ length: days }, (_, i) => isoDay(new Date(today.getTime() - (days - 1 - i) * DAY)))
  const daily = new Map(list.map((day) => [day, { day, visits: 0, asked: 0 }]))
  const tools = {}
  const options = {}
  const assistant = { asked: 0, answered: 0, refused: 0, failed: 0, avgMs: 0 }
  let visits = 0
  let answeredMs = 0
  for (const { day, kind, name, count, ms } of rows) {
    if (!isCountable(kind, name)) continue
    const d = daily.get(day)
    if (kind === 'visit') {
      visits += count
      if (d) d.visits += count
    } else if (kind === 'tool') tools[name] = (tools[name] ?? 0) + count
    else if (kind === 'option') options[name] = (options[name] ?? 0) + count
    else {
      assistant[name] += count
      if (name === 'asked' && d) d.asked += count
      if (name === 'answered') answeredMs += ms
    }
  }
  assistant.avgMs = assistant.answered ? Math.round(answeredMs / assistant.answered) : 0
  const ranked = (counts, names) =>
    names.map((name) => ({ name, count: counts[name] ?? 0 })).sort((a, b) => b.count - a.count)
  return {
    days,
    visits,
    daily: list.map((day) => daily.get(day)),
    tools: ranked(tools, VOCABULARY.tool),
    options: ranked(options, VOCABULARY.option),
    assistant,
  }
}

/**
 * Counters behind one small interface. Without `store`, DATABASE_URL nor METRICS_MEMORY it is switched off:
 * recording does nothing and the dashboard says it is not configured.
 */
export function createMetrics({ env = process.env, store, now = () => new Date() } = {}) {
  // METRICS_MEMORY=1 keeps the counters in memory, to try the dashboard without a database: they vanish on restart.
  const memory = env.METRICS_MEMORY === '1' ? (store ?? createMemoryStore()) : store
  const enabled = Boolean(memory || env.DATABASE_URL)
  let pending
  const open = () => (pending ??= Promise.resolve(memory ?? createStore(env.DATABASE_URL)))
  return {
    enabled,
    /** Never throws: a counter that fails must not break the page or the assistant. */
    async record(kind, name, ms = 0) {
      if (!enabled || !isCountable(kind, name)) return false
      try {
        await (await open()).add(isoDay(now()), kind, name, Math.max(0, Math.round(ms) || 0))
        return true
      } catch {
        pending = undefined
        return false
      }
    },
    async summary(days = 30) {
      const span = Math.min(90, Math.max(1, Math.floor(days) || 30))
      const from = isoDay(new Date(now().getTime() - (span - 1) * DAY))
      return summarize(await (await open()).since(from), span, now())
    },
  }
}

const digest = (text) => createHash('sha256').update(text).digest()
/** `Authorization: Bearer <token>` against ADMIN_TOKEN, compared in constant time. */
export function hasAdminToken(request, token) {
  const given = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? ''
  return matchesAdminToken(given, token)
}

export function matchesAdminToken(given, token) {
  if (!token || typeof given !== 'string') return false
  return timingSafeEqual(digest(given), digest(token))
}

/** At most `limit` calls per `windowMs` for one key. Per instance: a brake, not a guarantee. */
export function createThrottle(limit, windowMs = 60_000, now = Date.now) {
  const seen = new Map()
  return (key) => {
    const t = now()
    if (seen.size > 5_000) for (const [k, v] of seen) if (v.reset <= t) seen.delete(k)
    const entry = seen.get(key)
    if (!entry || entry.reset <= t) {
      seen.set(key, { count: 1, reset: t + windowMs })
      return true
    }
    entry.count += 1
    return entry.count <= limit
  }
}
