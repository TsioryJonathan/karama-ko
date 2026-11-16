/** Code du travail (loi n° 2003-044) art. 28: 10 jours de salaire par année complète, au plus 6 mois. */
export const SEVERANCE_DAYS_PER_YEAR = 10
export const SEVERANCE_CAP_MONTHS = 6
/** Art. 86: 2,5 jours de congé payé par mois calendaire de service effectif. */
export const LEAVE_DAYS_PER_MONTH = 2.5
/** A day of salary is one thirtieth of the monthly gross: the Code does not give another divisor. */
export const DAYS_PER_MONTH = 30

export type EndKind = 'economic' | 'other'

export interface EndInput {
  /** Last monthly gross salary, with the benefits and extras that are part of it. */
  gross: number
  /** Complete years of service. */
  years: number
  kind: EndKind
  noticeDays: number
  /** The notice was worked: nothing is owed in its place. */
  noticeWorked: boolean
  /** Months of service since the leave was last taken. */
  leaveMonths: number
  leaveTaken: number
}

export interface EndResult {
  day: number
  severance: number
  severanceCapped: boolean
  notice: number
  leaveDays: number
  leave: number
  total: number
}

const pos = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0)

export function endOfContract(input: EndInput): EndResult {
  const gross = pos(input.gross)
  const day = gross / DAYS_PER_MONTH
  const years = Math.floor(pos(input.years))
  const raw = day * SEVERANCE_DAYS_PER_YEAR * years
  const cap = gross * SEVERANCE_CAP_MONTHS
  const severance = input.kind === 'economic' ? Math.round(Math.min(raw, cap)) : 0
  const notice = input.noticeWorked ? 0 : Math.round(day * pos(input.noticeDays))
  const leaveDays = Math.max(0, pos(input.leaveMonths) * LEAVE_DAYS_PER_MONTH - pos(input.leaveTaken))
  const leave = Math.round(day * leaveDays)
  return {
    day,
    severance,
    severanceCapped: input.kind === 'economic' && raw > cap,
    notice,
    leaveDays,
    leave,
    total: severance + notice + leave,
  }
}
