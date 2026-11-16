import { MAX_SALARY, type Scenario, type TeamRole, type AnnualMonth } from '../engine/planning'
import { compute } from '../engine/compute'
import { validExtras, type Extras } from '../engine/pay'
import { inverse } from '../engine/inverse'
import { loadInitial } from '../lib/state'

export interface Workspace {
  version: 1
  scenarios: Scenario[]
  extraNet: number
  budget: number
  exploreGross: number
  roles: TeamRole[]
  months: AnnualMonth[]
  payslip: { gross: number; dependants: number; cnaps: number; ostie: number; irsa: number; net: number; extras?: Extras }
  /** Extras planned for the position in « Préparer une embauche ». */
  hireExtras?: Extras
}
export interface SavedPlan {
  id: string
  name: string
  savedAt: string
  data: Workspace
}
export const PANELS = [
  { id: 'comparer', label: 'Comparer des offres' },
  { id: 'negocier', label: 'Préparer une négociation' },
  { id: 'explorer', label: 'Explorer mon salaire' },
  { id: 'fiche', label: 'Comprendre ma fiche' },
  { id: 'embaucher', label: 'Préparer une embauche' },
  { id: 'equipe', label: 'Budget d’équipe' },
  { id: 'annee', label: 'Projection sur 12 mois' },
  { id: 'fin', label: 'Fin de contrat' },
  { id: 'sauvegardes', label: 'Mes simulations' },
  { id: 'integrer', label: 'Intégrer Karama' },
] as const
export type Panel = (typeof PANELS)[number]['id']
export const DRAFT_KEY = 'karama:workspace:v1'
export const SAVED_KEY = 'karama:plans:v1'
const amount = (n: unknown) => typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= MAX_SALARY
const dependant = (n: unknown) => typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= 6
const named = (v: unknown): v is Scenario => {
  if (!v || typeof v !== 'object') return false
  const r = v as Scenario
  return (
    typeof r.id === 'string' &&
    r.id.length <= 100 &&
    typeof r.name === 'string' &&
    r.name.length <= 80 &&
    amount(r.gross) &&
    dependant(r.dependants) &&
    validExtras(r.extras)
  )
}
export function validWorkspace(v: unknown): v is Workspace {
  if (!v || typeof v !== 'object') return false
  const w = v as Workspace
  return (
    w.version === 1 &&
    Array.isArray(w.scenarios) &&
    w.scenarios.length >= 2 &&
    w.scenarios.length <= 4 &&
    w.scenarios.every(named) &&
    amount(w.extraNet) &&
    amount(w.budget) &&
    amount(w.exploreGross) &&
    Array.isArray(w.roles) &&
    w.roles.length > 0 &&
    w.roles.length <= 30 &&
    w.roles.every((r) => named(r) && Number.isInteger(r.count) && r.count > 0 && r.count <= 100) &&
    Array.isArray(w.months) &&
    w.months.length === 12 &&
    w.months.every((m) => m && amount(m.gross) && dependant(m.dependants) && validExtras(m.extras)) &&
    validExtras(w.hireExtras) &&
    validExtras(w.payslip?.extras) &&
    !!w.payslip &&
    ['gross', 'cnaps', 'ostie', 'irsa', 'net'].every((k) =>
      amount(w.payslip[k as keyof Workspace['payslip']]),
    ) &&
    dependant(w.payslip.dependants)
  )
}
export function initialWorkspace(): Workspace {
  const last = loadInitial()
  const gross = Math.min(
    MAX_SALARY,
    last.amount ? (last.mode === 'net' ? inverse(last.amount, last.dependants) : last.amount) : 1_000_000,
  )
  const r = compute(gross, last.dependants)
  return {
    version: 1,
    scenarios: [
      { id: 'current', name: 'Poste actuel', gross, dependants: last.dependants },
      {
        id: 'offer',
        name: 'Nouvelle offre',
        gross: Math.min(MAX_SALARY, Math.round(gross * 1.2)),
        dependants: last.dependants,
      },
    ],
    extraNet: 150_000,
    budget: r.employerCost,
    exploreGross: gross,
    roles: [{ id: 'first', name: 'Premier poste', gross, dependants: 0, count: 1 }],
    months: Array.from({ length: 12 }, () => ({ gross, dependants: last.dependants })),
    payslip: {
      gross,
      dependants: last.dependants,
      cnaps: r.contributions[0].employee,
      ostie: r.contributions[1].employee,
      irsa: r.irsa,
      net: Math.max(0, r.net),
    },
  }
}
export function decodeSharedWorkspace(hash: string): Workspace | null {
  const shared = hash.split('/')[2]
  if (!shared || shared.length > 150_000) return null
  try {
    const data: unknown = JSON.parse(decodeURIComponent(shared))
    return validWorkspace(data) ? data : null
  } catch {
    return null
  }
}
export function loadWorkspace(): Workspace {
  const shared = decodeSharedWorkspace(location.hash)
  if (shared) return shared
  try {
    const data: unknown = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? 'null')
    if (validWorkspace(data)) return data
  } catch {
    /* Storage is optional. */
  }
  return initialWorkspace()
}
export function loadSaved(): SavedPlan[] {
  try {
    const rows: unknown = JSON.parse(localStorage.getItem(SAVED_KEY) ?? '[]')
    return Array.isArray(rows)
      ? rows
          .filter(
            (r): r is SavedPlan =>
              r &&
              typeof r.id === 'string' &&
              typeof r.name === 'string' &&
              r.name.length <= 80 &&
              typeof r.savedAt === 'string' &&
              validWorkspace(r.data),
          )
          .slice(0, 30)
      : []
  } catch {
    return []
  }
}
export function shareUrl(panel: Panel, data: Workspace) {
  const url = new URL(location.href)
  url.search = ''
  url.hash = `atelier/${panel}/${encodeURIComponent(JSON.stringify(data))}`
  return url.href
}
export function downloadFile(name: string, text: string, mime: string) {
  const url = URL.createObjectURL(new Blob([text], { type: mime }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
export function csv(rows: (string | number)[][]) {
  return (
    '\uFEFF' +
    rows
      .map((row) =>
        row
          .map(
            (cell) =>
              `"${(typeof cell === 'string' ? cell.replace(/^\s*[=+@-]/, "'$&") : String(cell)).replaceAll('"', '""')}"`,
          )
          .join(';'),
      )
      .join('\r\n')
  )
}
