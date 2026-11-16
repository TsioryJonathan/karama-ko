import { useEffect, useMemo, useState } from 'react'
import { AmountField } from './components/AmountField'
import { Stepper, Switch } from './components/Controls'
import { Sources } from './components/Sources'
import { Ticket } from './components/Ticket'
import { SCALE_2026, compute } from './engine/compute'
import { inverse } from './engine/inverse'
import { formatAr, formatNumber } from './lib/format'
import { MAX_DEPENDANTS, loadInitial, persist, type State } from './lib/state'

const MAX_AMOUNT = 1_000_000_000
const QUICK_AMOUNTS = [500_000, 1_000_000, 2_000_000, 5_000_000]

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
    <div className="lg:pl-16">
      <a href="#resultat" className="sr-only-focusable btn btn-solid absolute top-2 left-20 z-20">
        Aller au résultat
      </a>
      <Rail />

      <div className="lg:grid lg:grid-cols-[minmax(380px,5fr)_7fr]">
        {/* The input panel always wears the dark tokens, whatever the page theme. */}
        <aside
          data-theme="dark"
          className="relative overflow-hidden bg-bg px-6 py-10 text-ink lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto lg:px-12 lg:py-14 print:hidden"
        >
          <span
            className="pointer-events-none absolute -right-6 -bottom-24 font-display text-[340px] leading-none font-semibold text-surface select-none max-lg:hidden"
            aria-hidden="true"
          >
            Ar
          </span>

          <div className="relative">
            <p className="stamp">Barème octobre 2026</p>
            <h1 className="mt-5 text-[44px] lg:text-[64px]">
              Du brut
              <br />
              au net.
            </h1>
            <p className="mt-4 max-w-[34ch] text-muted">
              Salaire mensuel du secteur privé à Madagascar : IRSA, CNaPS et OSTIE.
            </p>

            <form className="mt-8 space-y-5" onSubmit={(e) => e.preventDefault()}>
              <AmountField
                label={state.mode === 'net' ? 'Salaire net souhaité, par mois' : 'Salaire brut mensuel'}
                value={state.amount}
                onChange={(amount) => update({ amount })}
                hint={hint}
                tone={tone}
              />
              <div className="flex flex-wrap gap-2" role="group" aria-label="Montants courants">
                {QUICK_AMOUNTS.map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    aria-pressed={state.amount === amount}
                    onClick={() => update({ amount })}
                    className={`figure min-h-11 rounded border-[1.5px] px-3 text-16 font-medium transition-colors duration-150 ${state.amount === amount ? 'border-ink bg-ink text-bg' : 'border-muted hover:border-ink'}`}
                  >
                    {formatNumber(amount)}
                  </button>
                ))}
              </div>
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
        </aside>

        <main className="paper px-4 pt-10 pb-28 lg:px-12 lg:py-14">
          {result && (
            <p className="mb-4 hidden text-14 print:block">
              Karama, simulation du {new Date().toLocaleDateString('fr-FR')} : brut de {formatAr(result.gross)},{' '}
              {result.dependants} personne{result.dependants > 1 ? 's' : ''} à charge. Barème {SCALE_2026.year}, SME de{' '}
              {formatAr(SCALE_2026.minimumWage)}.
            </p>
          )}
          <Ticket result={result} view={state.view} onViewChange={(view) => update({ view })} />
          <Sources />
        </main>
      </div>

      {result && (
        <div
          className="fixed inset-x-0 bottom-0 z-10 flex items-baseline justify-between bg-net px-6 py-3 text-bg lg:hidden print:hidden"
          aria-hidden="true"
        >
          <span className="text-16 font-medium">Salaire net</span>
          <span className="figure text-20 font-semibold">{formatAr(result.net)}</span>
        </div>
      )}
    </div>
  )
}

/** Vertical rail on desktop, thin strip on mobile: wordmark, sources link, theme toggle. */
function Rail() {
  const [dark, setDark] = useState(() => document.documentElement.dataset.theme === 'dark')
  const toggle = () => {
    const next = !dark
    document.documentElement.dataset.theme = next ? 'dark' : 'light'
    try {
      localStorage.setItem('karama:theme', next ? 'dark' : 'light')
    } catch {
      /* storage unavailable */
    }
    setDark(next)
  }
  const vertical = 'lg:rotate-180 lg:[writing-mode:vertical-rl]'

  return (
    <nav
      aria-label="Karama"
      className="rail flex h-14 items-center justify-between bg-net px-6 text-bg lg:fixed lg:inset-y-0 lg:left-0 lg:z-10 lg:h-auto lg:w-16 lg:flex-col lg:px-0 lg:py-6 print:hidden"
    >
      <a href="./" className={`font-display text-24 font-semibold ${vertical}`}>
        Karama
      </a>
      <div className="flex items-center gap-5 lg:flex-col">
        <a href="#baremes" className={`flex min-h-11 items-center font-medium underline underline-offset-4 ${vertical}`}>
          Sources
        </a>
        <button
          type="button"
          onClick={toggle}
          aria-pressed={dark}
          aria-label="Thème sombre"
          title={dark ? 'Passer au thème clair' : 'Passer au thème sombre'}
          className="flex h-11 w-11 items-center justify-center rounded border-[1.5px] border-current"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
            <circle cx="9" cy="9" r="7.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <path d="M9 1.75a7.25 7.25 0 0 1 0 14.5z" fill="currentColor" />
          </svg>
        </button>
      </div>
    </nav>
  )
}
