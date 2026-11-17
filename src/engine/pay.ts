import { compute, SCALE, withRates, type Result, type Scale } from './compute'

/** Legal working time, Code du travail art. 75: 173,33 hours a month. */
export const LEGAL_MONTHLY_HOURS = 173.33
/** Overtime pay up to this many hours is left out of the IRSA base (CGI art. 01.03.03, 9°). */
export const OVERTIME_EXEMPT_HOURS = 20
/** Usual premiums for the first and the following overtime hours. They are set by decree or collective agreement. */
export const DEFAULT_OVERTIME_RATES = [30, 50] as const
/** Usual premium for hours worked on a Sunday or a public holiday; to be checked against the contract. */
export const DEFAULT_SUNDAY_HOLIDAY_RATE = 100
/** OSTIE rates of the scale in force, the starting point of the editable ones. */
const SCALE_OSTIE = SCALE.contributions.find((c) => c.id === 'ostie')
export const DEFAULT_OSTIE = { employee: SCALE_OSTIE?.employee ?? 0, employer: SCALE_OSTIE?.employer ?? 0 }

export interface Extras {
  /** Monthly bonuses and allowances, taxable like salary (CGI art. 01.03.02). */
  bonus: number
  hours1: number
  rate1: number
  hours2: number
  rate2: number
  /** Hours worked on Sundays and public holidays, with their own premium. */
  hours3: number
  rate3: number
  /** OSTIE rates in percent: 0 for a company that does not pay it. */
  ostieEmployee: number
  ostieEmployer: number
  /** 1 for an executive or « hors catégorie » employee, who is not paid overtime. */
  cadre: number
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
  hours3: 0,
  rate3: DEFAULT_SUNDAY_HOLIDAY_RATE,
  ostieEmployee: DEFAULT_OSTIE.employee,
  ostieEmployer: DEFAULT_OSTIE.employer,
  cadre: 0,
  housing: 0,
  vehicle: 0,
  phone: 0,
  other: 0,
}

export interface Pay {
  base: number
  bonus: number
  overtime: { hourly: number; pay1: number; pay2: number; pay3: number; pay: number; exempt: number }
  benefits: { housing: number; vehicle: number; phone: number; other: number; total: number }
  /** Cash gross: base, bonuses and overtime. */
  gross: number
  result: Result
}

const num = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0)

/** Base salary and extras → full payslip. Benefits in kind add to the IRSA base, not to the cash paid. */
export function payslip(base: number, dependants: number, given: Extras = NO_EXTRAS, scale: Scale = SCALE): Pay {
  // Saved plans and links from before an option existed simply lack its key: the default applies.
  const extras: Extras = { ...NO_EXTRAS, ...given }
  base = Math.round(num(base))
  const bonus = Math.round(num(extras.bonus))
  const hourly = base / LEGAL_MONTHLY_HOURS
  // An executive is not paid overtime, whatever was typed before the status changed.
  const paid = extras.cadre === 1 ? 0 : 1
  const hours1 = num(extras.hours1) * paid
  const hours2 = num(extras.hours2) * paid
  const hours3 = num(extras.hours3) * paid
  const factor = (rate: number) => 1 + num(rate) / 100
  const pay1 = Math.round(hourly * hours1 * factor(extras.rate1))
  const pay2 = Math.round(hourly * hours2 * factor(extras.rate2))
  const pay3 = Math.round(hourly * hours3 * factor(extras.rate3))
  // The first hours, in the order they are listed, are the ones counted against the exemption.
  const exempt1 = Math.min(hours1, OVERTIME_EXEMPT_HOURS)
  const exempt2 = Math.min(hours2, OVERTIME_EXEMPT_HOURS - exempt1)
  const exempt3 = Math.min(hours3, OVERTIME_EXEMPT_HOURS - exempt1 - exempt2)
  const exempt = Math.round(
    hourly * exempt1 * factor(extras.rate1) + hourly * exempt2 * factor(extras.rate2) + hourly * exempt3 * factor(extras.rate3),
  )

  // CGI art. 01.03.08: housing at 50 % of the rent, never above 25 % of the fixed cash pay;
  // car and phone at 15 % of the real costs; anything else at its real value.
  const housing = Math.min(Math.round(num(extras.housing) * 0.5), Math.round(base * 0.25))
  const vehicle = Math.round(num(extras.vehicle) * 0.15)
  const phone = Math.round(num(extras.phone) * 0.15)
  const other = Math.round(num(extras.other))
  const benefitsTotal = housing + vehicle + phone + other

  const gross = base + bonus + pay1 + pay2 + pay3
  const rated = withRates(scale, 'ostie', num(extras.ostieEmployee), num(extras.ostieEmployer))
  return {
    base,
    bonus,
    overtime: { hourly, pay1, pay2, pay3, pay: pay1 + pay2 + pay3, exempt },
    benefits: { housing, vehicle, phone, other, total: benefitsTotal },
    gross,
    result: compute(gross, dependants, rated, { taxExempt: exempt, benefitsTaxable: benefitsTotal }),
  }
}

/** True as soon as something differs from the plain salary on the scale in force. */
export const hasExtras = (given: Extras) => {
  const e: Extras = { ...NO_EXTRAS, ...given }
  return (
    e.bonus > 0 ||
    e.hours1 > 0 ||
    e.hours2 > 0 ||
    e.hours3 > 0 ||
    e.housing > 0 ||
    e.vehicle > 0 ||
    e.phone > 0 ||
    e.other > 0 ||
    e.cadre === 1 ||
    e.ostieEmployee !== DEFAULT_OSTIE.employee ||
    e.ostieEmployer !== DEFAULT_OSTIE.employer
  )
}

export const EXTRA_LIMITS: Record<keyof Extras, number> = {
  bonus: 1_000_000_000,
  hours1: 300,
  rate1: 200,
  hours2: 300,
  rate2: 200,
  hours3: 300,
  rate3: 200,
  ostieEmployee: 100,
  ostieEmployer: 100,
  cadre: 1,
  housing: 1_000_000_000,
  vehicle: 1_000_000_000,
  phone: 1_000_000_000,
  other: 1_000_000_000,
}

const ADDED_LATER: (keyof Extras)[] = ['hours3', 'rate3', 'ostieEmployee', 'ostieEmployer', 'cadre']

/** Imported or shared data: missing extras are fine, malformed ones are not. */
export function validExtras(v: unknown): boolean {
  if (v === undefined) return true
  if (!v || typeof v !== 'object') return false
  const e = v as Record<string, unknown>
  return (Object.keys(EXTRA_LIMITS) as (keyof Extras)[]).every((key) => {
    // Options added later are missing from older links and saved plans.
    if (e[key] === undefined && ADDED_LATER.includes(key)) return true
    const n = e[key]
    return typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= EXTRA_LIMITS[key] && (key !== 'cadre' || Number.isInteger(n))
  })
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
