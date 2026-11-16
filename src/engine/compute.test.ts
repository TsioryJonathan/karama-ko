import { describe, expect, it } from 'vitest'
import { BAREME_2026, compute, plafondAssiette } from './compute'
import { inverse } from './inverse'

const part = (r: ReturnType<typeof compute>, id: string) => r.cotisations.find((c) => c.id === id)!

describe('barème 2026', () => {
  it('plafonne l’assiette à 8 × SME, soit 2 520 000 Ar', () => {
    expect(plafondAssiette(BAREME_2026)).toBe(2_520_000)
  })
})

describe('cas de référence du PRD', () => {
  it('brut 1 000 000 Ar, 0 charge → net 876 500 Ar', () => {
    const r = compute(1_000_000, 0)
    expect(part(r, 'cnaps').salarie).toBe(10_000)
    expect(part(r, 'ostie').salarie).toBe(10_000)
    expect(r.baseImposable).toBe(980_000)
    expect(r.irsa).toBe(103_500)
    expect(r.net).toBe(876_500)
    expect((r.tauxEffectif * 100).toFixed(2)).toBe('12.35')
  })

  it('brut 1 000 000 Ar, 2 charges → net 880 500 Ar', () => {
    const r = compute(1_000_000, 2)
    expect(r.irsa).toBe(99_500)
    expect(r.net).toBe(880_500)
  })

  it('brut 5 000 000 Ar → cotisations plafonnées et tranche à 25 %', () => {
    const r = compute(5_000_000, 0)
    expect(part(r, 'cnaps').salarie).toBe(25_200)
    expect(part(r, 'ostie').salarie).toBe(25_200)
    expect(part(r, 'cnaps').plafonnee).toBe(true)
    expect(r.baseImposable).toBe(4_949_600)
    expect(r.tranches.at(-1)).toMatchObject({ taux: 25, assiette: 949_600, impot: 237_400 })
    expect(r.irsa).toBe(944_900)
    expect(r.net).toBe(4_004_700)
  })
})

describe('minimum de perception (art. 01.03.16)', () => {
  it('s’applique dans la tranche à 0 %', () => {
    const r = compute(315_000, 0)
    expect(r.irsaBrut).toBe(0)
    expect(r.irsa).toBe(3_000)
    expect(r.minimumApplique).toBe(true)
  })

  it('s’applique juste au-dessus de 350 000 Ar de base', () => {
    const r = compute(360_000, 0)
    expect(r.baseImposable).toBe(352_800)
    expect(r.irsaBrut).toBe(140)
    expect(r.irsa).toBe(3_000)
  })

  it('n’est pas entamé par la réduction pour charges', () => {
    const r = compute(450_000, 3)
    expect(r.irsaBrut).toBe(6_600)
    expect(r.reduction).toBe(6_000)
    expect(r.irsa).toBe(3_000)
  })

  it('un brut nul ne doit rien', () => {
    expect(compute(0).irsa).toBe(0)
    expect(compute(0).net).toBe(0)
  })
})

describe('réduction pour charges (art. 01.03.19)', () => {
  it('ne s’applique pas à une base de 350 000 Ar ou moins', () => {
    expect(compute(340_000, 4).reduction).toBe(0)
  })

  it('vaut 2 000 Ar par personne', () => {
    expect(compute(2_000_000, 0).irsa - compute(2_000_000, 5).irsa).toBe(10_000)
  })
})

describe('vue employeur', () => {
  it('brut 1 000 000 Ar → 13 % + 5 % + 1 % de charges patronales', () => {
    const r = compute(1_000_000)
    expect(part(r, 'cnaps').employeur).toBe(130_000)
    expect(part(r, 'ostie').employeur).toBe(50_000)
    expect(part(r, 'fmfp').employeur).toBe(10_000)
    expect(r.coutEmployeur).toBe(1_190_000)
  })

  it('les parts patronales sont plafonnées', () => {
    expect(compute(5_000_000).chargesPatronales).toBe(2_520_000 * 0.19)
  })
})

describe('propriétés', () => {
  it('le net ne baisse jamais quand le brut monte de 100 Ar', () => {
    for (const charges of [0, 3]) {
      let precedent = compute(BAREME_2026.sme, charges).net
      for (let brut = BAREME_2026.sme + 100; brut <= 6_000_000; brut += 100) {
        const net = compute(brut, charges).net
        expect(net, `brut ${brut}`).toBeGreaterThanOrEqual(precedent)
        precedent = net
      }
    }
  })

  it('inverse(net(brut)) retrouve le même net, à 100 Ar de brut près', () => {
    for (const charges of [0, 2]) {
      for (let brut = BAREME_2026.sme; brut <= 8_000_000; brut += 12_347) {
        const net = compute(brut, charges).net
        const retrouve = inverse(net, charges)
        expect(compute(retrouve, charges).net, `brut ${brut}`).toBe(net)
        expect(Math.abs(retrouve - brut), `brut ${brut}`).toBeLessThanOrEqual(100)
      }
    }
  })

  it('inverse vise un net rond : 1 500 000 Ar net', () => {
    const brut = inverse(1_500_000, 0)
    expect(compute(brut).net).toBeGreaterThanOrEqual(1_500_000)
    expect(compute(brut - 100).net).toBeLessThan(1_500_000)
  })
})
