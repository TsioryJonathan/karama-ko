import { EXTRA_LIMITS, NO_EXTRAS, type Extras } from '../engine/pay'

export type Mode = 'gross' | 'net'
export type View = 'employee' | 'employer'

export interface State {
  /** Typed amount: a gross or a net salary depending on the mode. */
  amount: number | null
  dependants: number
  mode: Mode
  view: View
  /** Bonuses, overtime and benefits in kind; only used from a gross. */
  extras: Extras
}

export const MAX_DEPENDANTS = 6
const STORAGE_KEY = 'karama:last'
const EMPTY: State = { amount: null, dependants: 0, mode: 'gross', view: 'employee', extras: NO_EXTRAS }

/** URL parameter of each extra, in French like the others. */
const EXTRA_KEYS: Record<keyof Extras, string> = {
  bonus: 'prime',
  hours1: 'hs1',
  rate1: 'maj1',
  hours2: 'hs2',
  rate2: 'maj2',
  hours3: 'hs3',
  rate3: 'maj3',
  ostieEmployee: 'ostie_s',
  ostieEmployer: 'ostie_e',
  cadre: 'cadre',
  housing: 'loyer',
  vehicle: 'voiture',
  phone: 'tel',
  other: 'avantage',
}


const toInt = (v: string | null, max: number) => {
  const n = Number(v)
  return v !== null && /^\d+$/.test(v) && n <= max ? n : null
}

/** `?brut=1000000&pac=2&vue=employeur` or `?net=1500000` → state. */
export function parse(search: string): State | null {
  const p = new URLSearchParams(search)
  const mode: Mode = p.has('net') ? 'net' : 'gross'
  const amount = toInt(p.get(mode === 'net' ? 'net' : 'brut'), 9_999_999_999)
  const extras = { ...NO_EXTRAS }
  for (const key of Object.keys(EXTRA_KEYS) as (keyof Extras)[]) {
    const limit = EXTRA_LIMITS[key]
    const value = toInt(p.get(EXTRA_KEYS[key]), limit)
    if (value !== null) extras[key] = value
  }
  const hasExtra = Object.values(EXTRA_KEYS).some((k) => p.has(k))
  if (amount === null && !p.has('pac') && !p.has('vue') && !hasExtra) return null
  return {
    amount,
    dependants: toInt(p.get('pac'), MAX_DEPENDANTS) ?? 0,
    mode,
    view: p.get('vue') === 'employeur' ? 'employer' : 'employee',
    extras: mode === 'net' ? NO_EXTRAS : extras,
  }
}

export function serialize(s: State): string {
  const p = new URLSearchParams()
  if (s.amount !== null) p.set(s.mode === 'net' ? 'net' : 'brut', String(s.amount))
  if (s.dependants > 0) p.set('pac', String(s.dependants))
  if (s.view === 'employer') p.set('vue', 'employeur')
  if (s.mode === 'gross')
    for (const key of Object.keys(EXTRA_KEYS) as (keyof Extras)[])
      if (s.extras[key] !== NO_EXTRAS[key]) p.set(EXTRA_KEYS[key], String(s.extras[key]))
  const query = p.toString()
  return query ? `?${query}` : ''
}

/** The URL wins; otherwise the last entry kept in the browser. */
export function loadInitial(): State {
  const fromUrl = parse(location.search)
  if (fromUrl) return fromUrl
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) return parse(saved) ?? EMPTY
  } catch {
    /* storage unavailable */
  }
  return EMPTY
}

export function persist(s: State) {
  const query = serialize(s)
  history.replaceState(null, '', (query || location.pathname) + location.hash)
  try {
    localStorage.setItem(STORAGE_KEY, query)
  } catch {
    /* storage unavailable */
  }
}
