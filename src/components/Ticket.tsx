import type { ReactNode } from 'react'
import type { Result } from '../engine/compute'
import { NBSP, formatAr, formatDeduction, formatNumber, formatPercent, formatRate } from '../lib/format'
import type { View } from '../lib/state'
import { Breakdown } from './Breakdown'
import { Tabs } from './Controls'
import { ShareActions } from './ShareActions'
import { useCountUp } from './useCountUp'

const EMPTY = '—'

/** Approximate width of the net figure in ems, so it always fits its block. */
function widthInEm(n: number): number {
  const digits = String(Math.abs(n)).length
  return digits * 0.62 + Math.floor((digits - 1) / 3) * 0.28 + 1.3
}

/** Payslip line: label, dotted leader, amount. */
function Row({ label, value, tone, strong }: { label: ReactNode; value: string; tone?: 'deduction'; strong?: boolean }) {
  return (
    <div className={`flex items-baseline gap-2 py-2 ${strong ? 'font-semibold' : ''}`}>
      <dt>{label}</dt>
      <span className="leader" aria-hidden="true" />
      <dd className={`figure font-semibold ${tone === 'deduction' ? 'text-deduction' : ''}`}>{value}</dd>
    </div>
  )
}

const Perforation = () => <hr className="my-5 border-t-2 border-dashed border-line" />

/** The result as a paper receipt: net first, then every line that explains it. */
export function Ticket({
  result: r,
  view,
  onViewChange,
}: {
  result: Result | null
  view: View
  onViewChange: (view: View) => void
}) {
  const net = useCountUp(r?.net ?? 0)
  const cost = useCountUp(r?.employerCost ?? 0)
  const share = (id: string) => r?.contributions.find((c) => c.id === id)
  const segments = [
    { name: 'Net', amount: r?.net ?? 0, isNet: true },
    { name: 'IRSA', amount: r?.irsa ?? 0, isNet: false },
    { name: 'CNaPS', amount: share('cnaps')?.employee ?? 0, isNet: false },
    { name: 'OSTIE', amount: share('ostie')?.employee ?? 0, isNet: false },
  ]
  const gross = r?.gross || 1

  return (
    <article id="resultat" aria-label="Résultat" className="ticket-wrap mx-auto max-w-[600px]">
      <div className="ticket px-5 pt-6 lg:px-8 lg:pt-8">
        <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
          <h2 className="text-24">Fiche de simulation</h2>
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
        </header>

        <div className="@container mt-5 rounded bg-net p-5 text-bg lg:p-6">
          <p className="text-16 font-medium">Net à payer, par mois</p>
          <p
            className="figure mt-2 leading-[1.05] font-semibold tracking-[-0.02em] [--net-max:56px] lg:[--net-max:80px]"
            style={{ fontSize: `min(var(--net-max), ${(100 / widthInEm(r?.net ?? 0)).toFixed(2)}cqw)` }}
            aria-hidden="true"
          >
            {r ? formatNumber(net) : EMPTY}
            <span className="text-[0.4em] font-medium tracking-normal">{NBSP}Ar</span>
          </p>
          {/* Screen readers get the settled value once, not every animation frame. */}
          <p className="sr-only" aria-live="polite" aria-atomic="true">
            {r ? `Salaire net : ${formatNumber(r.net)} ariary` : 'Saisissez un montant pour voir le net.'}
          </p>
        </div>

        <dl className="mt-5">
          <Row label="Salaire brut" value={r ? formatNumber(r.gross) : EMPTY} />
          {(['cnaps', 'ostie'] as const).map((id) => (
            <Row
              key={id}
              label={`${share(id)?.name ?? id.toUpperCase()}, ${formatRate(share(id)?.employeeRate ?? 1)}`}
              value={r ? formatDeduction(share(id)!.employee) : EMPTY}
              tone="deduction"
            />
          ))}
          <Row label="IRSA, impôt sur le salaire" value={r ? formatDeduction(r.irsa) : EMPTY} tone="deduction" />
          <div className="mt-2 border-t-[1.5px] border-ink pt-1">
            <Row
              strong
              label={r ? `Total retenu, ${formatPercent(r.effectiveRate)} du brut` : 'Total retenu'}
              value={r ? formatDeduction(r.gross - r.net) : EMPTY}
              tone="deduction"
            />
          </div>
        </dl>

        <div className="mt-4 flex h-3 gap-0.5" aria-hidden="true">
          {r ? (
            segments.map((s) => (
              <div
                key={s.name}
                className={`min-w-0.5 basis-0 transition-[flex-grow] duration-300 ease-out ${s.isNet ? 'bg-net' : 'bg-deduction'}`}
                style={{ flexGrow: Math.max(s.amount, 0) }}
              />
            ))
          ) : (
            <div className="grow bg-line" />
          )}
        </div>
        <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-14">
          {segments.map((s) => (
            <li key={s.name} className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 ${s.isNet ? 'bg-net' : 'bg-deduction'}`} aria-hidden="true" />
              {s.name}
              <span className="figure text-muted">{r ? formatPercent(s.amount / gross, 1) : EMPTY}</span>
            </li>
          ))}
        </ul>

        {r && view === 'employer' && (
          <section aria-label="Coût employeur">
            <Perforation />
            <h3 className="text-20">Côté employeur</h3>
            <dl className="mt-2">
              <Row label="Salaire brut" value={formatNumber(r.gross)} />
              {r.contributions.map((c) => (
                <Row key={c.id} label={`${c.name}, ${formatRate(c.employerRate)}`} value={`+${formatNumber(c.employer)}`} />
              ))}
            </dl>
            <div className="mt-3 flex flex-wrap items-baseline justify-between gap-x-4 rounded border-[1.5px] border-ink px-4 py-3">
              <span className="font-medium">Coût total du poste</span>
              <span className="figure text-24 font-semibold lg:text-32">{formatAr(cost)}</span>
            </div>
            <p className="mt-2 text-14 text-muted">
              {r.gross > r.ceiling
                ? `Cotisations calculées sur le plafond de ${formatAr(r.ceiling)}.`
                : 'Cotisations calculées sur la totalité du brut.'}
            </p>
          </section>
        )}

        {r && (
          <>
            <Perforation />
            <Breakdown result={r} />
            <Perforation />
            <ShareActions title={`Karama : ${formatAr(r.net)} net pour ${formatAr(r.gross)} brut`} />
          </>
        )}

        <p className="mt-5 text-14 text-muted">
          Estimation, hors primes, heures supplémentaires et avantages en nature. Ne remplace pas une fiche de paie.
        </p>
        <div className="barcode mt-5 print:hidden" aria-hidden="true" />
      </div>
    </article>
  )
}
