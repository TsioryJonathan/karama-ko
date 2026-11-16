import { describe, expect, it } from 'vitest'
import { SCALE_2026, compute, contributionCeiling } from './compute'
import { inverse } from './inverse'

const line = (r: ReturnType<typeof compute>, id: string) => r.contributions.find((c) => c.id === id)!

describe('2026 scale', () => {
  it('caps contributions at 8 × SME, i.e. 2 520 000 Ar', () => {
    expect(contributionCeiling(SCALE_2026)).toBe(2_520_000)
  })
})

describe('PRD reference cases', () => {
  it('gross 1 000 000 Ar, no dependant → net 876 500 Ar', () => {
    const r = compute(1_000_000, 0)
    expect(line(r, 'cnaps').employee).toBe(10_000)
    expect(line(r, 'ostie').employee).toBe(10_000)
    expect(r.taxableBase).toBe(980_000)
    expect(r.irsa).toBe(103_500)
    expect(r.net).toBe(876_500)
    expect((r.effectiveRate * 100).toFixed(2)).toBe('12.35')
  })

  it('gross 1 000 000 Ar, 2 dependants → net 880 500 Ar', () => {
    const r = compute(1_000_000, 2)
    expect(r.irsa).toBe(99_500)
    expect(r.net).toBe(880_500)
  })

  it('gross 5 000 000 Ar → capped contributions and 25 % bracket', () => {
    const r = compute(5_000_000, 0)
    expect(line(r, 'cnaps').employee).toBe(25_200)
    expect(line(r, 'ostie').employee).toBe(25_200)
    expect(line(r, 'cnaps').capped).toBe(true)
    expect(r.taxableBase).toBe(4_949_600)
    expect(r.brackets.at(-1)).toMatchObject({ rate: 25, amount: 949_600, tax: 237_400 })
    expect(r.irsa).toBe(944_900)
    expect(r.net).toBe(4_004_700)
  })
})

describe('minimum tax (art. 01.03.16)', () => {
  it('applies inside the 0 % bracket', () => {
    const r = compute(315_000, 0)
    expect(r.grossTax).toBe(0)
    expect(r.irsa).toBe(3_000)
    expect(r.minimumApplied).toBe(true)
  })

  it('applies just above a 350 000 Ar base', () => {
    const r = compute(360_000, 0)
    expect(r.taxableBase).toBe(352_800)
    expect(r.grossTax).toBe(140)
    expect(r.irsa).toBe(3_000)
  })

  it('is not eroded by the dependant relief', () => {
    const r = compute(450_000, 3)
    expect(r.grossTax).toBe(6_600)
    expect(r.relief).toBe(6_000)
    expect(r.irsa).toBe(3_000)
  })

  it('a zero gross owes nothing', () => {
    expect(compute(0).irsa).toBe(0)
    expect(compute(0).net).toBe(0)
  })
})

describe('dependant relief (art. 01.03.19)', () => {
  it('does not apply to a base of 350 000 Ar or less', () => {
    expect(compute(340_000, 4).relief).toBe(0)
  })

  it('is worth 2 000 Ar per person', () => {
    expect(compute(2_000_000, 0).irsa - compute(2_000_000, 5).irsa).toBe(10_000)
  })
})

describe('employer view', () => {
  it('gross 1 000 000 Ar → 13 % + 5 % + 1 % employer charges', () => {
    const r = compute(1_000_000)
    expect(line(r, 'cnaps').employer).toBe(130_000)
    expect(line(r, 'ostie').employer).toBe(50_000)
    expect(line(r, 'fmfp').employer).toBe(10_000)
    expect(r.employerCost).toBe(1_190_000)
  })

  it('caps the employer shares', () => {
    expect(compute(5_000_000).employerCharges).toBe(2_520_000 * 0.19)
  })
})

describe('properties', () => {
  it('net never drops when gross rises by 100 Ar', () => {
    for (const dependants of [0, 3]) {
      let previous = compute(SCALE_2026.minimumWage, dependants).net
      for (let gross = SCALE_2026.minimumWage + 100; gross <= 6_000_000; gross += 100) {
        const net = compute(gross, dependants).net
        expect(net, `gross ${gross}`).toBeGreaterThanOrEqual(previous)
        previous = net
      }
    }
  })

  it('inverse(net(gross)) yields the same net, within 100 Ar of gross', () => {
    for (const dependants of [0, 2]) {
      for (let gross = SCALE_2026.minimumWage; gross <= 8_000_000; gross += 12_347) {
        const net = compute(gross, dependants).net
        const found = inverse(net, dependants)
        expect(compute(found, dependants).net, `gross ${gross}`).toBe(net)
        expect(Math.abs(found - gross), `gross ${gross}`).toBeLessThanOrEqual(100)
      }
    }
  })

  it('inverse hits a round target: 1 500 000 Ar net', () => {
    const gross = inverse(1_500_000, 0)
    expect(compute(gross).net).toBeGreaterThanOrEqual(1_500_000)
    expect(compute(gross - 100).net).toBeLessThan(1_500_000)
  })
})
