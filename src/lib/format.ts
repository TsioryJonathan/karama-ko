/**
 * Non-breaking space between thousands and before the unit. Clash Display has
 * no U+202F glyph, so we keep U+00A0 and let `.figure` tighten it.
 */
export const NBSP = ' '
export const MINUS = '−'

/** 876500 → "876 500" */
export function formatNumber(n: number): string {
  const s = Math.abs(Math.round(n))
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, NBSP)
  return n < 0 ? MINUS + s : s
}

/** 876500 → "876 500 Ar" */
export function formatAr(n: number): string {
  return `${formatNumber(n)}${NBSP}Ar`
}

/** A deduction always carries a true minus sign. */
export function formatDeduction(n: number): string {
  return n === 0 ? formatNumber(0) : MINUS + formatNumber(Math.abs(n))
}

/** 0.1235 → "12,35 %" */
export function formatPercent(ratio: number, decimals = 2): string {
  return `${(ratio * 100).toFixed(decimals).replace('.', ',')}${NBSP}%`
}

/** 5 → "5 %", 1.5 → "1,5 %" */
export function formatRate(rate: number): string {
  return `${rate.toString().replace('.', ',')}${NBSP}%`
}
