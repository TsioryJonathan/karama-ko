import { useId, useLayoutEffect, useRef } from 'react'
import { nombre } from '../lib/format'

interface Props {
  label: string
  valeur: number | null
  onChange: (valeur: number | null) => void
  /** Message d'état sous le champ. */
  aide?: string
  ton?: 'neutre' | 'alerte'
}

const MAX_CHIFFRES = 10

/** Champ de montant en Ariary, formaté pendant la frappe. */
export function Champ({ label, valeur, onChange, aide, ton = 'neutre' }: Props) {
  const id = useId()
  const ref = useRef<HTMLInputElement>(null)
  /** Nombre de chiffres à gauche du curseur, à restaurer après formatage. */
  const curseur = useRef<number | null>(null)
  const texte = valeur === null ? '' : nombre(valeur)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el || curseur.current === null) return
    let pos = 0
    for (let vus = 0; pos < texte.length && vus < curseur.current; pos++) {
      if (/\d/.test(texte[pos])) vus++
    }
    el.setSelectionRange(pos, pos)
    curseur.current = null
  }, [texte])

  return (
    <div>
      <label htmlFor={id} className="label block">
        {label}
      </label>
      <div className="mt-2 flex items-baseline gap-3 rounded border border-line bg-surface px-4 transition-colors duration-150 focus-within:border-ink">
        <input
          ref={ref}
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="0"
          value={texte}
          aria-describedby={aide ? `${id}-aide` : undefined}
          onChange={(e) => {
            const brut = e.target.value
            const avant = brut.slice(0, e.target.selectionStart ?? brut.length)
            const chiffres = brut.replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, MAX_CHIFFRES)
            curseur.current = avant.replace(/\D/g, '').length
            onChange(chiffres === '' ? null : Number(chiffres))
          }}
          className="chiffre h-18 w-full min-w-0 bg-transparent font-display text-32 font-medium tracking-[-0.02em] outline-none placeholder:text-line lg:h-22 lg:text-48"
        />
        <span className="font-display text-20 font-medium text-muted">Ar</span>
      </div>
      <p
        id={`${id}-aide`}
        className={`mt-2 min-h-[21px] text-14 ${ton === 'alerte' ? 'text-warning' : 'text-muted'}`}
        aria-live="polite"
      >
        {aide}
      </p>
    </div>
  )
}
