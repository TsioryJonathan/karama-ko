import { compute, SCALE, withRates } from './compute'
import { MAX_SALARY } from './planning'

/** What the visitor was doing when they asked. Unknown values are ignored, never forwarded. */
const TOOLS: Record<string, string> = {
  comparer: 'Comparer des offres : le visiteur compare plusieurs salaires bruts.',
  negocier: 'Préparer une négociation : le visiteur cherche le brut à demander pour gagner un net supplémentaire. Le premier scénario est sa situation actuelle, le second l’objectif.',
  explorer: 'Explorer mon salaire : le visiteur fait varier un salaire brut pour voir son net.',
  fiche: 'Comprendre ma fiche de paie : le visiteur rapproche sa fiche des calculs. Aucune fiche réelle n’est vérifiée.',
  calculer: 'Calculer mon salaire : le visiteur calcule un net à partir d’un brut, ou l’inverse.',
  fin: 'Fin de contrat : le visiteur estime ce que doit verser l’employeur à la rupture (préavis non effectué, indemnité de licenciement économique selon l’art. 28 du Code du travail, congés non pris). Le scénario est son dernier salaire brut ; les durées de préavis dépendent de la convention collective ou d’un décret.',
  equipe: 'Budget d’équipe : le visiteur additionne des postes ; chaque scénario est un poste (maximum quatre envoyés), son nom indique l’effectif.',
  annee: 'Projection sur 12 mois : le visiteur projette son salaire sur l’année ; les scénarios sont le premier et le dernier mois.',
  sauvegardes: 'Mes simulations : le visiteur gère ses simulations enregistrées ; le scénario est sa situation de référence.',
  integrer: 'Intégrer Karama-Ko : le visiteur prépare un calculateur à intégrer ; le scénario est le brut affiché au départ.',
  embaucher: 'Préparer une embauche : le visiteur part d’un budget employeur ; le scénario est le brut finançable.',
}

/** Never trust client-supplied results: validate inputs and recompute on the server. */
export function assistantContext(value: unknown) {
  if (!value || typeof value !== 'object') throw new Error('Demande invalide.')
  const body = value as { question?: unknown; scenarios?: unknown; tool?: unknown }
  if (typeof body.question !== 'string' || !body.question.trim() || body.question.length > 1200)
    throw new Error('La question doit contenir entre 1 et 1 200 caractères.')
  if (!Array.isArray(body.scenarios) || body.scenarios.length < 1 || body.scenarios.length > 4)
    throw new Error('Choisissez entre une et quatre simulations.')
  const scenarios = body.scenarios.map((v) => {
    if (!v || typeof v !== 'object') throw new Error('Simulation invalide.')
    const s = v as {
      name?: unknown
      gross?: unknown
      dependants?: unknown
      taxExempt?: unknown
      benefitsTaxable?: unknown
      ostieEmployee?: unknown
      ostieEmployer?: unknown
    }
    // Exempt overtime and taxable benefits are inputs of the calculation, not results: they are bounded here
    // and the whole payslip is recomputed on the server.
    const optional = (n: unknown, max: number) => n === undefined || (typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= max)
    if (!optional(s.taxExempt, typeof s.gross === 'number' ? s.gross : 0) || !optional(s.benefitsTaxable, MAX_SALARY))
      throw new Error('Heures supplémentaires exonérées ou avantages invalides.')
    // OSTIE rates in percent, as set in the simulation: bounded, then used on the scale in force.
    if (!optional(s.ostieEmployee, 100) || !optional(s.ostieEmployer, 100)) throw new Error('Taux OSTIE invalides.')
    const ostie = SCALE.contributions.find((c) => c.id === 'ostie')
    const scale = withRates(
      SCALE,
      'ostie',
      (s.ostieEmployee as number | undefined) ?? ostie?.employee ?? 0,
      (s.ostieEmployer as number | undefined) ?? ostie?.employer ?? 0,
    )
    if (
      typeof s.gross !== 'number' ||
      !Number.isInteger(s.gross) ||
      s.gross < 0 ||
      s.gross > MAX_SALARY ||
      typeof s.dependants !== 'number' ||
      !Number.isInteger(s.dependants) ||
      s.dependants < 0 ||
      s.dependants > 6 ||
      typeof s.name !== 'string' ||
      s.name.length > 80
    )
      throw new Error('Montants ou personnes à charge invalides.')
    return {
      name: s.name,
      ...compute(s.gross, s.dependants, scale, {
        taxExempt: s.taxExempt as number | undefined,
        benefitsTaxable: s.benefitsTaxable as number | undefined,
      }),
    }
  })
  const reference = scenarios[0]
  const comparisons = scenarios.map((s) => ({
    name: s.name,
    monthlyNetDifference: s.net - reference.net,
    twelveIdenticalMonthsNetDifference: (s.net - reference.net) * 12,
    grossDifference: s.gross - reference.gross,
    employerCostDifference: s.employerCost - reference.employerCost,
  }))
  const tool = typeof body.tool === 'string' && Object.hasOwn(TOOLS, body.tool) ? TOOLS[body.tool] : undefined
  return {
    question: body.question.trim(),
    ...(tool && { tool }),
    comparisons,
    effectiveFrom: SCALE.effectiveFrom,
    // Topic and reference are what the model can cite; the links only cost tokens.
    sources: SCALE.sources.map(({ topic, reference }) => ({ topic, reference })),
    scope:
      'Secteur privé non agricole. Le salaire brut peut inclure primes et heures supplémentaires ; taxExempt est la part des heures supplémentaires exonérée d’IRSA (déjà retirée de taxableBase) et benefitsTaxable la valeur imposable des avantages en nature (ajoutée à taxableBase). Minimum IRSA appliqué selon les hypothèses du moteur. Aucune fiche réelle vérifiée.',
    scenarios,
  }
}
