import type { Scale } from '../engine/compute'
import scale2026 from './2026.json'

/**
 * Every scale Karama-Ko knows, by effective date. To prepare a change, add the new file here:
 * it takes over by itself on its effective date, and the previous one stays available for history.
 */
export const SCALES: Scale[] = [scale2026 as Scale].sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom))

/** The scale in force on a given day (the oldest one for earlier dates). */
export function scaleInForce(date: Date = new Date()): Scale {
  const day = date.toISOString().slice(0, 10)
  return [...SCALES].reverse().find((s) => s.effectiveFrom <= day) ?? SCALES[0]
}

/** After this many days without a check against the sources, the scale may be out of date. */
export const STALE_AFTER_DAYS = 183
/** A scale that starts within this many days is announced in advance. */
export const UPCOMING_WITHIN_DAYS = 90

const DAY = 86_400_000
export type ScaleStatus = {
  current: Scale
  /** The next scale, when one is already on file. */
  next?: Scale
  daysUntilNext?: number
  /** Days since the current scale was last checked against its sources. */
  checkedDaysAgo: number
  stale: boolean
}

export function scaleStatus(today: Date = new Date()): ScaleStatus {
  const current = scaleInForce(today)
  const day = today.toISOString().slice(0, 10)
  const next = SCALES.find((s) => s.effectiveFrom > day)
  const checkedDaysAgo = Math.floor((today.getTime() - new Date(current.updatedAt).getTime()) / DAY)
  return {
    current,
    next,
    daysUntilNext: next ? Math.ceil((new Date(next.effectiveFrom).getTime() - today.getTime()) / DAY) : undefined,
    checkedDaysAgo,
    stale: checkedDaysAgo > STALE_AFTER_DAYS,
  }
}

/** What changed, newest first. Only checked facts belong here. */
export const SCALE_HISTORY: { date: string; title: string; detail: string }[] = [
  {
    date: '2026-11-16',
    title: 'Barème d’octobre 2026 vérifié',
    detail:
      'IRSA à six tranches (0 % jusqu’à 350 000 Ar, 25 % au-delà de 4 000 000 Ar), minimum de perception de 3 000 Ar, SME de 315 000 Ar, plafond des cotisations à 2 520 000 Ar, CNaPS 1 % + 13 %, OSTIE 1 % + 5 %, FMFP 1 % patronal.',
  },
]
