import { useId, useState } from 'react'
import type { Result } from '../engine/compute'
import { SCALE_2026 } from '../engine/compute'
import { NBSP, formatAr, formatDeduction, formatNumber, formatRate } from '../lib/format'

/** Collapsible step-by-step calculation, always expanded on paper. */
export function Breakdown({ result: r }: { result: Result }) {
  const [open, setOpen] = useState(false)
  const id = useId()
  const { minimumTax, reliefPerDependant, reliefThreshold } = SCALE_2026.irsa
  const share = (cid: string) => r.contributions.find((c) => c.id === cid)!
  const cnaps = share('cnaps')
  const ostie = share('ostie')
  const capNote = cnaps.capped ? `, plafonnée à ${formatAr(r.ceiling)} de salaire` : ''

  const steps: { label: string; note?: string; value: string; tone?: 'deduction' | 'net' }[] = [
    {
      label: `CNaPS, part salarié (${formatRate(cnaps.employeeRate)})`,
      note: `Retraite et prévoyance${capNote}.`,
      value: formatDeduction(cnaps.employee),
      tone: 'deduction',
    },
    {
      label: `OSTIE, part salarié (${formatRate(ostie.employeeRate)})`,
      note: `Médecine d’entreprise${capNote}.`,
      value: formatDeduction(ostie.employee),
      tone: 'deduction',
    },
    {
      label: 'Base imposable',
      note: 'Brut moins les deux cotisations, arrondi à la centaine inférieure.',
      value: formatNumber(r.taxableBase),
    },
    {
      label: 'IRSA selon le barème',
      note: 'Somme des tranches du tableau ci-dessous.',
      value: formatNumber(r.grossTax),
    },
    {
      label: 'Réduction pour personnes à charge',
      note:
        r.dependants === 0
          ? `${formatAr(reliefPerDependant)} par personne ; aucune déclarée.`
          : r.relief === 0
            ? `Réservée aux bases supérieures à ${formatAr(reliefThreshold)}.`
            : `${r.dependants}${NBSP}×${NBSP}${formatAr(reliefPerDependant)}.`,
      value: formatDeduction(r.relief),
    },
    {
      label: 'IRSA dû',
      note: r.minimumApplied
        ? `Relevé au minimum de perception de ${formatAr(minimumTax)}.`
        : `Au-dessus du minimum de perception de ${formatAr(minimumTax)}.`,
      value: formatDeduction(r.irsa),
      tone: 'deduction',
    },
    {
      label: 'Salaire net',
      note: 'Brut moins CNaPS, OSTIE et IRSA.',
      value: formatNumber(r.net),
      tone: 'net',
    },
  ]

  return (
    <section>
      <h3 className="text-20">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen(!open)}
          className="flex min-h-11 w-full items-center justify-between gap-4 text-left font-semibold print:hidden"
        >
          Détail du calcul
          <span className="text-16 font-normal underline underline-offset-4">{open ? 'Masquer' : 'Afficher'}</span>
        </button>
        <span className="hidden min-h-11 items-center font-medium print:flex">Détail du calcul</span>
      </h3>

      <div
        id={id}
        className={`grid transition-[grid-template-rows] duration-300 ease-out print:grid-rows-[1fr] ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
      >
        <div className={`overflow-hidden print:visible ${open ? '' : 'invisible'}`}>
          <div className="flex items-baseline justify-between gap-4 border-t border-line py-3">
            <span className="label">Salaire brut</span>
            <span className="mono text-16">{formatNumber(r.gross)}</span>
          </div>
          <ol>
            {steps.map((s, i) => (
              <li key={s.label} className="flex items-baseline gap-4 border-t border-line py-3">
                <span className="mono w-5 shrink-0 text-14 text-muted">{i + 1}</span>
                <span className="min-w-0 grow">
                  <span className="block font-medium">{s.label}</span>
                  {s.note && <span className="block text-14 text-muted">{s.note}</span>}
                </span>
                <span
                  className={`mono text-16 font-medium ${s.tone === 'deduction' ? 'text-deduction' : s.tone === 'net' ? 'text-net' : ''}`}
                >
                  {s.value}
                </span>
              </li>
            ))}
          </ol>
          <LiveScale result={r} />
        </div>
      </div>
    </section>
  )
}

/** Bracket table where reached brackets fill up. */
function LiveScale({ result: r }: { result: Result }) {
  return (
    <table className="mt-6 mb-2 w-full border-t border-ink text-16">
      <caption className="label pb-2 text-left">Barème IRSA, base de {formatAr(r.taxableBase)}</caption>
      <thead>
        <tr className="border-b border-line text-left text-muted">
          <th scope="col" className="py-2 font-normal">
            Tranche
          </th>
          <th scope="col" className="py-2 pr-4 text-right font-normal">
            Taux
          </th>
          <th scope="col" className="py-2 text-right font-normal">
            Impôt
          </th>
        </tr>
      </thead>
      <tbody>
        {r.brackets.map((b) => {
          const width = b.upTo === null ? b.amount : b.upTo - b.from
          const fill = width > 0 ? b.amount / width : 0
          return (
            <tr key={b.from} className={`border-b border-line ${b.reached ? '' : 'text-muted'}`}>
              <th scope="row" className="py-2 text-left font-normal">
                <span className="mono block text-16">
                  {b.upTo === null
                    ? `Plus de ${formatNumber(b.from)}`
                    : `${formatNumber(b.from === 0 ? 0 : b.from + 1)} à ${formatNumber(b.upTo)}`}
                </span>
                <span className="mt-2 block h-0.5 bg-line" aria-hidden="true">
                  <span
                    className="block h-full origin-left bg-ink transition-transform duration-300 ease-out"
                    style={{ transform: `scaleX(${fill})` }}
                  />
                </span>
              </th>
              <td className="mono py-2 pr-4 pl-4 text-right align-top">{formatRate(b.rate)}</td>
              <td className={`mono py-2 text-right align-top ${b.tax > 0 ? 'text-deduction' : ''}`}>
                {formatNumber(b.tax)}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
