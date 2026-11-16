import { useId } from 'react'
import { MINUS } from '../lib/format'

/** Bounded − / + selector. */
export function Stepper({
  label,
  value,
  min,
  max,
  decrementLabel,
  incrementLabel,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  decrementLabel: string
  incrementLabel: string
  onChange: (v: number) => void
}) {
  const button =
    'h-11 w-11 rounded border border-control bg-surface text-20 transition-colors duration-150 hover:border-ink disabled:cursor-not-allowed disabled:border-line disabled:text-control/45'
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="label">{label}</span>
      <div role="group" aria-label={label} className="flex items-center gap-1">
        <button
          type="button"
          className={button}
          aria-label={decrementLabel}
          disabled={value <= min}
          onClick={() => onChange(value - 1)}
        >
          {MINUS}
        </button>
        <output className="figure w-10 text-center text-20 leading-[44px] font-bold" aria-live="polite">
          {value}
        </output>
        <button
          type="button"
          className={button}
          aria-label={incrementLabel}
          disabled={value >= max}
          onClick={() => onChange(value + 1)}
        >
          +
        </button>
      </div>
    </div>
  )
}

/** Segmented tabs, navigable with the arrow keys. */
export function Tabs<T extends string>({
  label,
  tabs,
  active,
  onChange,
}: {
  label: string
  tabs: { id: T; name: string }[]
  active: T
  onChange: (id: T) => void
}) {
  const base = useId()
  return (
    <div role="tablist" aria-label={label} className="inline-flex gap-1 rounded bg-raised p-1">
      {tabs.map((tab, i) => (
        <button
          key={tab.id}
          id={`${base}-${tab.id}`}
          type="button"
          role="tab"
          aria-selected={tab.id === active}
          tabIndex={tab.id === active ? 0 : -1}
          onClick={() => onChange(tab.id)}
          onKeyDown={(e) => {
            const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
            if (!step) return
            const next = tabs[(i + step + tabs.length) % tabs.length]
            onChange(next.id)
            document.getElementById(`${base}-${next.id}`)?.focus()
          }}
          className={`min-h-9 rounded-[4px] px-3 text-14 font-medium transition-colors duration-150 ${tab.id === active ? 'bg-surface' : 'text-muted hover:text-ink'}`}
        >
          {tab.name}
        </button>
      ))}
    </div>
  )
}
