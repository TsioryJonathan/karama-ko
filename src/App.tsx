import { useEffect, useMemo, useState } from 'react'
import { AmountField } from './components/AmountField'
import { Breakdown } from './components/Breakdown'
import { Stepper, Switch, Tabs } from './components/Controls'
import { EmployerPanel } from './components/EmployerPanel'
import { ResultGrid } from './components/ResultGrid'
import { Sources } from './components/Sources'
import { SCALE_2026, compute } from './engine/compute'
import { inverse } from './engine/inverse'
import { formatAr } from './lib/format'
import { MAX_DEPENDANTS, loadInitial, persist, type State, type View } from './lib/state'

const MAX_AMOUNT = 1_000_000_000

export function App() {
  const [state, setState] = useState<State>(loadInitial)
  const update = (patch: Partial<State>) => setState((s) => ({ ...s, ...patch }))
  useEffect(() => persist(state), [state])

  const outOfRange = state.amount !== null && state.amount > MAX_AMOUNT
  const result = useMemo(() => {
    if (!state.amount || outOfRange) return null
    const gross = state.mode === 'net' ? inverse(state.amount, state.dependants) : state.amount
    return compute(gross, state.dependants)
  }, [state.amount, state.mode, state.dependants, outOfRange])

  let hint: string | undefined
  let tone: 'neutral' | 'warning' = 'warning'
  if (outOfRange) hint = `Montant trop élevé : le simulateur s’arrête à ${formatAr(MAX_AMOUNT)}.`
  else if (result && result.gross < SCALE_2026.minimumWage)
    hint = `Sous le salaire minimum d’embauche à temps plein (${formatAr(SCALE_2026.minimumWage)}).`
  else if (result && state.mode === 'net') {
    hint = `Brut à demander : ${formatAr(result.gross)}.`
    tone = 'neutral'
  }

  return (
    <div className="mx-auto max-w-page px-6">
      <header className="flex h-16 items-center justify-between border-b border-line">
        <a href="./" className="font-display text-20 font-semibold tracking-[-0.02em]">
          Karama
        </a>
        <nav className="flex items-center gap-6 print:hidden">
          <a
            href="#baremes"
            className="flex min-h-11 items-center text-14 font-medium text-muted transition-colors duration-150 hover:text-ink"
          >
            Barèmes et sources
          </a>
          <ThemeToggle />
        </nav>
      </header>

      <main className="grid gap-x-6 gap-y-12 pt-12 pb-24 lg:grid-cols-12 lg:py-24">
        <div className="lg:col-span-4">
          <div className="lg:sticky lg:top-12">
            <h1 className="text-32 lg:text-48">Du brut au net, ligne par ligne.</h1>
            <p className="mt-4 max-w-[38ch] text-muted">
              Salaire mensuel du secteur privé non agricole à Madagascar, selon le barème en vigueur depuis le 1
              <sup>er</sup> octobre 2026.
            </p>

            <form className="mt-12 space-y-6" onSubmit={(e) => e.preventDefault()}>
              <AmountField
                label={state.mode === 'net' ? 'Salaire net souhaité, par mois' : 'Salaire brut mensuel'}
                value={state.amount}
                onChange={(amount) => update({ amount })}
                hint={hint}
                tone={tone}
              />
              <div className="divide-y divide-line border-y border-line">
                <div className="py-3">
                  <Stepper
                    label="Personnes à charge"
                    value={state.dependants}
                    min={0}
                    max={MAX_DEPENDANTS}
                    decrementLabel="Une personne de moins"
                    incrementLabel="Une personne de plus"
                    onChange={(dependants) => update({ dependants })}
                  />
                </div>
                <div className="py-1">
                  <Switch
                    label="Je connais mon net"
                    checked={state.mode === 'net'}
                    onChange={(checked) => update({ mode: checked ? 'net' : 'gross' })}
                  />
                </div>
              </div>
            </form>
          </div>
        </div>

        <div className="space-y-6 lg:col-span-8">
          <div className="print:hidden">
            <Tabs<View>
              label="Point de vue"
              tabs={[
                { id: 'employee', name: 'Salarié' },
                { id: 'employer', name: 'Employeur' },
              ]}
              active={state.view}
              onChange={(view) => update({ view })}
            />
          </div>
          <ResultGrid result={result} />
          {result && state.view === 'employer' && <EmployerPanel result={result} />}
          {result && <Breakdown result={result} />}
        </div>
      </main>

      <Sources />

      {result && (
        <div className="fixed inset-x-0 bottom-0 flex items-baseline justify-between border-t border-line bg-surface px-6 py-3 lg:hidden print:hidden">
          <span className="label">Salaire net</span>
          <span className="figure font-display text-20 font-medium text-net">{formatAr(result.net)}</span>
        </div>
      )}
    </div>
  )
}

function ThemeToggle() {
  const [dark, setDark] = useState(() => document.documentElement.dataset.theme === 'dark')
  return (
    <button
      type="button"
      className="min-h-11 text-14 font-medium text-muted transition-colors duration-150 hover:text-ink"
      aria-pressed={dark}
      onClick={() => {
        const next = !dark
        document.documentElement.dataset.theme = next ? 'dark' : 'light'
        try {
          localStorage.setItem('karama:theme', next ? 'dark' : 'light')
        } catch {
          /* storage unavailable */
        }
        setDark(next)
      }}
    >
      {dark ? 'Thème clair' : 'Thème sombre'}
    </button>
  )
}
