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
  const reached = r.brackets.filter((b) => b.reached).at(-1)

  const steps: { label: string; note: string; value: string; total?: boolean }[] = [
    {
      label: `CNaPS, part salarié (${formatRate(cnaps.employeeRate)})`,
      note: `Retraite et prévoyance${capNote}.`,
      value: formatDeduction(cnaps.employee),
    },
    {
      label: `OSTIE, part salarié (${formatRate(ostie.employeeRate)})`,
      note: `Médecine d’entreprise${capNote}.`,
      value: formatDeduction(ostie.employee),
    },
    {
      label: 'Base imposable',
      note: 'Brut moins les deux cotisations, arrondi à la centaine inférieure.',
      value: formatNumber(r.taxableBase),
    },
    {
      label: 'IRSA selon le barème',
      note: `Calculé par tranches, jusqu’à celle à ${formatRate(reached?.rate ?? 0)}.`,
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
    },
    {
      label: 'Salaire net',
      note: 'Brut moins CNaPS, OSTIE et IRSA.',
      value: formatAr(r.net),
      total: true,
    },
  ]

  return (
    <section>
      <h3 className="text-16">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen(!open)}
          className="flex min-h-12 w-full items-center justify-between gap-4 rounded border border-control px-4 text-left font-medium transition-colors duration-150 hover:border-ink print:hidden"
        >
          {open ? 'Masquer le détail du calcul' : 'Voir le détail du calcul'}
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            aria-hidden="true"
            className={`transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
          >
            <path d="M3 6l5 5 5-5" />
          </svg>
        </button>
        <span className="hidden min-h-11 items-center font-bold print:flex">Détail du calcul</span>
      </h3>

      <div
        id={id}
        className={`grid transition-[grid-template-rows] duration-300 ease-out print:grid-rows-[1fr] ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
      >
        <div className={`overflow-hidden print:visible ${open ? '' : 'invisible'}`}>
          <div className="mt-3 flex items-baseline justify-between gap-4 py-3">
            <span className="font-medium">Salaire brut</span>
            <span className="figure font-medium">{formatNumber(r.gross)}</span>
          </div>
          <ol>
            {steps.map((s, i) => (
              <li key={s.label} className={`flex items-baseline gap-4 border-t py-3 ${s.total ? 'border-ink' : 'border-line'}`}>
                <span className="figure w-5 shrink-0 text-14 text-muted">{i + 1}</span>
                <span className="min-w-0 grow">
                  <span className={`block ${s.total ? 'font-bold' : 'font-medium'}`}>{s.label}</span>
                  <span className="block text-14 text-muted">{s.note}</span>
                </span>
                <span className={`figure ${s.total ? 'font-bold' : 'font-medium'}`}>{s.value}</span>
              </li>
            ))}
          </ol>
          <p className="pt-1 pb-2 text-14 text-muted">
            Le barème complet et ses sources sont en bas de page.
          </p>
        </div>
      </div>
    </section>
  )
}
