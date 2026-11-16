import { BAREME_2026, compute, type Bareme } from './compute'

/**
 * Net voulu → plus petit brut qui donne au moins ce net.
 *
 * Le net ne croît de façon certaine que par pas de 100 Ar de brut (les
 * cotisations s'arrondissent à l'ariary et la base à la centaine), donc la
 * dichotomie se fait sur les centaines, puis on affine à l'ariary près.
 */
export function inverse(netVise: number, charges = 0, bareme: Bareme = BAREME_2026): number {
  netVise = Math.max(0, Math.round(netVise))
  if (netVise === 0) return 0
  const net = (brut: number) => compute(brut, charges, bareme).net

  let bas = Math.floor(netVise / 100)
  let haut = Math.ceil((netVise * 2 + 10_000) / 100)
  while (bas < haut) {
    const milieu = Math.floor((bas + haut) / 2)
    if (net(milieu * 100) >= netVise) haut = milieu
    else bas = milieu + 1
  }

  const debut = Math.max(0, (bas - 1) * 100)
  for (let brut = debut; brut <= bas * 100; brut++) {
    if (net(brut) >= netVise) return brut
  }
  return bas * 100
}
