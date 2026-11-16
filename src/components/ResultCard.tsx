import type { ReactNode } from 'react'
import type { Result } from '../engine/compute'
import { NBSP, formatAr, formatDeduction, formatNumber, formatPercent, formatRate } from '../lib/format'
import type { Mode, View } from '../lib/state'
import { Breakdown } from './Breakdown'
import { Tabs } from './Controls'
import { ShareActions } from './ShareActions'
import { useCountUp } from './useCountUp'

const EMPTY = '—'

/** Approximate width of the net figure in ems, so it always fits the card. */
function widthInEm(n: number): number {
  const digits = String(Math.abs(n)).length
  return digits * 0.62 + Math.floor((digits - 1) / 3) * 0.28 + 1.3
}

/** Payslip line: label, dotted leader, amount. */
function Row({ label, value, strong }: { label: ReactNode; value: string; strong?: boolean }) {
  return (
    <div className={`flex items-baseline gap-2 py-1.5 ${strong ? 'font-semibold' : ''}`}>
      <dt className={strong ? '' : 'text-muted'}>{label}</dt>
      <span className="leader" aria-hidden="true" />
      <dd className="figure font-medium">{value}</dd>
    </div>
  )
}

/** The answer first, then the lines that explain it. */
export function ResultCard({
  result: r,
  mode,
  view,
  onViewChange,
}: {
  result: Result | null
  /** In net mode the headline is the gross to ask for. */
  mode: Mode
  view: View
  onViewChange: (view: View) => void
}) {
  const headline = mode === 'net' ? (r?.gross ?? 0) : (r?.net ?? 0)
  const shown = useCountUp(headline)
  const title = mode === 'net' ? 'Salaire brut à demander' : 'Salaire net par mois'
  const share = (id: string) => r?.contributions.find((c) => c.id === id)
  const segments = [
    { name: 'Net', amount: r?.net ?? 0, color: 'bg-net' },
    { name: 'IRSA', amount: r?.irsa ?? 0, color: 'bg-ink' },
    { name: 'CNaPS', amount: share('cnaps')?.employee ?? 0, color: 'bg-muted' },
    { name: 'OSTIE', amount: share('ostie')?.employee ?? 0, color: 'bg-muted/50' },
  ]

  return (
    <section id="resultat" aria-label="Résultat" className="rounded-lg border border-line bg-surface p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <h2 className="font-ui text-16 font-medium text-muted">{title}</h2>
        <div className="print:hidden">
          <Tabs<View>
            label="Point de vue"
            tabs={[
              { id: 'employee', name: 'Salarié' },
              { id: 'employer', name: 'Employeur' },
            ]}
            active={view}
            onChange={onViewChange}
          />
        </div>
      </div>

      <div className="@container mt-3">
        <p
          className={`figure leading-[1.05] font-semibold tracking-[-0.02em] [--net-max:52px] lg:[--net-max:72px] ${mode === 'net' ? '' : 'text-net'}`}
          style={{ fontSize: `min(var(--net-max), ${(100 / widthInEm(headline)).toFixed(2)}cqw)` }}
          aria-hidden="true"
        >
          {r ? formatNumber(shown) : <span className="text-line">0</span>}
          <span className="text-[0.4em] font-medium tracking-normal">{NBSP}Ar</span>
        </p>
        {/* Screen readers get the settled value once, not every animation frame. */}
        <p className="sr-only" aria-live="polite" aria-atomic="true">
          {r ? `${title} : ${formatNumber(headline)} ariary` : ''}
        </p>
      </div>
      <p className="mt-2 text-muted">
        {r
          ? `${formatPercent(r.effectiveRate)} du brut part en impôt et cotisations.`
          : 'Saisissez un salaire pour voir le net.'}
      </p>

      <div className="mt-5 flex h-2.5 gap-0.5 overflow-hidden rounded-full" aria-hidden="true">
        {r ? (
          segments.map((s) => (
            <div
              key={s.name}
              className={`min-w-0.5 basis-0 transition-[flex-grow] duration-300 ease-out ${s.color}`}
              style={{ flexGrow: Math.max(s.amount, 0) }}
            />
          ))
        ) : (
          <div className="grow bg-line" />
        )}
      </div>

      <dl className="mt-4">
        <Row label="Salaire brut" value={r ? formatNumber(r.gross) : EMPTY} />
        {segments.slice(1).map((s) => (
          <Row
            key={s.name}
            label={
              <span className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${s.color}`} aria-hidden="true" />
                {s.name}
                {s.name === 'IRSA' ? ', impôt sur le salaire' : `, ${formatRate(1)}`}
              </span>
            }
            value={r ? formatDeduction(s.amount) : EMPTY}
          />
        ))}
        <div className="mt-1.5 border-t border-line pt-1.5">
          <Row
            strong
            label={
              <span className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-net" aria-hidden="true" />
                Salaire net
              </span>
            }
            value={r ? formatAr(r.net) : EMPTY}
          />
        </div>
      </dl>

      {r && view === 'employer' && (
        <section aria-label="Coût employeur" className="mt-5 border-t border-line pt-5">
          <h3 className="font-ui text-16 font-medium text-muted">Ce que le poste coûte à l’employeur</h3>
          <dl className="mt-2">
            <Row label="Salaire brut" value={formatNumber(r.gross)} />
            {r.contributions.map((c) => (
              <Row key={c.id} label={`${c.name}, ${formatRate(c.employerRate)}`} value={`+${formatNumber(c.employer)}`} />
            ))}
            <div className="mt-1.5 border-t border-line pt-1.5">
              <Row strong label="Coût total du poste" value={formatAr(r.employerCost)} />
            </div>
          </dl>
          {r.gross > r.ceiling && (
            <p className="mt-2 text-14 text-muted">Cotisations calculées sur le plafond de {formatAr(r.ceiling)}.</p>
          )}
        </section>
      )}

      {r && (
        <>
          <div className="mt-5 border-t border-line pt-2">
            <Breakdown result={r} />
          </div>
          <div className="mt-4">
            <ShareActions title={`Karama : ${formatAr(r.net)} net pour ${formatAr(r.gross)} brut`} />
          </div>
        </>
      )}
    </section>
  )
}
