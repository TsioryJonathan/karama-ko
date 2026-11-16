import { useEffect, useMemo, useState } from 'react'
import { AmountField } from './components/AmountField'
import { Breakdown } from './components/Breakdown'
import { Stepper, Switch, Tabs } from './components/Controls'
import { EmployerPanel } from './components/EmployerPanel'
import { ResultGrid } from './components/ResultGrid'
import { ShareActions } from './components/ShareActions'
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
      <a href="#resultat" className="sr-only-focusable btn btn-solid absolute top-2 left-2 z-10">
        Aller au résultat
      </a>
      <header className="flex h-16 items-center justify-between border-b border-line">
        <a href="./" className="text-20 font-semibold tracking-[-0.01em]">
          Karama
        </a>
        <nav className="flex items-center gap-6 print:hidden">
          <a
            href="#baremes"
            className="flex min-h-11 items-center text-16 text-ink underline decoration-line underline-offset-4 hover:decoration-ink"
          >
            Barèmes<span className="max-sm:hidden">&nbsp;et sources</span>
          </a>
          <ThemeToggle />
        </nav>
      </header>

      <main className="grid gap-x-6 gap-y-10 pt-8 pb-24 lg:grid-cols-12 lg:py-16">
        <div className="lg:col-span-4">
          <div className="lg:sticky lg:top-8">
            <h1 className="text-24 lg:text-32">Calculez votre salaire net</h1>
            <p className="mt-2 text-muted">
              Madagascar, secteur privé. Barème du 1<sup>er</sup> octobre 2026.
            </p>

            {result && (
              <p className="mt-6 hidden text-14 print:block">
                Simulation du {new Date().toLocaleDateString('fr-FR')} : brut de {formatAr(result.gross)},{' '}
                {result.dependants} personne{result.dependants > 1 ? 's' : ''} à charge.
              </p>
            )}

            <form className="mt-8 space-y-4 print:hidden" onSubmit={(e) => e.preventDefault()}>
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

        <div id="resultat" className="space-y-6 lg:col-span-8">
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
          {result && <ShareActions title={`Karama : ${formatAr(result.net)} net pour ${formatAr(result.gross)} brut`} />}
        </div>
      </main>

      <Sources />

      <p className="hidden border-t border-line pt-4 text-12 text-muted print:block">
        Estimation selon le barème {SCALE_2026.year} (Code général des impôts, art. 01.03.16 et 01.03.19 ; SME de{' '}
        {formatAr(SCALE_2026.minimumWage)}). Hors primes, heures supplémentaires et avantages en nature. Ne remplace pas
        une fiche de paie.
      </p>

      {result && (
        <div className="fixed inset-x-0 bottom-0 flex items-baseline justify-between border-t border-line bg-surface px-6 py-3 lg:hidden print:hidden" aria-hidden="true">
          <span className="text-16 font-medium">Salaire net</span>
          <span className="figure text-20 font-semibold text-net">{formatAr(result.net)}</span>
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
      className="min-h-11 text-16 text-ink underline decoration-line underline-offset-4 hover:decoration-ink"
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
