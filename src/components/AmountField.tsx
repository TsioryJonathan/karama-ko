import { useId, useLayoutEffect, useRef } from 'react'
import { formatNumber } from '../lib/format'

interface Props {
  label: string
  value: number | null
  onChange: (value: number | null) => void
  /** Status message under the field. */
  hint?: string
  tone?: 'neutral' | 'warning'
  autoFocus?: boolean
}

const MAX_DIGITS = 10

/** Ariary amount field, formatted while typing. */
export function AmountField({ label, value, onChange, hint, tone = 'neutral', autoFocus }: Props) {
  const id = useId()
  const ref = useRef<HTMLInputElement>(null)
  /** Number of digits left of the caret, restored after formatting. */
  const caretDigits = useRef<number | null>(null)
  const text = value === null ? '' : formatNumber(value)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el || caretDigits.current === null) return
    let pos = 0
    for (let seen = 0; pos < text.length && seen < caretDigits.current; pos++) {
      if (/\d/.test(text[pos])) seen++
    }
    el.setSelectionRange(pos, pos)
    caretDigits.current = null
  }, [text])

  return (
    <div>
      <label htmlFor={id} className="block text-16 font-semibold">
        {label}
      </label>
      <div className="mt-2 flex items-baseline gap-3 rounded-lg border-2 border-ink bg-surface px-5 focus-within:outline-[3px] focus-within:outline-offset-2 focus-within:outline-accent">
        <input
          ref={ref}
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="1 000 000"
          autoFocus={autoFocus}
          value={text}
          aria-describedby={`${id}-hint`}
          onChange={(e) => {
            const raw = e.target.value
            const before = raw.slice(0, e.target.selectionStart ?? raw.length)
            const digits = raw.replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, MAX_DIGITS)
            caretDigits.current = before.replace(/\D/g, '').length
            onChange(digits === '' ? null : Number(digits))
          }}
          className="figure h-18 w-full min-w-0 bg-transparent text-40 font-semibold outline-none placeholder:text-control/45 lg:h-20"
        />
        <span className="text-20 font-medium text-muted">Ar</span>
      </div>
      <p
        id={`${id}-hint`}
        className={`mt-2 min-h-[21px] text-14 ${tone === 'warning' ? 'text-warning' : 'text-muted'}`}
        aria-live="polite"
      >
        {hint}
      </p>
    </div>
  )
}
