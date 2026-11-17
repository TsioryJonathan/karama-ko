import { describe, expect, it } from 'vitest'
import { NO_EXTRAS } from '../engine/pay'
import { parse, serialize } from './state'

describe('link state with the new options', () => {
  it('round-trips OSTIE rates, premiums, decimals and the executive status', () => {
    const extras = {
      ...NO_EXTRAS,
      ostieEmployee: 0,
      ostieEmployer: 3.5,
      nightHours: 8,
      nightRate: 50,
      sundayHours: 4,
      holidayHours: 2.5,
      rate1: 27.5,
      cadre: 1,
    }
    const link = serialize({ amount: 2_000_000, dependants: 1, mode: 'gross', view: 'employee', extras })
    expect(link).toContain('ostie_s=0')
    expect(link).toContain('ostie_e=3.5')
    expect(parse(link)?.extras).toEqual(extras)
  })

  it('an old link without these parameters keeps the scale rates', () => {
    const state = parse('?brut=1000000&hs1=10')
    expect(state?.extras.ostieEmployee).toBe(NO_EXTRAS.ostieEmployee)
    expect(state?.extras.ostieEmployer).toBe(NO_EXTRAS.ostieEmployer)
    expect(state?.extras.cadre).toBe(0)
    expect(state?.extras.nightRate).toBe(NO_EXTRAS.nightRate)
  })

  it('ignores values out of range or badly written', () => {
    expect(parse('?brut=1000000&cadre=2')?.extras.cadre).toBe(0)
    expect(parse('?brut=1000000&ostie_s=500')?.extras.ostieEmployee).toBe(NO_EXTRAS.ostieEmployee)
    expect(parse('?brut=1000000&maj1=27.555')?.extras.rate1).toBe(NO_EXTRAS.rate1)
    expect(parse('?brut=1000000&maj1=1e2')?.extras.rate1).toBe(NO_EXTRAS.rate1)
    expect(parse('?brut=1000000&maj1=-5')?.extras.rate1).toBe(NO_EXTRAS.rate1)
  })
})
