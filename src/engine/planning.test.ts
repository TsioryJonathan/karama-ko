import { describe, expect, it } from 'vitest'
import { compute, SCALE } from './compute'
import { NO_EXTRAS, payslip } from './pay'
import { annualProjection, grossFromBudget, negotiate, teamBudget } from './planning'
import { assistantContext } from './assistant'

describe('planning tools', () => {
  it('fits the highest gross in an employer budget across ceiling boundaries', () => {
    for (const budget of [0, 100, 374850, 1_190_000, 2_998_800, 5_000_000, 1_000_000_000]) {
      const gross = grossFromBudget(budget)
      expect(compute(gross).employerCost).toBeLessThanOrEqual(budget)
      expect(compute(gross + 1).employerCost).toBeGreaterThan(budget)
    }
    expect(grossFromBudget(1_190_000)).toBe(1_000_000)
  })
  it('finds a negotiation gross that reaches the requested extra net', () => {
    for (const dependants of [0, 2, 6]) {
      const next = negotiate(1_000_000, 150_000, dependants)
      expect(next.net).toBeGreaterThanOrEqual(compute(1_000_000, dependants).net + 150_000)
      expect(compute(next.gross - 100, dependants).net).toBeLessThan(
        compute(1_000_000, dependants).net + 150_000,
      )
    }
  })
  it('caps an unattainable negotiation goal at the documented gross limit', () => {
    expect(negotiate(1_000_000_000, 1_000_000_000, 0).gross).toBe(1_000_000_000)
  })
  it('sums monthly simulations rather than applying monthly tax to an annual salary', () => {
    const months = Array.from({ length: 12 }, (_, i) => ({
      gross: i < 6 ? 1_000_000 : 2_000_000,
      dependants: 2,
    }))
    const total = annualProjection(months)
    expect(total.net).toBe(compute(1_000_000, 2).net * 6 + compute(2_000_000, 2).net * 6)
    expect(total.results).toHaveLength(12)
  })
  it('multiplies each role by its headcount with individual contribution ceilings', () => {
    const team = teamBudget([
      { id: 'a', name: 'A', count: 2, gross: 5_000_000, dependants: 0 },
      { id: 'b', name: 'B', count: 3, gross: 1_000_000, dependants: 2 },
    ])
    expect(team.headcount).toBe(5)
    expect(team.cost).toBe(compute(5_000_000).employerCost * 2 + compute(1_000_000).employerCost * 3)
    expect(team.net).toBe(compute(5_000_000).net * 2 + compute(1_000_000, 2).net * 3)
  })
})

describe('assistant context boundary', () => {
  it('recomputes results and ignores client-supplied deductions', () => {
    const context = assistantContext({
      question: 'Pourquoi ?',
      scenarios: [{ name: 'Offre', gross: 1_000_000, dependants: 0, net: 9_000_000 }],
    })
    expect(context.scenarios[0].net).toBe(876_500)
    expect(context.effectiveFrom).toBe('2026-10-01')
    const compared = assistantContext({
      question: 'Compare.',
      scenarios: [
        { name: 'A', gross: 1_000_000, dependants: 0 },
        { name: 'B', gross: 1_200_000, dependants: 0 },
      ],
    })
    expect(compared.comparisons[1].monthlyNetDifference).toBe(156800)
    expect(compared.comparisons[1].twelveIdenticalMonthsNetDifference).toBe(1881600)
  })
  it('keeps the overtime exemption and benefits so the assistant matches the calculator', () => {
    const pay = payslip(1_500_000, 0, { ...NO_EXTRAS, hours1: 20, rate1: 30 })
    const context = assistantContext({
      question: 'Comment est calculé l’IRSA ?',
      scenarios: [{ name: 'Moi', gross: pay.gross, dependants: 0, taxExempt: pay.overtime.exempt, benefitsTaxable: 0 }],
    })
    expect(context.scenarios[0].irsa).toBe(pay.result.irsa)
    expect(context.scenarios[0].net).toBe(pay.result.net)
    expect(context.scenarios[0].taxExempt).toBe(pay.overtime.exempt)
    const withBenefits = assistantContext({
      question: 'Pourquoi ?',
      scenarios: [{ name: 'Moi', gross: 1_000_000, dependants: 0, benefitsTaxable: 100_000 }],
    })
    expect(withBenefits.scenarios[0].irsa).toBe(compute(1_000_000, 0, SCALE, { benefitsTaxable: 100_000 }).irsa)
  })
  it('recomputes with the OSTIE rates of the simulation', () => {
    const context = assistantContext({
      question: 'Pourquoi ?',
      scenarios: [{ name: 'Moi', gross: 1_000_000, dependants: 0, ostieEmployee: 0, ostieEmployer: 0 }],
    })
    const ostie = context.scenarios[0].contributions.find((c) => c.id === 'ostie')!
    expect(ostie.employee).toBe(0)
    expect(context.scenarios[0].net).toBe(884_500)
    const half = assistantContext({
      question: 'Pourquoi ?',
      scenarios: [{ name: 'Moi', gross: 1_000_000, dependants: 0, ostieEmployee: 0.5, ostieEmployer: 3.5 }],
    })
    expect(half.scenarios[0].contributions.find((c) => c.id === 'ostie')!.employee).toBe(5_000)
  })
  it.each([{ ostieEmployee: -1 }, { ostieEmployee: 101 }, { ostieEmployer: 'x' }, { ostieEmployer: 0.123 }])('rejects invalid OSTIE rates %#', (extra) => {
    expect(() =>
      assistantContext({ question: 'a', scenarios: [{ name: 'X', gross: 1_000_000, dependants: 0, ...extra }] }),
    ).toThrow()
  })
  it.each([
    { taxExempt: -1 },
    { taxExempt: 1_500_000 },
    { taxExempt: 1.5 },
    { benefitsTaxable: -5 },
    { benefitsTaxable: 'x' },
  ])('rejects invalid exemption or benefits %#', (extra) => {
    expect(() =>
      assistantContext({ question: 'a', scenarios: [{ name: 'X', gross: 1_000_000, dependants: 0, ...extra }] }),
    ).toThrow()
  })
  it.each([
    null,
    {},
    { question: 'a', scenarios: [] },
    { question: 'a', scenarios: [{ name: 'X', gross: -1, dependants: 0 }] },
    { question: 'a', scenarios: [{ name: 'X', gross: Infinity, dependants: 0 }] },
    { question: 'a', scenarios: [{ name: 'X', gross: 1_000_000, dependants: 7 }] },
  ])('rejects invalid AI input %#', (value) => {
    expect(() => assistantContext(value)).toThrow()
  })
})
