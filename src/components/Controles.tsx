import { useId, type ReactNode } from 'react'
import { MOINS } from '../lib/format'

/** Sélecteur − / + borné. */
export function Pas({
  label,
  valeur,
  min,
  max,
  onChange,
}: {
  label: string
  valeur: number
  min: number
  max: number
  onChange: (v: number) => void
}) {
  const bouton =
    'h-11 w-11 text-20 transition-colors duration-150 hover:bg-ink hover:text-bg disabled:text-line disabled:hover:bg-transparent disabled:hover:text-line disabled:cursor-not-allowed'
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="label">{label}</span>
      <div role="group" aria-label={label} className="flex items-center rounded border border-line bg-surface">
        <button
          type="button"
          className={`${bouton} rounded-l-[5px]`}
          aria-label="Une personne de moins"
          disabled={valeur <= min}
          onClick={() => onChange(valeur - 1)}
        >
          {MOINS}
        </button>
        <output className="chiffre w-11 border-x border-line text-center text-16 font-medium leading-[44px]" aria-live="polite">
          {valeur}
        </output>
        <button
          type="button"
          className={`${bouton} rounded-r-[5px]`}
          aria-label="Une personne de plus"
          disabled={valeur >= max}
          onClick={() => onChange(valeur + 1)}
        >
          +
        </button>
      </div>
    </div>
  )
}

/** Interrupteur à deux états. */
export function Interrupteur({
  label,
  actif,
  onChange,
}: {
  label: string
  actif: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={actif}
      onClick={() => onChange(!actif)}
      className="flex min-h-11 w-full items-center justify-between gap-4 text-left"
    >
      <span className="label">{label}</span>
      <span
        className={`relative h-6 w-11 shrink-0 rounded border transition-colors duration-150 ${actif ? 'border-ink bg-ink' : 'border-line bg-surface'}`}
      >
        <span
          className={`absolute top-[3px] left-[3px] h-4 w-4 rounded-[3px] transition-transform duration-150 ${actif ? 'translate-x-5 bg-bg' : 'bg-muted'}`}
        />
      </span>
    </button>
  )
}

/** Onglets soulignés, navigables aux flèches. */
export function Onglets<T extends string>({
  label,
  onglets,
  actif,
  onChange,
}: {
  label: string
  onglets: { id: T; nom: string }[]
  actif: T
  onChange: (id: T) => void
}) {
  const base = useId()
  return (
    <div role="tablist" aria-label={label} className="flex gap-6 border-b border-line">
      {onglets.map((o, i) => (
        <button
          key={o.id}
          id={`${base}-${o.id}`}
          type="button"
          role="tab"
          aria-selected={o.id === actif}
          tabIndex={o.id === actif ? 0 : -1}
          onClick={() => onChange(o.id)}
          onKeyDown={(e) => {
            const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
            if (!d) return
            const suivant = onglets[(i + d + onglets.length) % onglets.length]
            onChange(suivant.id)
            document.getElementById(`${base}-${suivant.id}`)?.focus()
          }}
          className={`-mb-px min-h-11 border-b-2 text-14 font-medium transition-colors duration-150 ${o.id === actif ? 'border-ink text-ink' : 'border-transparent text-muted hover:text-ink'}`}
        >
          {o.nom}
        </button>
      ))}
    </div>
  )
}

/** Case de la grille éditoriale : label en haut à gauche, contenu dessous. */
export function Case({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={`bg-surface p-4 lg:p-6 ${className}`}>
      <div className="label">{label}</div>
      {children}
    </div>
  )
}
