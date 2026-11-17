import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { formatAr, formatNumber } from '../lib/format'
import { MAX_SALARY } from '../engine/planning'

export function NumberField({
  label,
  value,
  onChange,
  max = MAX_SALARY,
  min = 0,
  suffix = 'Ar',
}: {
  label: string
  value: number
  onChange: (n: number) => void
  max?: number
  min?: number
  suffix?: string
}) {
  const id = useId()
  const input = useRef<HTMLInputElement>(null)
  const caret = useRef<number | null>(null)
  const text = formatNumber(value)
  useLayoutEffect(() => {
    if (!input.current || caret.current === null) return
    let position = 0
    for (let digits = 0; position < text.length && digits < caret.current; position++)
      if (/\d/.test(text[position])) digits++
    input.current.setSelectionRange(position, position)
    caret.current = null
  }, [text])
  return (
    <div className="studio-field">
      <label htmlFor={id}>{label}</label>
      <div className="studio-input-wrap">
        <input
          ref={input}
          id={id}
          type="text"
          inputMode="numeric"
          value={text}
          onChange={(e) => {
            const raw = e.currentTarget.value
            caret.current = raw
              .slice(0, e.currentTarget.selectionStart ?? raw.length)
              .replace(/\D/g, '').length
            const digits = raw.replace(/\D/g, '').slice(0, 10)
            onChange(Math.max(min, Math.min(max, Number(digits))))
          }}
        />
        <span>{suffix}</span>
      </div>
    </div>
  )
}
const decimalText = (n: number) => String(n).replace('.', ',')

/**
 * A number with up to two decimals, typed with a comma or a point: percentages and hours.
 * The text is kept while typing ("27," stays "27,") and tidied when the field is left.
 */
export function DecimalField({
  label,
  value,
  onChange,
  max = 100,
  suffix = '%',
}: {
  label: string
  value: number
  onChange: (n: number) => void
  max?: number
  suffix?: string
}) {
  const id = useId()
  const [text, setText] = useState(decimalText(value))
  // Follow the value when it changes from outside (reset, another simulation), not while it matches what is typed.
  useEffect(() => {
    if (Number(text.replace(',', '.') || 0) !== value) setText(decimalText(value))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])
  return (
    <div className="studio-field">
      <label htmlFor={id}>{label}</label>
      <div className="studio-input-wrap">
        <input
          id={id}
          type="text"
          inputMode="decimal"
          value={text}
          onBlur={() => setText(decimalText(value))}
          onChange={(e) => {
            const typed = e.currentTarget.value.replace(',', '.')
            if (!/^\d{0,6}\.?\d{0,2}$/.test(typed)) return
            const n = typed === '' || typed === '.' ? 0 : Number(typed)
            if (n > max) {
              setText(decimalText(max))
              onChange(max)
              return
            }
            setText(e.currentTarget.value.replace('.', ','))
            onChange(n)
          }}
        />
        <span>{suffix}</span>
      </div>
    </div>
  )
}
const DEPENDANT_LABELS = ['Aucune', '1 personne', '2 personnes', '3 personnes', '4 personnes', '5 personnes', '6 personnes']

/** Custom dropdown: a button that opens a listbox, fully usable with the keyboard. */
export function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string; hint?: string }[]
}) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const list = useRef<HTMLUListElement>(null)
  /** The list floats above the page, so no scrolling or clipped panel can hide it. */
  const [place, setPlace] = useState<CSSProperties>({})
  const selected = Math.max(0, options.findIndex((o) => o.value === value))
  const openList = () => {
    const box = trigger.current!.getBoundingClientRect()
    const needed = Math.min(280, options.length * 46 + 12)
    const below = innerHeight - box.bottom - 12
    const up = below < needed && box.top > below
    setPlace({
      left: box.left,
      width: box.width,
      maxHeight: Math.max(120, Math.min(280, up ? box.top - 12 : below)),
      ...(up ? { bottom: innerHeight - box.top + 6 } : { top: box.bottom + 6 }),
    })
    setActive(selected)
    setOpen(true)
  }
  const choose = (index: number) => {
    onChange(options[index].value)
    setOpen(false)
    trigger.current?.focus()
  }
  useEffect(() => {
    if (!open) return
    const outside = (event: PointerEvent) => {
      const target = event.target as Node
      if (!root.current?.contains(target) && !list.current?.contains(target)) setOpen(false)
    }
    const away = (event: Event) => {
      if (!list.current?.contains(event.target as Node)) setOpen(false)
    }
    addEventListener('pointerdown', outside)
    addEventListener('scroll', away, true)
    addEventListener('resize', away)
    return () => {
      removeEventListener('pointerdown', outside)
      removeEventListener('scroll', away, true)
      removeEventListener('resize', away)
    }
  }, [open])
  useEffect(() => {
    if (open) list.current?.querySelector<HTMLElement>('[data-active]')?.scrollIntoView({ block: 'nearest' })
  }, [open, active])
  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    const last = options.length - 1
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
        event.preventDefault()
        openList()
      }
      return
    }
    const moves: Record<string, number> = {
      ArrowDown: Math.min(last, active + 1),
      ArrowUp: Math.max(0, active - 1),
      Home: 0,
      End: last,
    }
    if (event.key in moves) {
      event.preventDefault()
      setActive(moves[event.key])
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      choose(active)
    } else if (event.key === 'Escape') {
      event.preventDefault()
      setOpen(false)
    } else if (event.key === 'Tab') setOpen(false)
  }
  return (
    <div className="studio-field" ref={root}>
      <span id={`${id}-label`}>{label}</span>
      <div className="select-wrap">
        <button
          ref={trigger}
          type="button"
          className="select-trigger"
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={`${id}-list`}
          aria-labelledby={`${id}-label ${id}-value`}
          aria-activedescendant={open ? `${id}-${active}` : undefined}
          onClick={() => (open ? setOpen(false) : openList())}
          onKeyDown={onKeyDown}
        >
          <span id={`${id}-value`}>{options[selected].label}</span>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m4 6 4 4 4-4" />
          </svg>
        </button>
        {open &&
          createPortal(
          <ul ref={list} id={`${id}-list`} className="select-list" style={place} role="listbox" aria-labelledby={`${id}-label`}>
            {options.map((option, i) => (
              <li
                key={option.value}
                id={`${id}-${i}`}
                role="option"
                aria-selected={i === selected}
                data-active={i === active || undefined}
                onPointerEnter={() => setActive(i)}
                onPointerDown={(event) => event.preventDefault()}
                onClick={() => choose(i)}
              >
                <span>
                  {option.label}
                  {option.hint && <small>{option.hint}</small>}
                </span>
                {i === selected && (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="m3.5 8.5 3 3 6-7" />
                  </svg>
                )}
              </li>
            ))}
          </ul>,
          document.body,
        )}
      </div>
    </div>
  )
}

/** Number of dependants, as a dropdown instead of a free number. */
export function DependantsField({
  label = 'Personnes à charge',
  value,
  onChange,
}: {
  label?: string
  value: number
  onChange: (n: number) => void
}) {
  return (
    <SelectField
      label={label}
      value={String(value)}
      onChange={(v) => onChange(Number(v))}
      options={DEPENDANT_LABELS.map((text, i) => ({ value: String(i), label: text }))}
    />
  )
}

export function TextField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (s: string) => void
}) {
  const id = useId()
  return (
    <div className="studio-field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        className="studio-input"
        maxLength={80}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}
export function Metric({
  label,
  value,
  detail,
  strong,
}: {
  label: string
  value: number
  detail?: string
  /** The figure to read first among its neighbours. */
  strong?: boolean
}) {
  return (
    <div className="studio-metric" data-strong={strong || undefined}>
      <dt>{label}</dt>
      <dd>{formatAr(value)}</dd>
      {detail && <dd className="studio-metric-detail">{detail}</dd>}
    </div>
  )
}
export function Notice({ children }: { children: ReactNode }) {
  return <p className="studio-notice">{children}</p>
}
export function Difference({ value, suffix = 'par mois' }: { value: number; suffix?: string }) {
  return (
    <span className="studio-difference">
      {value > 0 ? '+' : ''}
      {formatAr(value)} {suffix}
    </span>
  )
}
