import { useId, useLayoutEffect, useRef } from 'react'
import { formatNumber } from '../lib/format'

interface Props {
  label: string
  value: number | null
  onChange: (value: number | null) => void
  /** Status message under the field. */
  hint?: string
  tone?: 'neutral' | 'warning'
}

const MAX_DIGITS = 10

/** Ariary amount field, formatted while typing. */
export function AmountField({ label, value, onChange, hint, tone = 'neutral' }: Props) {
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
      <label htmlFor={id} className="label block">
        {label}
      </label>
      <div className="mt-2 flex items-baseline gap-3 rounded border border-ink bg-surface px-4 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ink">
        <input
          ref={ref}
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="0"
          value={text}
          aria-describedby={`${id}-hint`}
          onChange={(e) => {
            const raw = e.target.value
            const before = raw.slice(0, e.target.selectionStart ?? raw.length)
            const digits = raw.replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, MAX_DIGITS)
            caretDigits.current = before.replace(/\D/g, '').length
            onChange(digits === '' ? null : Number(digits))
          }}
          className="figure h-18 w-full min-w-0 bg-transparent text-32 font-semibold outline-none placeholder:text-muted/50 lg:h-20 lg:text-[40px]"
        />
        <span className="text-20 font-medium text-muted">Ar</span>
      </div>
      <p
        id={`${id}-hint`}
        className={`mt-2 min-h-6 text-16 ${tone === 'warning' ? 'text-warning' : 'text-muted'}`}
        aria-live="polite"
      >
        {hint}
      </p>
    </div>
  )
}
