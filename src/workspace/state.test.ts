import { describe, expect, it } from 'vitest'
import { csv, validWorkspace, decodeSharedWorkspace, type Workspace } from './state'

const valid: Workspace = {
  version: 1,
  scenarios: [
    { id: 'a', name: 'A', gross: 1_000_000, dependants: 0 },
    { id: 'b', name: 'B', gross: 2_000_000, dependants: 2 },
  ],
  extraNet: 100_000,
  budget: 1_190_000,
  exploreGross: 1_000_000,
  roles: [{ id: 'a', name: 'A', gross: 1_000_000, dependants: 0, count: 2 }],
  months: Array.from({ length: 12 }, () => ({ gross: 1_000_000, dependants: 0 })),
  payslip: { gross: 1_000_000, dependants: 0, cnaps: 10000, ostie: 10000, irsa: 103500, net: 876500 },
}
import { NO_EXTRAS } from '../engine/pay'

describe('workspace extras', () => {
  it('older data without extras stays valid, and extras are checked when present', () => {
    expect(validWorkspace(JSON.parse(JSON.stringify(valid)))).toBe(true)
    const withExtras = { ...valid, hireExtras: NO_EXTRAS, scenarios: valid.scenarios.map((s) => ({ ...s, extras: NO_EXTRAS })) }
    expect(validWorkspace(JSON.parse(JSON.stringify(withExtras)))).toBe(true)
    expect(validWorkspace({ ...withExtras, hireExtras: { bonus: 'x' } })).toBe(false)
    expect(validWorkspace({ ...withExtras, months: valid.months.map((m) => ({ ...m, extras: 5 })) })).toBe(false)
  })
})

describe('workspace import', () => {
  it('accepts complete valid snapshots and rejects unsupported or malformed payloads', () => {
    expect(validWorkspace(JSON.parse(JSON.stringify(valid)))).toBe(true)
    for (const data of [
      null,
      { ...valid, version: 2 },
      { ...valid, scenarios: [] },
      { ...valid, months: [] },
      { ...valid, budget: -1 },
      { ...valid, payslip: null },
      { ...valid, roles: [{ ...valid.roles[0], count: 0 }] },
    ])
      expect(validWorkspace(data)).toBe(false)
  })
  it('validates URL fragments before restoring a shared workshop', () => {
    expect(decodeSharedWorkspace('#atelier/comparer/' + encodeURIComponent(JSON.stringify(valid)))).toEqual(
      valid,
    )
    expect(decodeSharedWorkspace('#atelier/comparer/%bad')).toBeNull()
    expect(decodeSharedWorkspace('#atelier/comparer/' + encodeURIComponent('{"version":2}'))).toBeNull()
  })
  it('quotes CSV labels and prevents spreadsheet formula injection', () => {
    const result = csv([['=HYPERLINK("bad")', 'Un;poste', 1000000]])
    expect(result).toContain('"\'=HYPERLINK(""bad"")"')
    expect(result).toContain('"Un;poste"')
    expect(result.charCodeAt(0)).toBe(0xfeff)
    expect(csv([['A'], ['B']])).toContain('\r\n')
    expect(csv([[-100]])).toContain('"-100"')
  })
})
