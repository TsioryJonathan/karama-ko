import { SCALE_2026, compute, type Scale } from './compute'

/**
 * Target net → smallest gross that yields at least that net.
 *
 * Net is only guaranteed to grow per 100 Ar step of gross (contributions round
 * to the Ariary and the taxable base to the hundred), so the bisection runs on
 * hundreds and is then refined to the Ariary.
 */
export function inverse(targetNet: number, dependants = 0, scale: Scale = SCALE_2026): number {
  targetNet = Math.max(0, Math.round(targetNet))
  if (targetNet === 0) return 0
  const netOf = (gross: number) => compute(gross, dependants, scale).net

  let low = Math.floor(targetNet / 100)
  let high = Math.ceil((targetNet * 2 + 10_000) / 100)
  while (low < high) {
    const mid = Math.floor((low + high) / 2)
    if (netOf(mid * 100) >= targetNet) high = mid
    else low = mid + 1
  }

  const start = Math.max(0, (low - 1) * 100)
  for (let gross = start; gross <= low * 100; gross++) {
    if (netOf(gross) >= targetNet) return gross
  }
  return low * 100
}
