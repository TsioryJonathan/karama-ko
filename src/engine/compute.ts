import scale2026 from '../scales/2026.json'

export interface Bracket {
  /** Upper bound of the bracket in Ariary, null for the last one. */
  upTo: number | null
  /** Rate in percent. */
  rate: number
}

export interface Contribution {
  id: string
  name: string
  /** Rates in percent. */
  employee: number
  employer: number
}

export interface Scale {
  year: number
  effectiveFrom: string
  updatedAt: string
  /** SME, the non-agricultural minimum hiring wage. */
  minimumWage: number
  /** Contributions are capped at this multiple of the minimum wage. */
  ceilingMultiple: number
  irsa: {
    baseRounding: number
    minimumTax: number
    reliefPerDependant: number
    reliefThreshold: number
    brackets: Bracket[]
  }
  contributions: Contribution[]
  sources: { topic: string; reference: string; url: string }[]
}

export interface ContributionLine {
  id: string
  name: string
  employeeRate: number
  employerRate: number
  employee: number
  employer: number
  capped: boolean
}

export interface BracketLine {
  from: number
  upTo: number | null
  rate: number
  /** Share of the taxable base that falls in this bracket. */
  amount: number
  tax: number
  reached: boolean
}

export interface Result {
  gross: number
  dependants: number
  ceiling: number
  contributions: ContributionLine[]
  /** Sum of the employee shares. */
  socialDeductions: number
  taxableBase: number
  brackets: BracketLine[]
  grossTax: number
  relief: number
  minimumApplied: boolean
  irsa: number
  net: number
  /** (gross − net) / gross, between 0 and 1. */
  effectiveRate: number
  employerCharges: number
  employerCost: number
}

export const SCALE_2026 = scale2026 as Scale

export function contributionCeiling(scale: Scale): number {
  return scale.minimumWage * scale.ceilingMultiple
}

/** Monthly gross salary (whole Ariary) → full payslip breakdown. */
export function compute(gross: number, dependants = 0, scale: Scale = SCALE_2026): Result {
  gross = Math.max(0, Math.round(gross))
  dependants = Math.max(0, Math.floor(dependants))
  const ceiling = contributionCeiling(scale)
  const cappedGross = Math.min(gross, ceiling)

  const contributions = scale.contributions.map<ContributionLine>((c) => ({
    id: c.id,
    name: c.name,
    employeeRate: c.employee,
    employerRate: c.employer,
    employee: Math.round((cappedGross * c.employee) / 100),
    employer: Math.round((cappedGross * c.employer) / 100),
    capped: gross > ceiling,
  }))
  const socialDeductions = contributions.reduce((sum, c) => sum + c.employee, 0)
  const employerCharges = contributions.reduce((sum, c) => sum + c.employer, 0)

  const { baseRounding, minimumTax, reliefPerDependant, reliefThreshold } = scale.irsa
  const taxableBase = Math.floor((gross - socialDeductions) / baseRounding) * baseRounding

  let from = 0
  const brackets = scale.irsa.brackets.map<BracketLine>((b) => {
    const top = b.upTo ?? Infinity
    const amount = Math.max(0, Math.min(taxableBase, top) - from)
    const line: BracketLine = {
      from,
      upTo: b.upTo,
      rate: b.rate,
      amount,
      tax: Math.round((amount * b.rate) / 100),
      reached: taxableBase > from,
    }
    from = top
    return line
  })
  const grossTax = brackets.reduce((sum, b) => sum + b.tax, 0)

  // CGI art. 01.03.19: the relief only applies above the threshold.
  const relief = taxableBase > reliefThreshold ? dependants * reliefPerDependant : 0
  // CGI art. 01.03.16: the tax cannot fall below the minimum, whatever the bracket.
  const floor = gross > 0 ? minimumTax : 0
  const irsa = Math.max(grossTax - relief, floor)

  const net = gross - socialDeductions - irsa
  return {
    gross,
    dependants,
    ceiling,
    contributions,
    socialDeductions,
    taxableBase,
    brackets,
    grossTax,
    relief,
    minimumApplied: irsa > grossTax - relief,
    irsa,
    net,
    effectiveRate: gross > 0 ? (gross - net) / gross : 0,
    employerCharges,
    employerCost: gross + employerCharges,
  }
}
