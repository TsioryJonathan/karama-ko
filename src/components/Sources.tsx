import { SCALE, contributionCeiling } from '../engine/compute'
import { formatAr, formatNumber, formatRate } from '../lib/format'
import { SCALE_HISTORY } from '../scales'

const date = (iso: string) =>
  new Date(iso)
    .toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    .replace(/^1 /, '1er ')

/** Scales in force, where they come from, and what the tool does not cover. */
export function Sources() {
  const s = SCALE
  let from = 0
  return (
    <section id="baremes" className="print:hidden">
      <div className="mx-auto grid max-w-page gap-x-16 gap-y-8 px-6 lg:px-10 pt-8 pb-28 lg:grid-cols-[340px_1fr] lg:pt-16 lg:pb-32">
        <div>
          <h2 className="text-28">Barèmes et sources</h2>
          <p className="mt-4 text-muted">
            Barème {s.year}, en vigueur depuis le {date(s.effectiveFrom)}. Vérifié le {date(s.updatedAt)}.
          </p>
          <p className="mt-4 rounded bg-raised p-4 text-16">
            Le résultat est une estimation. Les primes, les heures supplémentaires et les avantages en nature peuvent
            être ajoutés dans le calculateur ; les régimes particuliers, les conventions collectives et les accords
            d’entreprise ne sont pas pris en compte. Il ne remplace pas une fiche de paie.
          </p>
          <p className="mt-4 text-16 text-muted">
            Les calculs et sauvegardes se font dans votre navigateur. Seules les demandes d’explication IA que
            vous déclenchez transmettent les scénarios sélectionnés et votre question à un service d’IA via le serveur
            Karama.
          </p>
          <div className="scale-history">
            <h3 className="text-20 font-bold">Historique des barèmes</h3>
            <ul>
              {SCALE_HISTORY.map((entry) => (
                <li key={entry.date}>
                  <time dateTime={entry.date}>{date(entry.date)}</time> · <strong>{entry.title}</strong>
                  <p className="mt-1 text-16 text-muted">{entry.detail}</p>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-14 text-muted">
              Un nouveau barème est ajouté ici dès qu’il est vérifié sur les textes officiels, et entre en vigueur à sa date.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-lg bg-surface p-6 lg:p-8">
            <table className="w-full text-16">
              <caption className="pb-3 text-left font-bold">IRSA, base imposable mensuelle</caption>
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
          </div>

          <div className="rounded-lg bg-surface p-6 lg:p-8">
            <table className="w-full text-16">
              <caption className="pb-3 text-left font-bold">
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
          </div>

          <div className="rounded-lg bg-surface p-6 lg:p-8">
            <h3 className="text-16 font-bold">Sources</h3>
            <ul className="mt-3 text-16">
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
      </div>
    </section>
  )
}
