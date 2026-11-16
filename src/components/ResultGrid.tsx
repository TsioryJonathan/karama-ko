import type { Result } from '../engine/compute'
import { NBSP, formatDeduction, formatNumber, formatPercent } from '../lib/format'
import { Cell } from './Controls'
import { useCountUp } from './useCountUp'

const EMPTY = '—'

/** Approximate width of the net figure in Clash Display ems, so it fits its cell. */
function widthInEm(n: number): number {
  const digits = String(Math.abs(n)).length
  return digits * 0.66 + Math.floor((digits - 1) / 3) * 0.25 + 0.9
}

const employeeShare = (r: Result | null, id: string) => r?.contributions.find((c) => c.id === id)?.employee ?? 0

/** Editorial grid: one dominant cell for the net, quiet cells around it. */
export function ResultGrid({ result: r }: { result: Result | null }) {
  const net = useCountUp(r?.net ?? 0)
  const deductions = [
    { label: 'IRSA', amount: r?.irsa ?? 0 },
    { label: 'CNaPS', amount: employeeShare(r, 'cnaps') },
    { label: 'OSTIE', amount: employeeShare(r, 'ostie') },
  ]

  return (
    <section aria-label="Résultat" className="grid grid-cols-3 gap-px border border-line bg-line">
      <Cell label="Salaire net" className="col-span-3 lg:col-span-2">
        <div className="@container mt-6 lg:mt-10">
          <p
            className="figure font-display leading-[1.05] font-medium tracking-[-0.03em] text-net [--net-max:56px] lg:[--net-max:96px]"
            style={{ fontSize: `min(var(--net-max), ${(100 / widthInEm(r?.net ?? 0)).toFixed(2)}cqw)` }}
            aria-live="polite"
            aria-atomic="true"
          >
            {r ? (
              <>
                {formatNumber(net)}
                <span className="text-[0.4em] tracking-normal">{NBSP}Ar</span>
              </>
            ) : (
              <span className="text-line">{EMPTY}</span>
            )}
          </p>
        </div>
        <p className="mt-4 text-14 text-muted lg:mt-6">
          {r ? `Par mois, pour un brut de ${formatNumber(r.gross)}${NBSP}Ar.` : 'Saisissez un montant pour voir le net.'}
        </p>
      </Cell>

      <Cell label="Taux effectif" className="col-span-3 lg:col-span-1">
        <p className="figure mt-2 font-display text-32 leading-[1.05] font-medium lg:mt-10">
          {r ? formatPercent(r.effectiveRate) : <span className="text-line">{EMPTY}</span>}
        </p>
        <p className="mt-2 text-14 text-muted lg:mt-6">Part du brut retenue, impôt et cotisations.</p>
      </Cell>

      {deductions.map((d) => (
        <Cell key={d.label} label={d.label}>
          <p className="figure mt-2 text-20 font-medium text-deduction lg:text-24">
            {r ? formatDeduction(d.amount) : <span className="text-line">{EMPTY}</span>}
          </p>
        </Cell>
      ))}

      <Cell label="Répartition du brut" className="col-span-3">
        <SplitRibbon result={r} />
      </Cell>
    </section>
  )
}

/** 8 px bar showing where each Ariary of the gross goes. */
function SplitRibbon({ result: r }: { result: Result | null }) {
  const segments = [
    { name: 'Net', amount: r?.net ?? 0, isNet: true },
    { name: 'IRSA', amount: r?.irsa ?? 0, isNet: false },
    { name: 'CNaPS', amount: employeeShare(r, 'cnaps'), isNet: false },
    { name: 'OSTIE', amount: employeeShare(r, 'ostie'), isNet: false },
  ]
  const gross = r?.gross || 1

  return (
    <>
      <div className="mt-4 flex h-2 gap-0.5" aria-hidden="true">
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
      <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 lg:grid-cols-4">
        {segments.map((s) => (
          <div key={s.name} className="border-t border-line pt-2">
            <dt className="text-14 text-muted">{s.name}</dt>
            <dd className="figure flex items-baseline justify-between gap-2 text-14">
              <span className={`font-medium ${s.isNet ? 'text-net' : 'text-deduction'}`}>
                {r ? (s.isNet ? formatNumber(s.amount) : formatDeduction(s.amount)) : EMPTY}
              </span>
              <span className="text-muted">{r ? formatPercent(s.amount / gross, 1) : ''}</span>
            </dd>
          </div>
        ))}
      </dl>
    </>
  )
}
