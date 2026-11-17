import { describe, expect, it } from 'vitest'
import { compute } from './compute'
import { annualProjection, teamBudget } from './planning'
import { NO_EXTRAS, baseFromBudget, hasExtras, payslip, validExtras, type Extras } from './pay'

describe('payslip with extras', () => {
  it('without extras it is the plain calculation', () => {
    const p = payslip(1_000_000, 0)
    expect(p.result).toEqual(compute(1_000_000, 0))
    expect(p.gross).toBe(1_000_000)
  })

  it('a bonus is plain salary: contributions and IRSA apply', () => {
    const p = payslip(1_000_000, 0, { ...NO_EXTRAS, bonus: 200_000 })
    expect(p.result).toEqual(compute(1_200_000, 0))
  })

  it('overtime is paid at the hourly rate plus the premium', () => {
    const p = payslip(1_733_300, 0, { ...NO_EXTRAS, hours1: 10 })
    // 1 733 300 / 173,33 = 10 000 Ar an hour; 10 h at +30 % = 130 000 Ar.
    expect(p.overtime.pay1).toBe(130_000)
    expect(p.gross).toBe(1_863_300)
  })

  it('overtime pay up to 20 hours is out of the IRSA base but not out of the contributions', () => {
    const p = payslip(1_733_300, 0, { ...NO_EXTRAS, hours1: 10, hours2: 15 })
    // 10 h at +30 % = 130 000, then only 10 of the 15 hours at +50 % count: 150 000.
    expect(p.overtime.exempt).toBe(280_000)
    const r = p.result
    expect(r.taxExempt).toBe(280_000)
    expect(r.socialDeductions).toBe(Math.round(p.gross * 0.01) * 2)
    expect(r.taxableBase).toBeLessThan(compute(p.gross, 0).taxableBase)
  })

  it('benefits in kind raise the IRSA base only', () => {
    const p = payslip(1_000_000, 0, { ...NO_EXTRAS, housing: 1_000_000, vehicle: 400_000, phone: 100_000, other: 50_000 })
    // Housing: 50 % of the rent = 500 000, capped at 25 % of 1 000 000 = 250 000.
    expect(p.benefits).toEqual({ housing: 250_000, vehicle: 60_000, phone: 15_000, other: 50_000, total: 375_000 })
    expect(p.result.socialDeductions).toBe(compute(1_000_000, 0).socialDeductions)
    expect(p.result.irsa).toBeGreaterThan(compute(1_000_000, 0).irsa)
    expect(p.result.net).toBe(1_000_000 - p.result.socialDeductions - p.result.irsa)
  })
})

describe('extras across the tools', () => {
  const extras = { ...NO_EXTRAS, bonus: 100_000 }

  it('a team costs what its payslips cost, bonuses included', () => {
    const team = teamBudget([
      { id: 'a', name: 'A', gross: 1_000_000, dependants: 0, count: 2, extras },
      { id: 'b', name: 'B', gross: 800_000, dependants: 0, count: 1 },
    ])
    expect(team.cost).toBe(payslip(1_000_000, 0, extras).result.employerCost * 2 + payslip(800_000, 0).result.employerCost)
  })

  it('a year adds up its months, each with its own extras', () => {
    const months = [{ gross: 1_000_000, dependants: 0 }, { gross: 1_000_000, dependants: 0, extras }]
    const year = annualProjection(months)
    expect(year.gross).toBe(1_000_000 + 1_100_000)
  })

  it('a hiring budget leaves room for the extras: the base shrinks, the cost stays inside the budget', () => {
    const plain = baseFromBudget(2_000_000)
    const withExtras = baseFromBudget(2_000_000, { ...NO_EXTRAS, bonus: 200_000, hours1: 10 })
    expect(withExtras).toBeLessThan(plain)
    const cost = payslip(withExtras, 0, { ...NO_EXTRAS, bonus: 200_000, hours1: 10 }).result.employerCost
    expect(cost).toBeLessThanOrEqual(2_000_000)
    expect(payslip(withExtras + 1, 0, { ...NO_EXTRAS, bonus: 200_000, hours1: 10 }).result.employerCost).toBeGreaterThan(2_000_000)
  })

  it('without extras the budget search matches the plain one', () => {
    expect(baseFromBudget(1_190_000)).toBe(1_000_000)
  })

  it('accepts missing extras, refuses malformed ones', () => {
    expect(validExtras(undefined)).toBe(true)
    expect(validExtras(NO_EXTRAS)).toBe(true)
    expect(validExtras({ ...NO_EXTRAS, bonus: -1 })).toBe(false)
    expect(validExtras({ ...NO_EXTRAS, hours1: 9999 })).toBe(false)
    expect(validExtras({ bonus: 1 })).toBe(false)
    expect(validExtras('x')).toBe(false)
  })
})

describe('OSTIE, Sunday and holiday overtime, executives', () => {
  const ostie = (p: ReturnType<typeof payslip>) => p.result.contributions.find((c) => c.id === 'ostie')!

  it('keeps the scale rates when nothing is changed', () => {
    expect(payslip(1_000_000, 0, NO_EXTRAS).result).toEqual(compute(1_000_000, 0))
  })

  it('OSTIE can be left out: no contribution for the employee nor the employer, and the IRSA base grows', () => {
    const p = payslip(1_000_000, 0, { ...NO_EXTRAS, ostieEmployee: 0, ostieEmployer: 0 })
    expect(ostie(p)).toMatchObject({ employee: 0, employer: 0, employeeRate: 0, employerRate: 0 })
    expect(p.result.net).toBe(884_500)
    expect(p.result.employerCost).toBe(compute(1_000_000).employerCost - 50_000)
  })

  it('OSTIE rates can be edited', () => {
    const p = payslip(1_000_000, 0, { ...NO_EXTRAS, ostieEmployee: 2, ostieEmployer: 4 })
    expect(ostie(p)).toMatchObject({ employee: 20_000, employer: 40_000, employeeRate: 2, employerRate: 4 })
  })

  it('Sunday and holiday hours have their own premium', () => {
    const p = payslip(1_733_300, 0, { ...NO_EXTRAS, hours3: 10 })
    // 10 000 Ar an hour; 10 h at +100 % = 200 000 Ar.
    expect(p.overtime.pay3).toBe(200_000)
    expect(p.gross).toBe(1_933_300)
    expect(p.overtime.exempt).toBe(200_000)
    const edited = payslip(1_733_300, 0, { ...NO_EXTRAS, hours3: 10, rate3: 60 })
    expect(edited.overtime.pay3).toBe(160_000)
  })

  it('the 20 exempt hours are counted in order across the three kinds', () => {
    const p = payslip(1_733_300, 0, { ...NO_EXTRAS, hours1: 10, hours2: 5, hours3: 10 })
    // 10 h at +30 % = 130 000; 5 h at +50 % = 75 000; then only 5 of the 10 Sunday hours at +100 % = 100 000.
    expect(p.overtime.exempt).toBe(305_000)
  })

  it('an executive gets no overtime, whatever is typed', () => {
    const p = payslip(1_733_300, 0, { ...NO_EXTRAS, cadre: 1, hours1: 10, hours2: 5, hours3: 5 })
    expect(p.overtime.pay).toBe(0)
    expect(p.overtime.exempt).toBe(0)
    expect(p.gross).toBe(1_733_300)
    expect(p.result).toEqual(payslip(1_733_300, 0).result)
  })

  it('shared links and saved plans from before these options stay valid and unchanged', () => {
    const { hours3, rate3, ostieEmployee, ostieEmployer, cadre, ...before } = NO_EXTRAS
    void hours3, rate3, ostieEmployee, ostieEmployer, cadre
    expect(validExtras(before)).toBe(true)
    expect(payslip(1_000_000, 0, before as Extras).result).toEqual(compute(1_000_000, 0))
    expect(hasExtras(before as Extras)).toBe(false)
  })

  it('refuses malformed new options', () => {
    expect(validExtras({ ...NO_EXTRAS, cadre: 2 })).toBe(false)
    expect(validExtras({ ...NO_EXTRAS, ostieEmployee: 150 })).toBe(false)
    expect(validExtras({ ...NO_EXTRAS, hours3: 9999 })).toBe(false)
    expect(validExtras({ ...NO_EXTRAS, ostieEmployer: -1 })).toBe(false)
  })

  it('the options count as extras so they travel with the simulation', () => {
    expect(hasExtras(NO_EXTRAS)).toBe(false)
    expect(hasExtras({ ...NO_EXTRAS, ostieEmployee: 0 })).toBe(true)
    expect(hasExtras({ ...NO_EXTRAS, hours3: 1 })).toBe(true)
    expect(hasExtras({ ...NO_EXTRAS, cadre: 1 })).toBe(true)
  })
})
