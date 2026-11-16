import { useEffect, useMemo, useState } from 'react'
import { InteractiveGrid } from './components/InteractiveGrid'
import { AmountField } from './components/AmountField'
import { Stepper } from './components/Controls'
import { ResultCard } from './components/ResultCard'
import { Sources } from './components/Sources'
import { SCALE_2026, compute } from './engine/compute'
import { inverse } from './engine/inverse'
import { formatAr, formatNumber } from './lib/format'
import { MAX_DEPENDANTS, loadInitial, persist, type Mode, type State } from './lib/state'

const MAX_AMOUNT = 1_000_000_000
/** Focusing the field on a phone would pop the keyboard over the page. */
const DESKTOP = matchMedia('(min-width: 960px)').matches
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
      <div
        className="calculator-shell flex min-h-dvh flex-col print:min-h-0"
        onPointerMove={(event) => {
          if (event.pointerType !== 'mouse' || matchMedia('(prefers-reduced-motion: reduce)').matches) return
          const shell = event.currentTarget
          const bounds = shell.getBoundingClientRect()
          shell.style.setProperty('--pointer-x', `${((event.clientX - bounds.left) / bounds.width - 0.5) * 24}px`)
          shell.style.setProperty('--pointer-y', `${((event.clientY - bounds.top) / bounds.height - 0.5) * 24}px`)
        }}
        onPointerLeave={(event) => {
          event.currentTarget.style.removeProperty('--pointer-x')
          event.currentTarget.style.removeProperty('--pointer-y')
        }}
      >
        <InteractiveGrid />
        <a href="#resultat" className="sr-only-focusable btn btn-solid absolute top-2 left-2 z-20">
          Aller au résultat
        </a>
        <header className="mx-auto flex w-full max-w-page shrink-0 items-center justify-between px-6 pt-6 lg:px-10 lg:pt-8">
          <a href="./" className="font-display text-28 font-extrabold">
            Karama
          </a>
          <nav className="flex items-center gap-1 print:hidden" aria-label="Navigation">
            <a href="#baremes" className="flex min-h-11 items-center rounded px-3 text-14 font-medium hover:bg-raised">
              Barèmes<span className="max-sm:hidden">&nbsp;et sources</span>
            </a>
            <ThemeToggle />
          </nav>
        </header>

        <main className="mx-auto grid w-full max-w-page grow items-center gap-x-16 gap-y-10 px-6 pt-8 pb-28 lg:grid-cols-[340px_1fr] lg:px-10 lg:py-6">
          <form className="print:hidden" onSubmit={(e) => e.preventDefault()}>
            <h1 className="font-display text-28 font-extrabold leading-[1.1]">Calculez votre salaire net</h1>
            <p className="mt-3 text-muted">Madagascar, secteur privé. Barème d’octobre 2026.</p>

            <div className="mt-8 space-y-8 lg:mt-10">
              <div role="group" aria-label="Sens du calcul" className="grid grid-cols-2 gap-1 rounded bg-raised p-1">
                {MODES.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    aria-pressed={state.mode === m.id}
                    onClick={() => update({ mode: m.id })}
                    className={`min-h-10 rounded-[4px] px-2 text-14 font-medium transition-colors duration-150 ${state.mode === m.id ? 'bg-accent text-on-accent font-bold' : 'text-muted hover:text-ink'}`}
                  >
                    {m.name}
                  </button>
                ))}
              </div>

              <div>
                <AmountField
                  label={state.mode === 'net' ? 'Votre salaire net souhaité, par mois' : 'Votre salaire brut, par mois'}
                  value={state.amount}
                  onChange={(amount) => update({ amount })}
                  hint={hint}
                  tone={tone}
                  autoFocus={DESKTOP && state.amount === null}
                />
                <p id="quick-amounts" className="text-14 text-muted">
                  Ou choisissez un exemple
                </p>
                <div className="mt-2 grid grid-cols-4 gap-2" role="group" aria-labelledby="quick-amounts">
                  {QUICK_AMOUNTS.map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      aria-pressed={state.amount === amount}
                      onClick={() => update({ amount })}
                      className={`figure min-h-11 rounded px-1 text-14 font-medium transition-colors duration-150 ${state.amount === amount ? 'bg-accent text-on-accent' : 'bg-raised hover:bg-control/45'}`}
                    >
                      {formatNumber(amount)}
                    </button>
                  ))}
                </div>
              </div>

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
            <ResultCard result={result} mode={state.mode} />
          </div>
        </main>
      </div>

      <Sources />

      {result && (
        <div
          className="fixed inset-x-0 bottom-0 z-10 flex items-baseline justify-between bg-ink px-6 py-3 text-bg lg:hidden print:hidden"
          aria-hidden="true"
        >
          <span className="font-medium">Salaire net</span>
          <span className="figure text-20 font-bold">{formatAr(result.net)}</span>
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
      className="flex h-11 w-11 items-center justify-center rounded hover:bg-raised"
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
