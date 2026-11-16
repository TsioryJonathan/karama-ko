import { BrandLogo } from '../components/BrandLogo'
import { useEffect, useState } from 'react'
import { compute, SCALE } from '../engine/compute'
import { inverse } from '../engine/inverse'
import { loadInitial } from '../lib/state'
import { formatAr } from '../lib/format'
import { NumberField } from './Fields'

export default function Widget() {
  const [initial] = useState(loadInitial)
  const [amount, setAmount] = useState(Math.min(initial.amount ?? 1_000_000, 1_000_000_000))
  const [mode, setMode] = useState(initial.mode)
  const [dependants, setDependants] = useState(initial.dependants)
  useEffect(() => {
    document.documentElement.dataset.theme =
      new URLSearchParams(location.search).get('theme') === 'dark' ? 'dark' : 'light'
  }, [])
  const r = compute(mode === 'gross' ? amount : inverse(amount, dependants), dependants)
  return (
    <main className="salary-widget">
      <a
        href={location.pathname}
        target="_blank"
        rel="noreferrer"
        className="font-display text-28 font-extrabold"
      >
        <BrandLogo />
      </a>
      <p className="text-muted">Votre salaire à Madagascar</p>
      <div className="studio-actions my-4">
        <button
          className={`btn ${mode === 'gross' ? 'btn-solid' : 'btn-outline'}`}
          aria-pressed={mode === 'gross'}
          onClick={() => setMode('gross')}
        >
          Brut → net
        </button>
        <button
          className={`btn ${mode === 'net' ? 'btn-solid' : 'btn-outline'}`}
          aria-pressed={mode === 'net'}
          onClick={() => setMode('net')}
        >
          Net → brut
        </button>
      </div>
      <NumberField
        label={mode === 'gross' ? 'Brut mensuel' : 'Net mensuel souhaité'}
        value={amount}
        onChange={setAmount}
      />
      <NumberField label="Personnes à charge" max={6} suffix="" value={dependants} onChange={setDependants} />
      <div className="widget-answer" role="status">
        {mode === 'gross' ? 'Net estimé' : 'Brut à demander'}
        <strong>{formatAr(mode === 'gross' ? r.net : r.gross)}</strong>
      </div>
      {r.gross > 0 && r.gross < SCALE.minimumWage && (
        <p className="text-14 text-warning">
          Sous le SME à temps plein de {formatAr(SCALE.minimumWage)}.
        </p>
      )}
      <p className="text-14 text-muted mt-3">
        Estimation au barème d’octobre 2026, hors primes et avantages.{' '}
        <a className="underline" href={`${location.pathname}#baremes`} target="_blank" rel="noreferrer">
          Détail et sources
        </a>
      </p>
    </main>
  )
}
