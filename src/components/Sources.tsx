import { SCALE_2026, contributionCeiling } from '../engine/compute'
import { formatAr, formatNumber, formatRate } from '../lib/format'

const date = (iso: string) =>
  new Date(iso)
    .toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    .replace(/^1 /, '1er ')

/** Scales in force, where they come from, and what the tool does not cover. */
export function Sources() {
  const s = SCALE_2026
  let from = 0
  return (
    <section id="baremes" className="grid gap-x-6 print:hidden gap-y-8 border-t border-line py-12 lg:grid-cols-12 lg:py-24">
      <div className="lg:col-span-4">
        <h2 className="text-24 lg:text-32">Barèmes et sources</h2>
        <p className="mt-4 text-muted">
          Barème {s.year}, en vigueur depuis le {date(s.effectiveFrom)}. Vérifié le {date(s.updatedAt)}.
        </p>
        <p className="mt-4 border-l-2 border-warning pl-4 text-16 text-warning">
          Le résultat est une estimation. Il ne tient pas compte des primes, des heures supplémentaires ni des avantages
          en nature, et ne remplace pas une fiche de paie.
        </p>
        <p className="mt-4 text-16 text-muted">
          Le calcul se fait dans votre navigateur : aucun montant n’est envoyé ni enregistré sur un serveur.
        </p>
      </div>

      <div className="space-y-12 lg:col-span-8">
        <table className="w-full border-t border-ink text-16">
          <caption className="label pb-2 text-left">IRSA, base imposable mensuelle</caption>
          <tbody>
            {s.irsa.brackets.map((b) => {
              const low = from
              from = b.upTo ?? from
              return (
                <tr key={low} className="border-b border-line">
                  <th scope="row" className="mono py-2 text-left font-normal">
                    {b.upTo === null
                      ? `Plus de ${formatNumber(low)}`
                      : `${formatNumber(low === 0 ? 0 : low + 1)} à ${formatNumber(b.upTo)}`}
                  </th>
                  <td className="mono py-2 text-right">{formatRate(b.rate)}</td>
                </tr>
              )
            })}
            <tr className="border-b border-line">
              <th scope="row" className="py-2 text-left font-normal">
                Minimum de perception
              </th>
              <td className="mono py-2 text-right">{formatAr(s.irsa.minimumTax)}</td>
            </tr>
            <tr className="border-b border-line">
              <th scope="row" className="py-2 text-left font-normal">
                Réduction par personne à charge
              </th>
              <td className="mono py-2 text-right">{formatAr(s.irsa.reliefPerDependant)}</td>
            </tr>
          </tbody>
        </table>

        <table className="w-full border-t border-ink text-16">
          <caption className="label pb-2 text-left">
            Cotisations, plafonnées à {formatAr(contributionCeiling(s))} de salaire (8 × SME de{' '}
            {formatAr(s.minimumWage)})
          </caption>
          <thead>
            <tr className="border-b border-line text-muted">
              <th scope="col" className="py-2 text-left font-normal">
                Organisme
              </th>
              <th scope="col" className="py-2 text-right font-normal">
                Salarié
              </th>
              <th scope="col" className="py-2 text-right font-normal">
                Employeur
              </th>
            </tr>
          </thead>
          <tbody>
            {s.contributions.map((c) => (
              <tr key={c.id} className="border-b border-line">
                <th scope="row" className="py-2 text-left font-normal">
                  {c.name}
                </th>
                <td className="mono py-2 text-right">{formatRate(c.employee)}</td>
                <td className="mono py-2 text-right">{formatRate(c.employer)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div>
          <h3 className="label">Sources</h3>
          <ul className="mt-2 border-t border-ink text-16">
            {s.sources.map((src) => (
              <li key={src.topic} className="border-b border-line py-3">
                <span className="font-medium">{src.topic}</span>
                <a
                  href={src.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block text-muted underline decoration-line underline-offset-4 transition-colors duration-150 hover:text-ink hover:decoration-ink"
                >
                  {src.reference}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
