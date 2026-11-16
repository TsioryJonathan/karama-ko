import { useMemo } from 'react'
import { compute } from '../engine/compute'
import { formatAr, formatNumber } from '../lib/format'
import { NumberField } from './Fields'

const chartMax = (gross: number) => Math.max(5_000_000, Math.ceil(gross / 1_000_000) * 1_000_000)

/** The explored salary, as an exact field and as a slider. */
export function SalaryControls({
  gross,
  dependants,
  onChange,
}: {
  gross: number
  dependants: number
  onChange: (n: number) => void
}) {
  const result = compute(gross, dependants)
  return (
    <>
      <NumberField label="Salaire brut exploré" value={gross} onChange={onChange} />
      <div className="studio-field">
        <label htmlFor="salary-range">Ou faites glisser</label>
        <input
          id="salary-range"
          type="range"
          min="0"
          max={chartMax(gross)}
          step="10000"
          value={gross}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-valuetext={`${formatAr(gross)} brut, ${formatAr(result.net)} net`}
        />
      </div>
    </>
  )
}

export function SalaryChart({ gross, dependants }: { gross: number; dependants: number }) {
  const max = chartMax(gross)
  const points = useMemo(
    () =>
      Array.from({ length: 41 }, (_, i) => {
        const x = Math.round((max * i) / 40)
        return compute(x, dependants)
      }),
    [max, dependants],
  )
  const result = compute(gross, dependants)
  const path = points
    .map((p, i) => `${i ? 'L' : 'M'}${52 + (p.gross / max) * 554},${218 - (Math.max(0, p.net) / max) * 182}`)
    .join(' ')
  return (
    <figure className="salary-chart">
        <svg
          viewBox="0 0 640 260"
          role="img"
          aria-label={`Évolution du net selon le brut. Pour ${formatAr(gross)} brut : ${formatAr(result.net)} net.`}
        >
          {[0, 0.5, 1].map((v) => (
            <g key={v}>
              <line x1="52" x2="606" y1={218 - v * 182} y2={218 - v * 182} stroke="var(--line)" />
              <text x="44" y={222 - v * 182} textAnchor="end">
                {formatNumber(Math.round((max * v) / 1000))} k
              </text>
            </g>
          ))}
          <path d="M52,218 L606,36" fill="none" stroke="var(--control)" strokeDasharray="5 6" />
          <path d={path} fill="none" stroke="var(--accent)" strokeWidth="3" />
          <line
            x1={52 + (gross / max) * 554}
            x2={52 + (gross / max) * 554}
            y1="30"
            y2="218"
            stroke="var(--accent)"
            strokeDasharray="3 4"
          />
          <circle
            cx={52 + (gross / max) * 554}
            cy={218 - (Math.max(0, result.net) / max) * 182}
            r="5"
            fill="var(--accent)"
          />
          <text x="52" y="245">
            0 Ar brut
          </text>
          <text x="606" y="245" textAnchor="end">
            {formatAr(max)} brut
          </text>
        </svg>
        <figcaption>
          Trait bordeaux : salaire net. Pointillés gris : salaire brut. Les montants de l’axe vertical sont en
          milliers d’ariary.
        </figcaption>
    </figure>
  )
}
