import { useState } from 'react'
import { LEGAL_MONTHLY_HOURS, OVERTIME_EXEMPT_HOURS, hasExtras, NO_EXTRAS, type Extras } from '../engine/pay'
import { NumberField } from '../workspace/Fields'

/**
 * Everything the base salary does not say: bonuses, overtime and benefits in kind.
 * Closed by default so the common case stays one field; open as soon as something is filled.
 */
export function ExtrasPanel({
  extras,
  onChange,
  disabled,
}: {
  extras: Extras
  onChange: (extras: Extras) => void
  disabled: boolean
}) {
  const [open, setOpen] = useState(hasExtras(extras))
  const set = (patch: Partial<Extras>) => onChange({ ...extras, ...patch })
  return (
    <div className="extras">
      <button type="button" className="extras-toggle" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span>
          <strong>Primes, heures supplémentaires, avantages en nature</strong>
          <small>
            {disabled
              ? 'Disponible quand vous partez du salaire brut.'
              : hasExtras(extras)
                ? 'Ajoutés au calcul ci-dessous.'
                : 'Facultatif : ce que le salaire de base ne contient pas.'}
          </small>
        </span>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m4 6 4 4 4-4" />
        </svg>
      </button>
      {open && !disabled && (
        <div className="extras-body">
          <fieldset>
            <legend>Primes</legend>
            <NumberField label="Primes et gratifications du mois" value={extras.bonus} onChange={(bonus) => set({ bonus })} />
            <p className="extras-note">Imposables comme un salaire (CGI, art. 01.03.02), comme le treizième mois.</p>
          </fieldset>
          <fieldset>
            <legend>Heures supplémentaires</legend>
            <div className="extras-pair">
              <NumberField label="Premières heures" value={extras.hours1} max={300} suffix="h" onChange={(hours1) => set({ hours1 })} />
              <NumberField label="Majoration" value={extras.rate1} max={200} suffix="%" onChange={(rate1) => set({ rate1 })} />
            </div>
            <div className="extras-pair">
              <NumberField label="Heures suivantes" value={extras.hours2} max={300} suffix="h" onChange={(hours2) => set({ hours2 })} />
              <NumberField label="Majoration" value={extras.rate2} max={200} suffix="%" onChange={(rate2) => set({ rate2 })} />
            </div>
            <p className="extras-note">
              Heure normale = salaire de base ÷ {String(LEGAL_MONTHLY_HOURS).replace('.', ',')} h (Code du travail, art. 75). Les
              majorations sont fixées par décret et par convention : 30 % puis 50 % est l’usage courant, à
              adapter à votre cas. Jusqu’à {OVERTIME_EXEMPT_HOURS} heures, leur paiement est exonéré d’IRSA (CGI, art. 01.03.03, 9°).
            </p>
          </fieldset>
          <fieldset>
            <legend>Avantages en nature</legend>
            <NumberField label="Loyer réel du logement fourni" value={extras.housing} onChange={(housing) => set({ housing })} />
            <NumberField label="Coûts réels du véhicule (usage privé)" value={extras.vehicle} onChange={(vehicle) => set({ vehicle })} />
            <NumberField label="Coûts réels du téléphone" value={extras.phone} onChange={(phone) => set({ phone })} />
            <NumberField label="Autres avantages, à leur valeur réelle" value={extras.other} onChange={(other) => set({ other })} />
            <p className="extras-note">
              Valeur imposable (CGI, art. 01.03.08) : logement 50 % du loyer, au plus 25 % du salaire de base ; véhicule et téléphone 15 %
              des coûts ; le reste en totalité. Ils s’ajoutent à la base de l’IRSA, pas au net versé. Leur traitement pour la CNaPS et
              l’OSTIE n’est pas pris en compte.
            </p>
          </fieldset>
          {hasExtras(extras) && (
            <button type="button" className="studio-link" onClick={() => onChange({ ...NO_EXTRAS })}>
              Tout retirer
            </button>
          )}
        </div>
      )}
    </div>
  )
}
