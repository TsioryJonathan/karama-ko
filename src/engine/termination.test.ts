import { describe, expect, it } from 'vitest'
import { endOfContract, type EndInput } from './termination'

const base: EndInput = { gross: 900_000, years: 4, kind: 'economic', noticeDays: 30, noticeWorked: true, leaveMonths: 0, leaveTaken: 0 }

describe('end of contract', () => {
  it('economic dismissal: 10 days of salary per complete year (art. 28)', () => {
    const r = endOfContract(base)
    // A day is 900 000 / 30 = 30 000 Ar; 4 years × 10 days.
    expect(r.severance).toBe(1_200_000)
    expect(r.total).toBe(1_200_000)
  })

  it('severance is capped at six months of salary', () => {
    const r = endOfContract({ ...base, years: 30 })
    expect(r.severance).toBe(5_400_000)
    expect(r.severanceCapped).toBe(true)
  })

  it('no severance is computed for another kind of ending', () => {
    expect(endOfContract({ ...base, kind: 'other' }).severance).toBe(0)
  })

  it('a notice that is not worked is paid in its place', () => {
    expect(endOfContract({ ...base, noticeWorked: false, noticeDays: 15 }).notice).toBe(450_000)
    expect(endOfContract(base).notice).toBe(0)
  })

  it('unused leave is 2,5 days a month, minus the days taken', () => {
    const r = endOfContract({ ...base, years: 0, leaveMonths: 8, leaveTaken: 5 })
    expect(r.leaveDays).toBe(15)
    expect(r.leave).toBe(450_000)
  })

  it('never goes negative', () => {
    const r = endOfContract({ ...base, gross: -5, years: -1, leaveMonths: 1, leaveTaken: 10 })
    expect(r.total).toBe(0)
  })
})
