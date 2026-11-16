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
    'h-11 w-11 text-20 transition-colors duration-150 hover:bg-ink hover:text-bg disabled:cursor-not-allowed disabled:text-muted/50 disabled:hover:bg-transparent disabled:hover:text-muted/50'
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-16 font-medium">{label}</span>
      <div role="group" aria-label={label} className="flex items-center rounded border border-ink bg-surface">
        <button
          type="button"
          className={`${button} rounded-l-[5px]`}
          aria-label={decrementLabel}
          disabled={value <= min}
          onClick={() => onChange(value - 1)}
        >
          {MINUS}
        </button>
        <output className="figure w-11 border-x border-ink text-center text-16 leading-[44px] font-semibold" aria-live="polite">
          {value}
        </output>
        <button
          type="button"
          className={`${button} rounded-r-[5px]`}
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

/** Two-state switch. */
export function Switch({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex min-h-11 w-full items-center justify-between gap-4 text-left"
    >
      <span className="text-16 font-medium">{label}</span>
      <span
        className={`relative h-6 w-11 shrink-0 rounded border transition-colors duration-150 ${checked ? 'border-ink bg-ink' : 'border-ink bg-surface'}`}
      >
        <span
          className={`absolute top-[3px] left-[3px] h-4 w-4 rounded-[3px] transition-transform duration-150 ${checked ? 'translate-x-5 bg-bg' : 'bg-ink'}`}
        />
      </span>
    </button>
  )
}

/** Underlined tabs, navigable with the arrow keys. */
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
    <div role="tablist" aria-label={label} className="inline-flex rounded border-[1.5px] border-ink p-0.5">
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
          className={`min-h-10 rounded-[3px] px-4 text-16 font-medium transition-colors duration-150 ${tab.id === active ? 'bg-ink text-bg' : 'hover:bg-line'}`}
        >
          {tab.name}
        </button>
      ))}
    </div>
  )
}
