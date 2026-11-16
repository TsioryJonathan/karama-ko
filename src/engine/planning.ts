import { payslip, type Extras } from './pay'
import { compute, type Result } from './compute'
import { inverse } from './inverse'

export const MAX_SALARY = 1_000_000_000
export interface Scenario {
  id: string
  name: string
  /** Base monthly gross. */
  gross: number
  dependants: number
  /** Bonuses, overtime and benefits in kind on top of the base. */
  extras?: Extras
}
export interface TeamRole extends Scenario {
  count: number
}
export interface AnnualMonth {
  gross: number
  dependants: number
  extras?: Extras
}

/** Highest whole-Ariary gross whose employer cost fits the budget. */
export function grossFromBudget(budget: number): number {
  let low = 0
  let high = Math.max(0, Math.floor(budget))
  while (low < high) {
    const mid = Math.ceil((low + high) / 2)
    if (compute(mid).employerCost <= budget) low = mid
    else high = mid - 1
  }
  return low
}

export function negotiate(gross: number, extraNet: number, dependants: number): Result {
  const current = compute(gross, dependants)
  return compute(Math.min(MAX_SALARY, inverse(Math.max(0, current.net + extraNet), dependants)), dependants)
}

export function annualProjection(months: AnnualMonth[]) {
  const results = months.map((m) => payslip(m.gross, m.dependants, m.extras).result)
  return {
    results,
    gross: results.reduce((sum, r) => sum + r.gross, 0),
    net: results.reduce((sum, r) => sum + r.net, 0),
    tax: results.reduce((sum, r) => sum + r.irsa, 0),
    employerCost: results.reduce((sum, r) => sum + r.employerCost, 0),
  }
}

export function teamBudget(roles: TeamRole[]) {
  const rows = roles.map((role) => ({ ...role, result: payslip(role.gross, role.dependants, role.extras).result }))
  return {
    rows,
    headcount: rows.reduce((sum, r) => sum + r.count, 0),
    cost: rows.reduce((sum, r) => sum + r.result.employerCost * r.count, 0),
    net: rows.reduce((sum, r) => sum + r.result.net * r.count, 0),
  }
}
