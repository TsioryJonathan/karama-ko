import { describe, expect, it } from 'vitest'
import { NO_EXTRAS } from '../engine/pay'
import { parse, serialize } from './state'

describe('link state with the new options', () => {
  it('round-trips OSTIE rates, Sunday hours and the executive status', () => {
    const extras = { ...NO_EXTRAS, ostieEmployee: 0, ostieEmployer: 3, hours3: 8, rate3: 80, cadre: 1 }
    const link = serialize({ amount: 2_000_000, dependants: 1, mode: 'gross', view: 'employee', extras })
    expect(link).toContain('ostie_s=0')
    expect(parse(link)?.extras).toEqual(extras)
  })

  it('an old link without these parameters keeps the scale rates', () => {
    const state = parse('?brut=1000000&hs1=10')
    expect(state?.extras.ostieEmployee).toBe(NO_EXTRAS.ostieEmployee)
    expect(state?.extras.ostieEmployer).toBe(NO_EXTRAS.ostieEmployer)
    expect(state?.extras.cadre).toBe(0)
  })

  it('ignores values out of range', () => {
    expect(parse('?brut=1000000&cadre=2')?.extras.cadre).toBe(0)
    expect(parse('?brut=1000000&ostie_s=500')?.extras.ostieEmployee).toBe(NO_EXTRAS.ostieEmployee)
  })
})
