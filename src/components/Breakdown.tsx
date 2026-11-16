import { useId, useState } from 'react'
import type { Result } from '../engine/compute'
import { SCALE } from '../engine/compute'
import { NBSP, formatAr, formatDeduction, formatNumber, formatRate } from '../lib/format'

/** Collapsible step-by-step calculation, always expanded on paper. */
export function Breakdown({ result: r, headingLevel = 3 }: { result: Result; headingLevel?: 2 | 3 }) {
  const Heading = headingLevel === 2 ? 'h2' : 'h3'
  const [open, setOpen] = useState(false)
  const id = useId()
  const { minimumTax, reliefPerDependant, reliefThreshold } = SCALE.irsa
  const share = (cid: string) => r.contributions.find((c) => c.id === cid)!
  const cnaps = share('cnaps')
  const ostie = share('ostie')
  const capNote = cnaps.capped ? `, plafonnée à ${formatAr(r.ceiling)} de salaire` : ''
  const reached = r.brackets.filter((b) => b.reached).at(-1)

  type Line = { label: string; note: string; value: string; tone?: 'muted' | 'strong' }
  const social: Line[] = [
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
  ]
  const tax: Line[] = [
    ...(r.benefitsTaxable > 0
      ? [
          {
            label: 'Avantages en nature',
            note: 'Valeur imposable, ajoutée à la base : ils ne sont pas versés en argent.',
            value: `+${formatNumber(r.benefitsTaxable)}`,
            tone: 'muted' as const,
          },
        ]
      : []),
    ...(r.taxExempt > 0
      ? [
          {
            label: 'Heures supplémentaires exonérées',
            note: 'Jusqu’à 20 heures, leur paiement est retiré de la base de l’IRSA.',
            value: formatDeduction(r.taxExempt),
            tone: 'muted' as const,
          },
        ]
      : []),
    {
      label: 'Base imposable',
      note: 'Brut, avantages et exonérations pris en compte, moins les deux cotisations, arrondi à la centaine inférieure.',
      value: formatNumber(r.taxableBase),
      tone: 'muted',
    },
    {
      label: 'IRSA selon le barème',
      note: `Calculé par tranches, jusqu’à celle à ${formatRate(reached?.rate ?? 0)}.`,
      value: formatNumber(r.grossTax),
      tone: 'muted',
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
      tone: 'muted',
    },
    {
      label: 'IRSA dû',
      note: r.minimumApplied
        ? `Relevé au minimum de perception de ${formatAr(minimumTax)}.`
        : `Au-dessus du minimum de perception de ${formatAr(minimumTax)}.`,
      value: formatDeduction(r.irsa),
      tone: 'strong',
    },
  ]
  const group = (title: string, total: string, lines: Line[]) => (
    <section className="bd-group">
      <header>
        <h4>{title}</h4>
        <p>
          <span>Retenu</span>
          <strong className="figure">{total}</strong>
        </p>
      </header>
      <ul>
        {lines.map((line) => (
          <li key={line.label} data-tone={line.tone}>
            <span>
              <b>{line.label}</b>
              <small>{line.note}</small>
            </span>
            <span className="figure">{line.value}</span>
          </li>
        ))}
      </ul>
    </section>
  )

  return (
    <section>
      <Heading className="text-16">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen(!open)}
          className="flex min-h-12 w-full items-center justify-between gap-4 rounded border border-control px-4 text-left font-medium transition-colors duration-150 hover:border-ink print:hidden"
        >
          {open ? 'Masquer le détail du calcul' : 'Voir comment c’est calculé'}
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
      </Heading>

      <div
        id={id}
        className={`grid transition-[grid-template-rows] duration-300 ease-out print:grid-rows-[1fr] ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
      >
        <div className={`overflow-hidden print:visible ${open ? '' : 'invisible'}`}>
          <div className="bd">
            <div className="bd-start">
              <span>Salaire brut</span>
              <strong className="figure">{formatAr(r.gross)}</strong>
            </div>
            {group('1. Cotisations sociales', formatDeduction(r.socialDeductions), social)}
            {group('2. Impôt sur le revenu (IRSA)', formatDeduction(r.irsa), tax)}
            <div className="bd-net">
              <span>
                <b>3. Votre salaire net</b>
                <small>Brut moins cotisations et IRSA.</small>
              </span>
              <strong className="figure">{formatAr(r.net)}</strong>
            </div>
          </div>
          <p className="pt-1 pb-2 text-14 text-muted">
            Le barème complet et ses sources sont en bas de page.
          </p>
        </div>
      </div>
    </section>
  )
}
