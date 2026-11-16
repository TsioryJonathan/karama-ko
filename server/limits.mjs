// Limits on the assistant: per visitor and minute, per visitor and day, and for the whole site per day.
// They keep a free quota from being burnt by one visitor. In memory, so they hold per instance:
// on a serverless host that is a best-effort brake, which is enough for a free, low-traffic site.

const DEFAULTS = { rateLimit: 5, ipDailyLimit: 20, dailyLimit: 100, maxActive: 3 }
const MINUTE = 60_000
const DAY = 86_400_000

const refusals = {
  rate: (retryAfter) => ({ status: 429, error: 'Trop de demandes. Réessayez dans une minute.', retryAfter }),
  ipDay: () => ({ status: 429, error: 'Vous avez atteint la limite de questions pour aujourd’hui. Revenez demain.' }),
  site: () => ({ status: 429, error: 'La capacité de l’assistant est atteinte pour aujourd’hui. Réessayez plus tard.' }),
  busy: () => ({ status: 429, error: 'L’assistant est très sollicité. Réessayez dans un instant.' }),
  full: () => ({ status: 503, error: 'L’assistant est occupé. Réessayez plus tard.' }),
}

/** Counters in this process only. */
export function createMemoryLimiter({ now = Date.now, ...options } = {}) {
  const { rateLimit, ipDailyLimit, dailyLimit, maxActive } = { ...DEFAULTS, ...options }
  const minutes = new Map()
  const days = new Map()
  let siteCount = 0
  let siteDay = Math.floor(now() / DAY)
  let active = 0
  return {
    kind: 'memory',
    /** @returns {Promise<null | {status: number, error: string, retryAfter?: number}>} null: go ahead, then call release(). */
    async take(ip) {
      const time = now()
      for (const [key, bucket] of minutes) if (bucket.until <= time) minutes.delete(key)
      const today = Math.floor(time / DAY)
      if (today !== siteDay) {
        siteDay = today
        siteCount = 0
        days.clear()
      }
      if ((minutes.size >= 10_000 && !minutes.has(ip)) || (days.size >= 20_000 && !days.has(ip))) return refusals.full()
      const minute = minutes.get(ip) || { count: 0, until: time + MINUTE }
      if (minute.count >= rateLimit) return refusals.rate(Math.ceil((minute.until - time) / 1000))
      if ((days.get(ip) ?? 0) >= ipDailyLimit) return refusals.ipDay()
      if (siteCount >= dailyLimit) return refusals.site()
      if (active >= maxActive) return refusals.busy()
      minute.count++
      minutes.set(ip, minute)
      days.set(ip, (days.get(ip) ?? 0) + 1)
      siteCount++
      active++
      return null
    },
    release() {
      active--
    },
  }
}

/** One limiter per process. On a serverless host each instance counts for itself: a best-effort brake. */
export function createLimiter(options = {}) {
  return createMemoryLimiter(options)
}
