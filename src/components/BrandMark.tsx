export type BrandState = 'mark' | 'loading' | 'empty' | 'success' | 'error' | 'offline'

/** Decorative: the surrounding status text always explains the state. */
export function BrandMark({ state = 'mark', size = 96 }: { state?: BrandState; size?: number }) {
  return (
    <img
      className="karama-mark"
      src={`/brand/karama-${state}.svg`}
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
      draggable={false}
    />
  )
}
