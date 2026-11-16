import bareme2026 from '../baremes/2026.json'

export interface Tranche {
  /** Borne haute de la tranche en Ariary, null pour la dernière. */
  jusqua: number | null
  /** Taux en pourcentage. */
  taux: number
}

export interface Cotisation {
  id: string
  nom: string
  /** Taux en pourcentage. */
  salarie: number
  employeur: number
}

export interface Bareme {
  annee: number
  enVigueurDepuis: string
  misAJour: string
  sme: number
  multiplePlafond: number
  irsa: {
    arrondiBase: number
    minimum: number
    reductionParCharge: number
    seuilReduction: number
    tranches: Tranche[]
  }
  cotisations: Cotisation[]
  sources: { sujet: string; reference: string; url: string }[]
}

export interface LigneCotisation {
  id: string
  nom: string
  tauxSalarie: number
  tauxEmployeur: number
  salarie: number
  employeur: number
  plafonnee: boolean
}

export interface LigneTranche {
  de: number
  jusqua: number | null
  taux: number
  /** Part de la base imposable qui tombe dans cette tranche. */
  assiette: number
  impot: number
  atteinte: boolean
}

export interface Resultat {
  brut: number
  charges: number
  plafond: number
  cotisations: LigneCotisation[]
  /** Somme des parts salariales. */
  retenuesSociales: number
  baseImposable: number
  tranches: LigneTranche[]
  irsaBrut: number
  reduction: number
  minimumApplique: boolean
  irsa: number
  net: number
  /** (brut − net) / brut, entre 0 et 1. */
  tauxEffectif: number
  chargesPatronales: number
  coutEmployeur: number
}

export const BAREME_2026 = bareme2026 as Bareme

export function plafondAssiette(bareme: Bareme): number {
  return bareme.sme * bareme.multiplePlafond
}

/** Brut mensuel (Ariary entiers) → détail complet de la paie. */
export function compute(brut: number, charges = 0, bareme: Bareme = BAREME_2026): Resultat {
  brut = Math.max(0, Math.round(brut))
  charges = Math.max(0, Math.floor(charges))
  const plafond = plafondAssiette(bareme)
  const assiette = Math.min(brut, plafond)

  const cotisations = bareme.cotisations.map<LigneCotisation>((c) => ({
    id: c.id,
    nom: c.nom,
    tauxSalarie: c.salarie,
    tauxEmployeur: c.employeur,
    salarie: Math.round((assiette * c.salarie) / 100),
    employeur: Math.round((assiette * c.employeur) / 100),
    plafonnee: brut > plafond,
  }))
  const retenuesSociales = cotisations.reduce((s, c) => s + c.salarie, 0)
  const chargesPatronales = cotisations.reduce((s, c) => s + c.employeur, 0)

  const { arrondiBase, minimum, reductionParCharge, seuilReduction } = bareme.irsa
  const baseImposable = Math.floor((brut - retenuesSociales) / arrondiBase) * arrondiBase

  let de = 0
  const tranches = bareme.irsa.tranches.map<LigneTranche>((t) => {
    const haut = t.jusqua ?? Infinity
    const part = Math.max(0, Math.min(baseImposable, haut) - de)
    const ligne: LigneTranche = {
      de,
      jusqua: t.jusqua,
      taux: t.taux,
      assiette: part,
      impot: Math.round((part * t.taux) / 100),
      atteinte: baseImposable > de,
    }
    de = haut
    return ligne
  })
  const irsaBrut = tranches.reduce((s, t) => s + t.impot, 0)

  // Art. 01.03.19 : réduction réservée aux bases supérieures au seuil.
  const reduction = baseImposable > seuilReduction ? charges * reductionParCharge : 0
  // Art. 01.03.16 : l'impôt ne peut être inférieur au minimum, quelle que soit la tranche.
  const plancher = brut > 0 ? minimum : 0
  const irsa = Math.max(irsaBrut - reduction, plancher)

  const net = brut - retenuesSociales - irsa
  return {
    brut,
    charges,
    plafond,
    cotisations,
    retenuesSociales,
    baseImposable,
    tranches,
    irsaBrut,
    reduction,
    minimumApplique: irsa > irsaBrut - reduction,
    irsa,
    net,
    tauxEffectif: brut > 0 ? (brut - net) / brut : 0,
    chargesPatronales,
    coutEmployeur: brut + chargesPatronales,
  }
}
