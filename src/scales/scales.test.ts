import { describe, expect, it } from 'vitest'
import type { Scale } from '../engine/compute'
import { SCALES, STALE_AFTER_DAYS, scaleInForce, scaleStatus } from '.'

describe('dated scales', () => {
  it('is sorted by effective date and has one scale per date', () => {
    const dates = SCALES.map((s) => s.effectiveFrom)
    expect(dates).toEqual([...dates].sort())
    expect(new Set(dates).size).toBe(dates.length)
  })

  it('picks the scale in force on a given day, and the oldest one before any', () => {
    expect(scaleInForce(new Date('2026-11-16')).effectiveFrom).toBe('2026-10-01')
    expect(scaleInForce(new Date('2020-01-01')).effectiveFrom).toBe(SCALES[0].effectiveFrom)
  })

  it('is silent while the scale is fresh and flags it after about six months', () => {
    const checked = new Date(scaleInForce().updatedAt)
    const fresh = new Date(checked.getTime() + 30 * 86_400_000)
    const old = new Date(checked.getTime() + (STALE_AFTER_DAYS + 2) * 86_400_000)
    expect(scaleStatus(fresh).stale).toBe(false)
    expect(scaleStatus(old).stale).toBe(true)
  })

  it('announces a scale that is on file but not yet in force', () => {
    const future = { ...SCALES[0], effectiveFrom: '2099-01-01', updatedAt: '2098-12-01' } as Scale
    SCALES.push(future)
    try {
      const status = scaleStatus(new Date('2098-12-15'))
      expect(status.next?.effectiveFrom).toBe('2099-01-01')
      expect(status.daysUntilNext).toBe(17)
      expect(scaleInForce(new Date('2098-12-15')).effectiveFrom).toBe('2026-10-01')
      expect(scaleInForce(new Date('2099-01-02')).effectiveFrom).toBe('2099-01-01')
    } finally {
      SCALES.pop()
    }
  })

  it('has complete sources, each with a link', () => {
    for (const scale of SCALES) for (const source of scale.sources) expect(source.url).toMatch(/^https:\/\//)
  })
})
