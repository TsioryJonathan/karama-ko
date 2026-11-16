import type { ReactNode } from 'react'
import type { Panel } from './state'

export type ToolId = Panel | 'calculer'
export type ToolGroupId = 'salary' | 'team' | 'workspace'

export interface Tool {
  id: ToolId
  group: ToolGroupId
  title: string
  short: string
  /** One or two words, for the workshop tab strip. */
  tab: string
  text: string
  href: string
  /** What the visitor types in, and what comes out. */
  input: string
  output: string
}

export const TOOL_GROUPS: { id: ToolGroupId; title: string; short: string; text: string }[] = [
  {
    id: 'salary',
    title: 'Pour votre salaire',
    short: 'Votre salaire',
    text: 'Comprendre ce que vous touchez, comparer ce qu’on vous propose, préparer ce que vous demandez.',
  },
  {
    id: 'team',
    title: 'Pour une embauche ou une équipe',
    short: 'Embauche et équipe',
    text: 'Partir d’un budget employeur et savoir ce qu’il permet réellement de proposer.',
  },
  {
    id: 'workspace',
    title: 'Votre espace',
    short: 'Votre espace',
    text: 'Vos simulations restent sur cet appareil. Retrouvez-les, exportez-les, partagez-les.',
  },
]

export const TOOLS: Tool[] = [
  {
    id: 'calculer',
    group: 'salary',
    title: 'Calculer mon salaire',
    short: 'Calculer mon salaire',
    text: 'Du brut au net, ou du net au brut, avec le détail des retenues.',
    href: '#calculateur',
    tab: 'Calculer',
    input: 'Un salaire brut ou net et vos personnes à charge',
    output: 'Le net, l’IRSA tranche par tranche et le coût employeur',
  },
  {
    id: 'comparer',
    group: 'salary',
    title: 'Comparer des offres',
    short: 'Comparer des offres',
    text: 'Deux à quatre propositions, leurs écarts par mois et sur douze mois.',
    href: '#atelier/comparer',
    tab: 'Comparer',
    input: 'Deux à quatre salaires bruts',
    output: 'L’écart de net par mois et sur douze mois',
  },
  {
    id: 'negocier',
    group: 'salary',
    title: 'Préparer une négociation',
    short: 'Préparer une négociation',
    text: 'Le supplément net souhaité, traduit en salaire brut à demander.',
    href: '#atelier/negocier',
    tab: 'Négocier',
    input: 'Votre brut actuel et le net en plus que vous visez',
    output: 'Le brut exact à demander et ce qu’il coûte à l’employeur',
  },
  {
    id: 'explorer',
    group: 'salary',
    title: 'Explorer mon salaire',
    short: 'Explorer mon salaire',
    text: 'Faites varier le brut pour voir comment votre net évolue.',
    href: '#atelier/explorer',
    tab: 'Explorer',
    input: 'Un curseur de salaire brut',
    output: 'La courbe du net et la part prélevée à chaque niveau',
  },
  {
    id: 'fiche',
    group: 'salary',
    title: 'Comprendre ma fiche de paie',
    short: 'Comprendre ma fiche',
    text: 'Rapprochez vos montants des calculs, sans importer de document.',
    href: '#atelier/fiche',
    tab: 'Ma fiche',
    input: 'Les montants de votre fiche de paie',
    output: 'Les écarts, ligne par ligne, avec le calcul au barème',
  },
  {
    id: 'annee',
    group: 'salary',
    title: 'Projeter les douze prochains mois',
    short: 'Projection sur 12 mois',
    text: 'Une évolution mois par mois, au barème constant d’octobre 2026.',
    href: '#atelier/annee',
    tab: '12 mois',
    input: 'Un brut pour chacun des douze mois',
    output: 'Le net cumulé, l’IRSA et le coût sur l’année',
  },
  {
    id: 'fin',
    group: 'salary',
    title: 'Calculer une fin de contrat',
    short: 'Fin de contrat',
    tab: 'Fin de contrat',
    text: 'Préavis, indemnité de licenciement et congés non pris, à partir de votre dernier salaire.',
    href: '#atelier/fin',
    input: 'Votre dernier brut, votre ancienneté et le type de rupture',
    output: 'Ce que l’employeur doit verser : préavis, indemnité et congés',
  },
  {
    id: 'embaucher',
    group: 'team',
    title: 'Préparer une embauche',
    short: 'Préparer une embauche',
    text: 'Partez de votre budget employeur pour construire une proposition.',
    href: '#atelier/embaucher',
    tab: 'Embaucher',
    input: 'Votre budget mensuel total pour le poste',
    output: 'Le brut à proposer et le net que touchera la personne',
  },
  {
    id: 'equipe',
    group: 'team',
    title: 'Construire un budget d’équipe',
    short: 'Budget d’équipe',
    text: 'Réunissez les postes, les effectifs et leurs coûts mensuels.',
    href: '#atelier/equipe',
    tab: 'Équipe',
    input: 'Vos postes, leurs effectifs et leurs salaires',
    output: 'La masse salariale et le coût total par mois',
  },
  {
    id: 'sauvegardes',
    group: 'workspace',
    title: 'Retrouver mes simulations',
    short: 'Mes simulations',
    text: 'Enregistrer, rouvrir ou transférer votre atelier sur un autre appareil.',
    href: '#atelier/sauvegardes',
    tab: 'Simulations',
    input: 'Vos simulations en cours',
    output: 'Des sauvegardes locales, un export et un lien de partage',
  },
  {
    id: 'integrer',
    group: 'workspace',
    title: 'Intégrer Karama-Ko',
    short: 'Intégrer Karama-Ko',
    text: 'Un calculateur compact à ajouter à votre propre site.',
    href: '#atelier/integrer',
    tab: 'Intégrer',
    input: 'Un montant par défaut et un thème',
    output: 'Un code à coller dans votre site',
  },
]

/** One family: 24 px box, 1.5 px round strokes, no fills. */
const PATHS: Record<ToolId, ReactNode> = {
  calculer: (
    <>
      <path d="M4 8h14m0 0-3.5-3.5M18 8l-3.5 3.5" />
      <path d="M20 16H6m0 0 3.5-3.5M6 16l3.5 3.5" />
    </>
  ),
  comparer: (
    <>
      <rect x="4" y="9" width="6.5" height="11" rx="1" />
      <rect x="13.5" y="4" width="6.5" height="16" rx="1" />
    </>
  ),
  negocier: (
    <>
      <path d="M4 17l5.5-5.5 3.5 3.5L20 8" />
      <path d="M15 8h5v5" />
    </>
  ),
  explorer: (
    <>
      <path d="M4 12h5m6 0h5" />
      <circle cx="12" cy="12" r="3" />
      <path d="M4 5.5h10m4 0h2M4 18.5h2m4 0h10" />
    </>
  ),
  fiche: (
    <>
      <path d="M7 3.5h7l4 4V19a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 19V5a1.5 1.5 0 0 1 1-1.5Z" />
      <path d="M14 3.5v4h4M9 12h6M9 16h4" />
    </>
  ),
  annee: (
    <>
      <rect x="4" y="5.5" width="16" height="14.5" rx="1.5" />
      <path d="M4 10h16M8.5 3.5v4m7-4v4M8 14h2m4 0h2" />
    </>
  ),
  fin: (
    <>
      <path d="M13.5 3.5H7A1.5 1.5 0 0 0 5.5 5v14A1.5 1.5 0 0 0 7 20.5h10a1.5 1.5 0 0 0 1.5-1.5V8.5Z" />
      <path d="M13.5 3.5v5h5M9 14.5h6M9 17.5h3" />
    </>
  ),
  embaucher: (
    <>
      <circle cx="10" cy="8" r="3.5" />
      <path d="M3.5 20a6.5 6.5 0 0 1 11.2-4.5M18 14v6m-3-3h6" />
    </>
  ),
  equipe: (
    <>
      <circle cx="9" cy="8.5" r="3" />
      <path d="M3.5 19.5a5.5 5.5 0 0 1 11 0" />
      <path d="M15.5 5.8a3 3 0 0 1 0 5.4M17.5 14.6a5.5 5.5 0 0 1 3 4.9" />
    </>
  ),
  sauvegardes: <path d="M7 4h10a1 1 0 0 1 1 1v15l-6-4.2L6 20V5a1 1 0 0 1 1-1Z" />,
  integrer: <path d="m8.5 7.5-5 4.5 5 4.5m7-9 5 4.5-5 4.5M13.5 5l-3 14" />,
}

export function ToolIcon({ id, size = 24 }: { id: ToolId; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[id]}
    </svg>
  )
}

export function ArrowIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 10h12m0 0-4.5-4.5M16 10l-4.5 4.5" />
    </svg>
  )
}

const ACTIONS = {
  chat: <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h9A1.5 1.5 0 0 1 16 5.5v6a1.5 1.5 0 0 1-1.5 1.5H9l-3.5 3v-3h0A1.5 1.5 0 0 1 4 11.5Z" />,
  arrow: <path d="M4 10h12m0 0-4.5-4.5M16 10l-4.5 4.5" />,
  spark: (
    <>
      <path d="M9 3.5 10.6 8 15 9.5 10.6 11 9 15.5 7.4 11 3 9.5 7.4 8Z" />
      <path d="M15.5 2.5v3M14 4h3M15.5 14.5v3M14 16h3" />
    </>
  ),
  save: <path d="M6 3.5h8a1 1 0 0 1 1 1V17l-5-3.5L5 17V4.5a1 1 0 0 1 1-1Z" />,
  close: <path d="m5 5 10 10M15 5 5 15" />,
  plus: <path d="M10 4v12M4 10h12" />,
  trash: <path d="M4 6h12M8 6V4h4v2M6 6l.7 10h6.6L14 6M8.5 9v4.5M11.5 9v4.5" />,
  copy: (
    <>
      <rect x="7" y="7" width="9.5" height="9.5" rx="1.5" />
      <path d="M13 7V5a1.5 1.5 0 0 0-1.5-1.5H5A1.5 1.5 0 0 0 3.5 5v6.5A1.5 1.5 0 0 0 5 13h2" />
    </>
  ),
  send: <path d="M10 16V4m0 0L5 9m5-5 5 5" />,
  grid: (
    <>
      <rect x="3.5" y="3.5" width="5" height="5" rx="1" />
      <rect x="11.5" y="3.5" width="5" height="5" rx="1" />
      <rect x="3.5" y="11.5" width="5" height="5" rx="1" />
      <rect x="11.5" y="11.5" width="5" height="5" rx="1" />
    </>
  ),
  link: <path d="M8.5 11.5a3.5 3.5 0 0 0 5 0l2.5-2.5a3.5 3.5 0 0 0-5-5l-.8.8m1.3 3.7a3.5 3.5 0 0 0-5 0L4 11a3.5 3.5 0 0 0 5 5l.8-.8" />,
  table: (
    <>
      <rect x="3" y="4" width="14" height="12" rx="1.5" />
      <path d="M3 8.5h14M8 8.5V16" />
    </>
  ),
  print: (
    <>
      <path d="M6 7V3.5h8V7M6 14H4.5A1.5 1.5 0 0 1 3 12.5v-4A1.5 1.5 0 0 1 4.5 7h11A1.5 1.5 0 0 1 17 8.5v4a1.5 1.5 0 0 1-1.5 1.5H14" />
      <rect x="6" y="11.5" width="8" height="5" rx="0.5" />
    </>
  ),
}

export function ActionIcon({ id }: { id: keyof typeof ACTIONS }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ACTIONS[id]}
    </svg>
  )
}
