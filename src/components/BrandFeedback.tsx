import type { ReactNode } from 'react'
import { BrandMark, type BrandState } from './BrandMark'

/** Status text carries the meaning; the animated mark reinforces it visually. */
export function BrandFeedback({
  state,
  children,
  className = '',
  role = state === 'error' ? 'alert' : 'status',
  visible = true,
  replayKey,
}: {
  state: BrandState
  children: ReactNode
  className?: string
  role?: 'alert' | 'status'
  visible?: boolean
  replayKey?: number
}) {
  return (
    <div role={role} className={`brand-feedback ${className}`} data-state={state} data-on={visible ? '' : undefined}>
      {visible && <BrandMark key={replayKey} state={state} size={64} />}
      <div>{children}</div>
    </div>
  )
}
