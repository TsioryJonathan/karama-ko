import { SCALE_2026, type Result } from '../engine/compute'
import { NBSP, formatAr, formatDeduction, formatNumber, formatPercent, formatRate } from '../lib/format'
import type { Mode } from '../lib/state'
import { Breakdown } from './Breakdown'
import { ShareActions } from './ShareActions'
import { useCountUp } from './useCountUp'

const EMPTY = '—'
/** Employer lines shown before any amount is typed. */
const SCALE_ROWS = SCALE_2026.contributions

/** Approximate width of the headline figure in ems, so it always fits the card. */
function widthInEm(n: number): number {
  const digits = String(Math.abs(n)).length
  return digits * 0.62 + Math.floor((digits - 1) / 3) * 0.28 + 1.3
}

/** Ledger line: label on the left, amount on the right, one rule between lines. */
function Row({ label, dot, value, total }: { label: string; dot?: string; value: string; total?: boolean }) {
  return (
    <div
      className={`flex min-h-10 items-center justify-between gap-4 border-t ${total ? 'border-ink font-semibold' : 'border-line'}`}
    >
      <dt className="flex items-center gap-3">
        {dot && <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} aria-hidden="true" />}
        {label}
      </dt>
      <dd className={`figure ${total ? '' : 'font-medium'}`}>{value}</dd>
    </div>
  )
}

/** The answer first, then the lines that explain it. */
export function ResultCard({
  result: r,
  mode,
}: {
  result: Result | null
  /** In net mode the headline is the gross to ask for. */
  mode: Mode
}) {
  const headline = mode === 'net' ? (r?.gross ?? 0) : (r?.net ?? 0)
  const shown = useCountUp(headline)
  const title = mode === 'net' ? 'Salaire brut à demander' : 'Salaire net par mois'
  const share = (id: string) => r?.contributions.find((c) => c.id === id)
  const segments = [
    { name: 'Salaire net', amount: r?.net ?? 0, color: 'bg-accent' },
    { name: 'IRSA, impôt', amount: r?.irsa ?? 0, color: 'bg-ink' },
    { name: `CNaPS, ${formatRate(1)}`, amount: share('cnaps')?.employee ?? 0, color: 'bg-control' },
    { name: `OSTIE, ${formatRate(1)}`, amount: share('ostie')?.employee ?? 0, color: 'bg-control/45' },
  ]

  return (
    <section id="resultat" aria-label="Résultat" className="overflow-hidden rounded-lg bg-surface">
      {/* The answer sits on an inverted band: it is the one thing to read first. */}
      <div className="bg-ink px-6 py-6 text-bg lg:px-10 lg:py-7">
      <h2 className="text-16 font-medium text-bg/70">{title}</h2>

      <div className="@container mt-3">
        <p
          className="figure leading-none font-semibold tracking-[-0.03em] [--net-max:56px] lg:[--net-max:80px]"
          style={{ fontSize: `min(var(--net-max), ${(100 / widthInEm(headline)).toFixed(2)}cqw)` }}
          aria-hidden="true"
        >
          {r ? formatNumber(shown) : <span className="text-bg/30">0</span>}
          <span className="text-[0.35em] font-medium tracking-normal text-bg/70">{NBSP}Ar</span>
        </p>
        {/* Screen readers get the settled value once, not every animation frame. */}
        <p className="sr-only" aria-live="polite" aria-atomic="true">
          {r ? `${title} : ${formatNumber(headline)} ariary` : ''}
        </p>
      </div>
      <p className="mt-4 text-bg/70">
        {r ? (
          <>
            <strong className="font-semibold text-bg">{formatPercent(r.effectiveRate)}</strong> du brut part en impôt
            et cotisations.
          </>
        ) : (
          'Saisissez votre salaire pour voir le résultat.'
        )}
      </p>
      </div>

      <div className="px-6 py-6 lg:px-10 lg:py-7">
      <div className="flex h-2 gap-0.5" aria-hidden="true">
        {r ? (
          segments.map((s) => (
            <div
              key={s.name}
              className={`min-w-0.5 basis-0 transition-[flex-grow] duration-300 ease-out ${s.color}`}
              style={{ flexGrow: Math.max(s.amount, 0) }}
            />
          ))
        ) : (
          <div className="grow bg-raised" />
        )}
      </div>

      {/* Employee and employer sides sit next to each other, so nothing needs scrolling. */}
      <div className="mt-5 grid gap-x-10 gap-y-8 lg:grid-cols-2">
        <section aria-labelledby="employee-side">
          <h3 id="employee-side" className="mb-2 font-semibold">
            Pour le salarié
          </h3>
          <dl>
            <Row label="Salaire brut" value={r ? formatNumber(r.gross) : EMPTY} />
            {segments.slice(1).map((s) => (
              <Row key={s.name} label={s.name} dot={s.color} value={r ? formatDeduction(s.amount) : EMPTY} />
            ))}
            <Row total label="Net" dot="bg-accent" value={r ? formatAr(r.net) : EMPTY} />
          </dl>
        </section>

        <section aria-labelledby="employer-side">
          <h3 id="employer-side" className="mb-2 font-semibold">
            Pour l’employeur
          </h3>
          <dl>
            <Row label="Salaire brut" value={r ? formatNumber(r.gross) : EMPTY} />
            {SCALE_ROWS.map((c) => {
              const line = r?.contributions.find((x) => x.id === c.id)
              return (
                <Row
                  key={c.id}
                  label={`${c.name}, ${formatRate(c.employer)}`}
                  value={line ? `+${formatNumber(line.employer)}` : EMPTY}
                />
              )
            })}
            <Row total label="Coût" value={r ? formatAr(r.employerCost) : EMPTY} />
          </dl>
        </section>
      </div>
      {r && r.gross > r.ceiling && (
        <p className="mt-3 text-14 text-muted">Cotisations calculées sur le plafond de {formatAr(r.ceiling)}.</p>
      )}

      {r && (
        <div className="mt-5 space-y-3">
          <Breakdown result={r} />
          <ShareActions title={`Karama : ${formatAr(r.net)} net pour ${formatAr(r.gross)} brut`} />
        </div>
      )}
      </div>
    </section>
  )
}
