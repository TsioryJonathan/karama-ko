export type Mode = 'gross' | 'net'
export type View = 'employee' | 'employer'

export interface State {
  /** Typed amount: a gross or a net salary depending on the mode. */
  amount: number | null
  dependants: number
  mode: Mode
  view: View
}

export const MAX_DEPENDANTS = 6
const STORAGE_KEY = 'karama:last'
const EMPTY: State = { amount: null, dependants: 0, mode: 'gross', view: 'employee' }

const toInt = (v: string | null, max: number) => {
  const n = Number(v)
  return v !== null && /^\d+$/.test(v) && n <= max ? n : null
}

/** `?brut=1000000&pac=2&vue=employeur` or `?net=1500000` → state. */
export function parse(search: string): State | null {
  const p = new URLSearchParams(search)
  const mode: Mode = p.has('net') ? 'net' : 'gross'
  const amount = toInt(p.get(mode === 'net' ? 'net' : 'brut'), 9_999_999_999)
  if (amount === null && !p.has('pac') && !p.has('vue')) return null
  return {
    amount,
    dependants: toInt(p.get('pac'), MAX_DEPENDANTS) ?? 0,
    mode,
    view: p.get('vue') === 'employeur' ? 'employer' : 'employee',
  }
}

export function serialize(s: State): string {
  const p = new URLSearchParams()
  if (s.amount !== null) p.set(s.mode === 'net' ? 'net' : 'brut', String(s.amount))
  if (s.dependants > 0) p.set('pac', String(s.dependants))
  if (s.view === 'employer') p.set('vue', 'employeur')
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
  history.replaceState(null, '', query || location.pathname)
  try {
    localStorage.setItem(STORAGE_KEY, query)
  } catch {
    /* storage unavailable */
  }
}
