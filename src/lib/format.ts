/** Espace fine insécable entre les milliers et devant l'unité. */
export const FINE = ' '
export const MOINS = '−'

/** 876500 → « 876 500 » */
export function nombre(n: number): string {
  const s = Math.abs(Math.round(n))
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, FINE)
  return n < 0 ? MOINS + s : s
}

/** 876500 → « 876 500 Ar » */
export function ar(n: number): string {
  return `${nombre(n)}${FINE}Ar`
}

/** Retenue : toujours précédée du vrai signe moins. */
export function retenue(n: number): string {
  return n === 0 ? nombre(0) : MOINS + nombre(Math.abs(n))
}

/** 0.1235 → « 12,35 % » */
export function pct(ratio: number, decimales = 2): string {
  return `${(ratio * 100).toFixed(decimales).replace('.', ',')}${FINE}%`
}

/** 5 → « 5 % », 1.5 → « 1,5 % » */
export function taux(t: number): string {
  return `${t.toString().replace('.', ',')}${FINE}%`
}
