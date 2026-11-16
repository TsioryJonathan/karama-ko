import { compute, SCALE, type Result, type Scale } from './compute'

/** Legal working time, Code du travail art. 75: 173,33 hours a month. */
export const LEGAL_MONTHLY_HOURS = 173.33
/** Overtime pay up to this many hours is left out of the IRSA base (CGI art. 01.03.03, 9°). */
export const OVERTIME_EXEMPT_HOURS = 20
/** Usual premiums for the first and the following overtime hours. They are set by decree or collective agreement. */
export const DEFAULT_OVERTIME_RATES = [30, 50] as const

export interface Extras {
  /** Monthly bonuses and allowances, taxable like salary (CGI art. 01.03.02). */
  bonus: number
  hours1: number
  rate1: number
  hours2: number
  rate2: number
  /** Real monthly rent borne by the employer. */
  housing: number
  /** Real monthly costs of a company car also used privately. */
  vehicle: number
  /** Real monthly phone costs borne by the employer. */
  phone: number
  /** Any other benefit, at its real value. */
  other: number
}

export const NO_EXTRAS: Extras = {
  bonus: 0,
  hours1: 0,
  rate1: DEFAULT_OVERTIME_RATES[0],
  hours2: 0,
  rate2: DEFAULT_OVERTIME_RATES[1],
  housing: 0,
  vehicle: 0,
  phone: 0,
  other: 0,
}

export interface Pay {
  base: number
  bonus: number
  overtime: { hourly: number; pay1: number; pay2: number; pay: number; exempt: number }
  benefits: { housing: number; vehicle: number; phone: number; other: number; total: number }
  /** Cash gross: base, bonuses and overtime. */
  gross: number
  result: Result
}

const num = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0)

/** Base salary and extras → full payslip. Benefits in kind add to the IRSA base, not to the cash paid. */
export function payslip(base: number, dependants: number, extras: Extras = NO_EXTRAS, scale: Scale = SCALE): Pay {
  base = Math.round(num(base))
  const bonus = Math.round(num(extras.bonus))
  const hourly = base / LEGAL_MONTHLY_HOURS
  const hours1 = num(extras.hours1)
  const hours2 = num(extras.hours2)
  const pay1 = Math.round(hourly * hours1 * (1 + num(extras.rate1) / 100))
  const pay2 = Math.round(hourly * hours2 * (1 + num(extras.rate2) / 100))
  // The first hours are the ones counted against the exemption.
  const exempt1 = Math.min(hours1, OVERTIME_EXEMPT_HOURS)
  const exempt2 = Math.min(hours2, OVERTIME_EXEMPT_HOURS - exempt1)
  const exempt = Math.round(hourly * exempt1 * (1 + num(extras.rate1) / 100) + hourly * exempt2 * (1 + num(extras.rate2) / 100))

  // CGI art. 01.03.08: housing at 50 % of the rent, never above 25 % of the fixed cash pay;
  // car and phone at 15 % of the real costs; anything else at its real value.
  const housing = Math.min(Math.round(num(extras.housing) * 0.5), Math.round(base * 0.25))
  const vehicle = Math.round(num(extras.vehicle) * 0.15)
  const phone = Math.round(num(extras.phone) * 0.15)
  const other = Math.round(num(extras.other))
  const benefitsTotal = housing + vehicle + phone + other

  const gross = base + bonus + pay1 + pay2
  return {
    base,
    bonus,
    overtime: { hourly, pay1, pay2, pay: pay1 + pay2, exempt },
    benefits: { housing, vehicle, phone, other, total: benefitsTotal },
    gross,
    result: compute(gross, dependants, scale, { taxExempt: exempt, benefitsTaxable: benefitsTotal }),
  }
}

export const hasExtras = (e: Extras) =>
  e.bonus > 0 || e.hours1 > 0 || e.hours2 > 0 || e.housing > 0 || e.vehicle > 0 || e.phone > 0 || e.other > 0

const EXTRA_LIMITS: Record<keyof Extras, number> = {
  bonus: 1_000_000_000,
  hours1: 300,
  rate1: 200,
  hours2: 300,
  rate2: 200,
  housing: 1_000_000_000,
  vehicle: 1_000_000_000,
  phone: 1_000_000_000,
  other: 1_000_000_000,
}

/** Imported or shared data: missing extras are fine, malformed ones are not. */
export function validExtras(v: unknown): boolean {
  if (v === undefined) return true
  if (!v || typeof v !== 'object') return false
  const e = v as Record<string, unknown>
  return (Object.keys(EXTRA_LIMITS) as (keyof Extras)[]).every(
    (key) => typeof e[key] === 'number' && Number.isFinite(e[key]) && (e[key] as number) >= 0 && (e[key] as number) <= EXTRA_LIMITS[key],
  )
}

/**
 * Largest base salary whose total cost to the employer, extras included, fits the budget.
 * Overtime depends on the base, so the answer cannot be read off a formula: it is searched.
 */
export function baseFromBudget(budget: number, extras: Extras = NO_EXTRAS): number {
  let low = 0
  let high = Math.max(0, Math.floor(budget))
  while (low < high) {
    const mid = Math.ceil((low + high) / 2)
    if (payslip(mid, 0, extras).result.employerCost <= budget) low = mid
    else high = mid - 1
  }
  return low
}
