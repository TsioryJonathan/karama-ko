import type { Result } from '../engine/compute'
import { formatAr, formatNumber, formatRate } from '../lib/format'
import { Cell } from './Controls'
import { useCountUp } from './useCountUp'

const PURPOSE: Record<string, string> = {
  cnaps: 'Retraite, accidents du travail, prestations familiales',
  ostie: 'Médecine d’entreprise',
  fmfp: 'Formation professionnelle',
}

/** Employer shares on top of the gross, and the total cost of the position. */
export function EmployerPanel({ result: r }: { result: Result }) {
  const cost = useCountUp(r.employerCost)
  return (
    <section aria-label="Coût employeur" className="grid gap-px border border-line bg-line lg:grid-cols-3">
      <Cell label="Coût total du poste" className="lg:col-span-2">
        <p className="figure mt-4 text-32 leading-[1.05] font-semibold tracking-[-0.02em] lg:text-48">
          {formatAr(cost)}
        </p>
        <p className="mt-4 text-14 text-muted">Par mois : salaire brut et cotisations patronales.</p>
      </Cell>
      <Cell label="Charges patronales">
        <p className="figure mt-2 text-24 leading-[1.05] font-semibold lg:mt-4 lg:text-32">
          {formatNumber(r.employerCharges)}
        </p>
        <p className="mt-2 text-14 text-muted lg:mt-4">
          {r.gross > r.ceiling
            ? `Calculées sur le plafond de ${formatAr(r.ceiling)}.`
            : 'Calculées sur la totalité du brut.'}
        </p>
      </Cell>

      <div className="bg-surface px-4 lg:col-span-3 lg:px-6">
        <table className="w-full text-16">
          <tbody>
            <tr className="border-b border-line">
              <th scope="row" className="py-3 text-left font-medium">
                Salaire brut
              </th>
              <td className="mono py-3 text-right">{formatNumber(r.gross)}</td>
            </tr>
            {r.contributions.map((c) => (
              <tr key={c.id} className="border-b border-line">
                <th scope="row" className="py-3 text-left font-normal">
                  <span className="font-medium">
                    {c.name}, part employeur ({formatRate(c.employerRate)})
                  </span>
                  <span className="block text-muted">{PURPOSE[c.id]}</span>
                </th>
                <td className="mono py-3 text-right align-top">+{formatNumber(c.employer)}</td>
              </tr>
            ))}
            <tr>
              <th scope="row" className="py-3 text-left font-medium">
                Coût total
              </th>
              <td className="mono py-3 text-right">{formatNumber(r.employerCost)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  )
}
