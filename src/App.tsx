import { useEffect, useMemo, useState } from 'react'
import { AmountField } from './components/AmountField'
import { Stepper } from './components/Controls'
import { ResultCard } from './components/ResultCard'
import { Sources } from './components/Sources'
import { SCALE_2026, compute } from './engine/compute'
import { inverse } from './engine/inverse'
import { formatAr, formatNumber } from './lib/format'
import { MAX_DEPENDANTS, loadInitial, persist, type Mode, type State } from './lib/state'

const MAX_AMOUNT = 1_000_000_000
const QUICK_AMOUNTS = [500_000, 1_000_000, 2_000_000, 5_000_000]
const MODES: { id: Mode; name: string }[] = [
  { id: 'gross', name: 'Du brut au net' },
  { id: 'net', name: 'Du net au brut' },
]

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
  const tone = 'warning' as const
  if (outOfRange) hint = `Montant trop élevé : le simulateur s’arrête à ${formatAr(MAX_AMOUNT)}.`
  else if (result && result.gross < SCALE_2026.minimumWage)
    hint = `Sous le salaire minimum d’embauche à temps plein (${formatAr(SCALE_2026.minimumWage)}).`

  return (
    <>
      <div className="flex min-h-dvh flex-col print:min-h-0">
        <a href="#resultat" className="sr-only-focusable btn btn-solid absolute top-2 left-2 z-20">
          Aller au résultat
        </a>
        <header className="mx-auto flex h-16 w-full max-w-page shrink-0 items-center justify-between px-6">
          <a href="./" className="font-display text-24 font-semibold">
            Karama
          </a>
          <nav className="flex items-center gap-2 print:hidden" aria-label="Navigation">
            <a href="#baremes" className="flex min-h-11 items-center rounded px-3 font-medium hover:bg-line">
              Barèmes<span className="max-sm:hidden">&nbsp;et sources</span>
            </a>
            <ThemeToggle />
          </nav>
        </header>

        <main className="mx-auto grid w-full max-w-page grow items-center gap-x-16 gap-y-8 px-6 pt-2 pb-28 lg:grid-cols-[5fr_6fr] lg:py-8">
          <form className="print:hidden" onSubmit={(e) => e.preventDefault()}>
            <h1 className="text-32 lg:text-48">Calculez votre salaire net.</h1>
            <p className="mt-3 text-muted">Madagascar, secteur privé. Barème d’octobre 2026.</p>

            <div
              role="group"
              aria-label="Sens du calcul"
              className="mt-6 grid grid-cols-2 gap-1 rounded border border-line bg-surface p-1 lg:mt-8"
            >
              {MODES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  aria-pressed={state.mode === m.id}
                  onClick={() => update({ mode: m.id })}
                  className={`min-h-11 rounded-[7px] px-2 font-medium transition-colors duration-150 ${state.mode === m.id ? 'bg-ink text-bg' : 'hover:bg-line'}`}
                >
                  {m.name}
                </button>
              ))}
            </div>

            <div className="mt-5">
              <AmountField
                label={state.mode === 'net' ? 'Salaire net souhaité, par mois' : 'Salaire brut, par mois'}
                value={state.amount}
                onChange={(amount) => update({ amount })}
                hint={hint}
                tone={tone}
              />
            </div>

            <div className="mt-1 grid grid-cols-4 gap-2 text-14 sm:text-16" role="group" aria-label="Montants courants">
              {QUICK_AMOUNTS.map((amount) => (
                <button
                  key={amount}
                  type="button"
                  aria-pressed={state.amount === amount}
                  onClick={() => update({ amount })}
                  className={`figure min-h-11 rounded border px-1 font-medium transition-colors duration-150 ${state.amount === amount ? 'border-ink bg-ink text-bg' : 'border-line bg-surface hover:border-ink'}`}
                >
                  {formatNumber(amount)}
                </button>
              ))}
            </div>

            <div className="mt-5 border-t border-line pt-4">
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
          </form>

          <div>
            {result && (
              <p className="mb-4 hidden print:block">
                Karama, simulation du {new Date().toLocaleDateString('fr-FR')} : brut de {formatAr(result.gross)},{' '}
                {result.dependants} personne{result.dependants > 1 ? 's' : ''} à charge. Barème {SCALE_2026.year}, SME
                de {formatAr(SCALE_2026.minimumWage)}. Estimation, hors primes, heures supplémentaires et avantages en
                nature.
              </p>
            )}
            <ResultCard result={result} mode={state.mode} view={state.view} onViewChange={(view) => update({ view })} />
          </div>
        </main>
      </div>

      <Sources />

      {result && (
        <div
          className="fixed inset-x-0 bottom-0 z-10 flex items-baseline justify-between border-t border-line bg-surface px-6 py-3 lg:hidden print:hidden"
          aria-hidden="true"
        >
          <span className="font-medium">Salaire net</span>
          <span className="figure text-20 font-semibold text-net">{formatAr(result.net)}</span>
        </div>
      )}
    </>
  )
}

function ThemeToggle() {
  const [dark, setDark] = useState(() => document.documentElement.dataset.theme === 'dark')
  return (
    <button
      type="button"
      aria-pressed={dark}
      aria-label="Thème sombre"
      title={dark ? 'Passer au thème clair' : 'Passer au thème sombre'}
      className="flex h-11 w-11 items-center justify-center rounded hover:bg-line"
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
      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
        <circle cx="9" cy="9" r="7.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M9 1.75a7.25 7.25 0 0 1 0 14.5z" fill="currentColor" />
      </svg>
    </button>
  )
}
