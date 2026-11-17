import { useState } from 'react'
import { DEFAULT_OSTIE, DEFAULT_PREMIUM_RATES, LEGAL_MONTHLY_HOURS, OVERTIME_EXEMPT_HOURS, hasExtras, NO_EXTRAS, type Extras } from '../engine/pay'
import { DecimalField, NumberField, SelectField } from '../workspace/Fields'

/**
 * Everything the base salary does not say: bonuses, overtime and benefits in kind.
 * Closed by default so the common case stays one field; open as soon as something is filled.
 */
export function ExtrasPanel({
  extras: given,
  onChange,
  disabled,
}: {
  extras: Extras
  onChange: (extras: Extras) => void
  disabled: boolean
}) {
  // Links and saved simulations from before an option existed lack its key.
  const extras: Extras = { ...NO_EXTRAS, ...given }
  const [open, setOpen] = useState(hasExtras(extras))
  const set = (patch: Partial<Extras>) => onChange({ ...extras, ...patch })
  const executive = extras.cadre === 1
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
            <legend>Statut</legend>
            <SelectField
              label="Catégorie du poste"
              value={executive ? 'cadre' : 'employe'}
              onChange={(v) => set({ cadre: v === 'cadre' ? 1 : 0 })}
              options={[
                { value: 'employe', label: 'Employé, ouvrier, agent de maîtrise' },
                { value: 'cadre', label: 'Cadre ou hors catégorie', hint: 'Pas d’heures supplémentaires' },
              ]}
            />
          </fieldset>
          <fieldset>
            <legend>Primes</legend>
            <NumberField label="Primes et gratifications du mois" value={extras.bonus} onChange={(bonus) => set({ bonus })} />
            <p className="extras-note">Imposables comme un salaire (CGI, art. 01.03.02), comme le treizième mois.</p>
          </fieldset>
          <fieldset>
            <legend>Heures supplémentaires</legend>
            {executive ? (
              <p className="extras-note">
                Un cadre ou un salarié hors catégorie n’a en principe pas d’heures supplémentaires : elles ne sont pas comptées. Si votre
                contrat en prévoit, repassez sur « Employé ».
              </p>
            ) : (
              <>
                <div className="extras-pair">
                  <DecimalField label="Premières heures" value={extras.hours1} max={300} suffix="h" onChange={(hours1) => set({ hours1 })} />
                  <DecimalField label="Majoration" value={extras.rate1} max={200} onChange={(rate1) => set({ rate1 })} />
                </div>
                <div className="extras-pair">
                  <DecimalField label="Heures suivantes" value={extras.hours2} max={300} suffix="h" onChange={(hours2) => set({ hours2 })} />
                  <DecimalField label="Majoration" value={extras.rate2} max={200} onChange={(rate2) => set({ rate2 })} />
                </div>
                <p className="extras-note">
                  Heure normale = salaire de base ÷ {String(LEGAL_MONTHLY_HOURS).replace('.', ',')} h (Code du travail, art. 75). Les
                  majorations sont fixées par décret et par convention : 30 % puis 50 % est l’usage courant, à adapter à votre cas.
                  Jusqu’à {OVERTIME_EXEMPT_HOURS} heures, leur paiement est exonéré d’IRSA (CGI, art. 01.03.03, 9°).
                </p>
              </>
            )}
          </fieldset>
          <fieldset>
            <legend>Nuit, dimanche, jours fériés</legend>
            <div className="extras-pair">
              <DecimalField label="Heures de nuit" value={extras.nightHours} max={300} suffix="h" onChange={(nightHours) => set({ nightHours })} />
              <DecimalField label="Majoration" value={extras.nightRate} max={200} onChange={(nightRate) => set({ nightRate })} />
            </div>
            <div className="extras-pair">
              <DecimalField label="Heures le dimanche" value={extras.sundayHours} max={300} suffix="h" onChange={(sundayHours) => set({ sundayHours })} />
              <DecimalField label="Majoration" value={extras.sundayRate} max={200} onChange={(sundayRate) => set({ sundayRate })} />
            </div>
            <div className="extras-pair">
              <DecimalField label="Heures un jour férié" value={extras.holidayHours} max={300} suffix="h" onChange={(holidayHours) => set({ holidayHours })} />
              <DecimalField label="Majoration" value={extras.holidayRate} max={200} onChange={(holidayRate) => set({ holidayRate })} />
            </div>
            <p className="extras-note">
              Heures comprises dans votre horaire normal : seule la majoration s’ajoute au salaire. Minimum légal : nuit de 22 h à 5 h{' '}
              {DEFAULT_PREMIUM_RATES.night} % (50 % si elle est occasionnelle), dimanche de jour {DEFAULT_PREMIUM_RATES.sunday} %, jour
              férié {DEFAULT_PREMIUM_RATES.holiday} % (décret 68-172, art. 3, modifié par le décret 72-226). Ces majorations ne s’ajoutent pas
              entre elles. Pour des heures qui sont aussi des heures supplémentaires, additionnez les taux dans les lignes ci-dessus. Le 1er
              mai et le 14 octobre ont une indemnité à part, non calculée ici.
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
          <fieldset>
            <legend>OSTIE</legend>
            <div className="extras-pair">
              <DecimalField label="Part du salarié" value={extras.ostieEmployee} max={100} onChange={(ostieEmployee) => set({ ostieEmployee })} />
              <DecimalField label="Part de l’employeur" value={extras.ostieEmployer} max={100} onChange={(ostieEmployer) => set({ ostieEmployer })} />
            </div>
            <p className="extras-note">
              Taux du barème : {DEFAULT_OSTIE.employee} % et {DEFAULT_OSTIE.employer} %. Toutes les entreprises n’adhèrent pas à l’OSTIE :
              mettez 0 si la vôtre n’y cotise pas, ou le taux de votre contrat.
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
