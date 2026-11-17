import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { compute, SCALE, type Result } from '../engine/compute'
import { annualProjection, negotiate, teamBudget } from '../engine/planning'
import type { Scenario } from '../engine/planning'
import { formatAr, formatPercent } from '../lib/format'
import { serialize } from '../lib/state'
import { Breakdown } from '../components/Breakdown'
import { BrandMark } from '../components/BrandMark'
import { BrandFeedback } from '../components/BrandFeedback'
import { DependantsField, NumberField, SelectField, TextField, Metric, Difference, Notice } from './Fields'
import { SalaryChart, SalaryControls } from './SalaryChart'
import { Assistant } from './Assistant'
import type { Intent } from '../engine/intent'
import { GrainField } from '../components/GrainField'
import { NO_EXTRAS, baseFromBudget, hasExtras, payslip, type Extras } from '../engine/pay'
import { ExtrasPanel } from '../components/ExtrasPanel'
import { endOfContract, SEVERANCE_CAP_MONTHS, SEVERANCE_DAYS_PER_YEAR, type EndInput } from '../engine/termination'
import { ScaleNotice } from '../components/ScaleNotice'
import { Menu, ToolBar } from './ToolBar'
import { track } from '../lib/track'
import { ActionIcon, ToolIcon } from './tools'
import {
  PANELS,
  DRAFT_KEY,
  SAVED_KEY,
  loadWorkspace,
  loadSaved,
  validWorkspace,
  decodeSharedWorkspace,
  shareUrl,
  downloadFile,
  csv,
  type Workspace,
  type Panel,
  type SavedPlan,
} from './state'

const MONTHS = [
  'Mois 1',
  'Mois 2',
  'Mois 3',
  'Mois 4',
  'Mois 5',
  'Mois 6',
  'Mois 7',
  'Mois 8',
  'Mois 9',
  'Mois 10',
  'Mois 11',
  'Mois 12',
]
/** Questions worth asking in each tool; the first one is asked when the visitor taps « Pourquoi ce résultat ? ». */
const SPECIFIC_QUESTIONS = {
  comparer: [
    'Pourquoi ces offres ont-elles ces écarts de net ?',
    'Quelle offre me laisse le plus de net, et pourquoi ?',
    'Que changent l’IRSA et les cotisations d’une offre à l’autre ?',
  ],
  negocier: [
    'Pourquoi dois-je demander ce brut pour obtenir ce net en plus ?',
    'Combien cela coûte-t-il en plus à mon employeur ?',
    'Comment présenter cette demande à mon employeur ?',
  ],
  explorer: [
    'Pourquoi mon net n’augmente-t-il pas autant que mon brut ?',
    'Pourquoi mon IRSA est-il à ce montant ?',
    'Que coûte ce salaire à l’employeur ?',
  ],
  fiche: [
    'Que peuvent expliquer les écarts entre ma fiche et le calcul ?',
    'Comment sont calculés la CNaPS et l’OSTIE ?',
    'Pourquoi mon IRSA est-il à ce montant ?',
  ],
  embaucher: [
    'Pourquoi le brut finançable est-il inférieur à mon budget ?',
    'Quelles cotisations patronales s’ajoutent au brut ?',
    'Que toucherait réellement la personne recrutée ?',
  ],
}

const GENERIC_QUESTIONS = [
  'Explique-moi les principales retenues de cette simulation.',
  'Pourquoi mon IRSA est-il à ce montant ?',
  'Que coûte ce salaire à l’employeur ?',
]
const QUESTIONS: Record<Panel, string[]> = {
  ...SPECIFIC_QUESTIONS,
  equipe: [
    'Pourquoi le coût de mon équipe dépasse-t-il la somme des salaires nets ?',
    'Quelles cotisations patronales s’ajoutent pour chaque poste ?',
    'Quel poste pèse le plus dans le budget, et pourquoi ?',
  ],
  annee: [
    'Pourquoi mon net change-t-il quand mon brut augmente en cours d’année ?',
    'Combien d’IRSA vais-je payer sur l’année ?',
    'Que coûte cette année de salaires à l’employeur ?',
  ],
  fin: [
    'Comment est calculée mon indemnité de licenciement ?',
    'Pourquoi mon préavis est-il payé à la place si je ne le fais pas ?',
    'Combien de congés payés ai-je acquis, et comment sont-ils indemnisés ?',
  ],
  sauvegardes: GENERIC_QUESTIONS,
  integrer: GENERIC_QUESTIONS,
}

const INTRO: Record<Panel, string> = {
  comparer: 'Mettez les montants côte à côte pour comprendre ce qu’une proposition change vraiment.',
  negocier: 'Partez du supplément net souhaité pour préparer une demande de salaire brut.',
  explorer: 'Voyez comment votre net évolue quand votre salaire brut change.',
  fiche: 'Rapprochez les lignes de votre fiche des montants calculés, puis explorez leur explication.',
  embaucher: 'Partez de votre budget total pour estimer le salaire que vous pouvez proposer.',
  equipe: 'Réunissez vos postes et leurs effectifs dans un budget mensuel commun.',
  annee: 'Faites varier le salaire d’un mois à l’autre, avec un barème constant.',
  fin: 'Estimez ce que l’employeur doit verser quand le contrat prend fin : préavis, indemnité et congés non pris.',
  sauvegardes: 'Retrouvez vos scénarios sur cet appareil, exportez-les ou reprenez votre travail.',
  integrer: 'Ajoutez une version compacte du calculateur à votre site.',
}

export default function Studio({ panel }: { panel: Panel }) {
  const [data, setData] = useState(loadWorkspace)
  const [saved, setSaved] = useState(loadSaved)
  const [name, setName] = useState('Ma simulation')
  const [status, setStatus] = useState<{ message: string; state: 'success' | 'error'; id: number } | null>(null)
  const notificationId = useRef(0)
  const notify = (message: string, state: 'success' | 'error' = 'success') => {
    setStatus({ message, state, id: ++notificationId.current })
  }
  const [invalidShare] = useState(
    () => !!location.hash.split('/')[2] && !decodeSharedWorkspace(location.hash),
  )
  const [storageError, setStorageError] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)
  const title = PANELS.find((p) => p.id === panel)!.label
  const base = data.scenarios[0]
  const pays = useMemo(() => data.scenarios.map((s) => payslip(s.gross, s.dependants, s.extras)), [data.scenarios])
  const results = useMemo(() => pays.map((p) => p.result), [pays])
  const [annualFill, setAnnualFill] = useState(base.gross)
  const [annualExtras, setAnnualExtras] = useState<Extras>(NO_EXTRAS)
  const [widgetGross, setWidgetGross] = useState(base.gross)
  const [widgetDark, setWidgetDark] = useState(false)
  const [end, setEnd] = useState<EndInput>({
    gross: base.gross,
    years: 3,
    kind: 'economic',
    noticeDays: 30,
    noticeWorked: false,
    leaveMonths: 6,
    leaveTaken: 0,
  })
  const [aiOpen, setAiOpen] = useState(false)
  const [ask, setAsk] = useState<{ id: number; question: string } | undefined>()
  const closeAi = useCallback(() => setAiOpen(false), [])
  const patch = (partial: Partial<Workspace>) => setData((d) => ({ ...d, ...partial }))
  const editScenario = (index: number, partial: Partial<Scenario>) =>
    patch({ scenarios: data.scenarios.map((s, i) => (i === index ? { ...s, ...partial } : s)) })
  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(data))
      setStorageError('')
    } catch {
      setStorageError('La sauvegarde locale est indisponible. Exportez votre simulation pour la conserver.')
    }
  }, [data])
  useEffect(() => {
    setStatus(null)
  }, [panel])
  useEffect(() => {
    if (!status) return
    const timer = setTimeout(() => setStatus(null), 5000)
    return () => clearTimeout(timer)
  }, [status])

  const save = () => {
    if (!name.trim()) {
      notify('Donnez un nom à votre simulation.', 'error')
      return
    }
    if (saved.length >= 30) {
      notify('Vous avez atteint 30 simulations. Supprimez-en une ou exportez vos données.', 'error')
      return
    }
    const entry: SavedPlan = {
      id: crypto.randomUUID(),
      name: name.trim(),
      savedAt: new Date().toISOString(),
      data: structuredClone(data),
    }
    const next = [entry, ...saved]
    try {
      localStorage.setItem(SAVED_KEY, JSON.stringify(next))
      setSaved(next)
      notify('Simulation enregistrée sur cet appareil.')
    } catch {
      notify('Impossible d’enregistrer. Exportez votre simulation pour la conserver.', 'error')
    }
  }
  const removeSaved = (id: string) => {
    const next = saved.filter((s) => s.id !== id)
    try {
      localStorage.setItem(SAVED_KEY, JSON.stringify(next))
      setSaved(next)
      notify('Simulation supprimée.')
    } catch {
      notify('Impossible de modifier les sauvegardes sur cet appareil.', 'error')
    }
  }
  const share = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl(panel, data))
      notify('Lien copié. Il contient les montants de cette simulation.')
      track('option', 'share')
    } catch {
      notify('Copie indisponible. Utilisez l’export JSON pour partager cette simulation.', 'error')
    }
  }
  const exportCsv = () => {
    let rows: (string | number)[][] = [
      [
        'Scénario',
        'Brut mensuel (Ar)',
        'Personnes à charge',
        'Net mensuel (Ar)',
        'IRSA (Ar)',
        'Coût employeur mensuel (Ar)',
      ],
      ...data.scenarios.map((s, i) => [
        s.name,
        s.gross,
        s.dependants,
        results[i].net,
        results[i].irsa,
        results[i].employerCost,
      ]),
    ]
    if (panel === 'annee')
      rows = [
        ['Période', 'Brut (Ar)', 'Net (Ar)', 'IRSA (Ar)', 'Coût employeur (Ar)'],
        ...data.months.map((m, i) => {
          const r = payslip(m.gross, m.dependants, m.extras).result
          return [MONTHS[i], r.gross, r.net, r.irsa, r.employerCost]
        }),
      ]
    if (panel === 'equipe')
      rows = [
        ['Poste', 'Effectif', 'Brut individuel (Ar)', 'Net individuel (Ar)', 'Coût total mensuel (Ar)'],
        ...data.roles.map((r) => [
          r.name,
          r.count,
          r.gross,
          payslip(r.gross, r.dependants, r.extras).result.net,
          payslip(r.gross, 0, r.extras).result.employerCost * r.count,
        ]),
      ]
    if (panel === 'negocier') {
      const r = negotiate(base.gross, data.extraNet, base.dependants)
      rows = [
        ['Situation', 'Brut (Ar)', 'Net (Ar)', 'Coût employeur (Ar)'],
        ['Actuelle', base.gross, results[0].net, results[0].employerCost],
        ['Objectif', r.gross, r.net, r.employerCost],
      ]
    }
    if (panel === 'embaucher') {
      const r = payslip(baseFromBudget(data.budget, data.hireExtras), base.dependants, data.hireExtras).result
      rows = [
        ['Budget (Ar)', 'Brut (Ar)', 'Net (Ar)', 'Coût réel (Ar)', 'Budget restant (Ar)'],
        [data.budget, r.gross, r.net, r.employerCost, data.budget - r.employerCost],
      ]
    }
    if (panel === 'explorer') {
      const r = compute(data.exploreGross, base.dependants)
      rows = [
        ['Brut (Ar)', 'Net (Ar)', 'IRSA (Ar)', 'Cotisations salarié (Ar)', 'Coût employeur (Ar)'],
        [r.gross, r.net, r.irsa, r.socialDeductions, r.employerCost],
      ]
    }
    if (panel === 'fiche') {
      const r = payslip(data.payslip.gross, data.payslip.dependants, data.payslip.extras).result
      rows = [
        ['Ligne', 'Saisi (Ar)', 'Simulé (Ar)', 'Écart (Ar)'],
        ...(['cnaps', 'ostie', 'irsa', 'net'] as const).map((k) => {
          const expected =
            k === 'cnaps' ? r.contributions[0].employee : k === 'ostie' ? r.contributions[1].employee : r[k]
          return [k.toUpperCase(), data.payslip[k], expected, data.payslip[k] - expected]
        }),
      ]
    }
    rows.push([
      'Hypothèse',
      'Barème constant depuis le ' +
        SCALE.effectiveFrom +
        '. Estimation hors primes, heures supplémentaires et avantages en nature.',
    ])
    downloadFile('karama-' + panel + '.csv', csv(rows), 'text/csv;charset=utf-8')
    notify('Export CSV téléchargé.')
  }
  /** The visitor asked for a change (« et si j'ai 20 h de suppl ») : the form is filled in, the engine answers. */
  const applyIntent = (intent: Intent): string | null => {
    if (panel !== 'fiche') return null
    const current = data.payslip
    const before = payslip(current.gross, current.dependants, current.extras ?? NO_EXTRAS)
    const extras = { ...(current.extras ?? NO_EXTRAS) }
    if (intent.hours !== undefined) extras.hours1 = intent.hours
    if (intent.bonus !== undefined) extras.bonus = intent.bonus
    const gross = intent.gross ?? current.gross
    const dependants = intent.dependants ?? current.dependants
    const after = payslip(gross, dependants, extras)
    patch({ payslip: { ...data.payslip, gross, dependants, extras } })
    const done = [
      intent.hours !== undefined && `**${intent.hours} h supplémentaires** (majoration de ${extras.rate1} %)`,
      intent.bonus !== undefined && `une prime de **${formatAr(intent.bonus)}**`,
      intent.dependants !== undefined && `**${intent.dependants} personne${intent.dependants > 1 ? 's' : ''} à charge**`,
      intent.gross !== undefined && `un brut de **${formatAr(intent.gross)}**`,
    ].filter(Boolean)
    const gain = after.result.net - before.result.net
    return [
      `C’est renseigné dans le formulaire : ${done.join(', ')}.`,
      `- Net avant : ${formatAr(before.result.net)}`,
      `- **Net après : ${formatAr(after.result.net)}** (${gain >= 0 ? '+' : '−'}${formatAr(Math.abs(gain))})`,
      `- Brut avec ces éléments : ${formatAr(after.gross)}`,
      intent.hours !== undefined
        ? 'Les 20 premières heures supplémentaires sont exonérées d’IRSA. Vous pouvez ajuster les majorations dans « Primes, heures supplémentaires, avantages ».'
        : '',
    ]
      .filter(Boolean)
      .join('\n')
  }
  let aiScenarios: Scenario[] = data.scenarios
  if (panel === 'fiche')
    aiScenarios = [
      {
        id: 'payslip',
        name: 'Simulation de la fiche saisie',
        gross: data.payslip.gross,
        dependants: data.payslip.dependants,
        extras: data.payslip.extras,
      },
    ]
  if (panel === 'explorer') aiScenarios = [{ ...base, name: 'Salaire exploré', gross: data.exploreGross }]
  if (panel === 'equipe')
    aiScenarios = data.roles
      .slice(0, 4)
      .map((role) => ({ ...role, name: `${role.name || 'Poste'} (${role.count} ${role.count > 1 ? 'personnes' : 'personne'})` }))
  if (panel === 'annee') {
    const first = data.months[0]
    const last = data.months[11]
    aiScenarios = [
      { id: 'm1', name: 'Mois 1', gross: first.gross, dependants: first.dependants, extras: first.extras },
      ...(last.gross !== first.gross || last.dependants !== first.dependants
        ? [{ id: 'm12', name: 'Mois 12', gross: last.gross, dependants: last.dependants, extras: last.extras }]
        : []),
    ]
  }
  if (panel === 'fin') aiScenarios = [{ ...base, name: 'Dernier salaire brut', gross: end.gross }]
  if (panel === 'integrer') aiScenarios = [{ ...base, name: 'Brut affiché au départ', gross: widgetGross }]
  if (panel === 'embaucher')
    aiScenarios = [
      { ...base, name: 'Salaire pour le budget employeur', gross: baseFromBudget(data.budget, data.hireExtras), extras: data.hireExtras },
    ]
  if (panel === 'negocier')
    aiScenarios = [
      base,
      {
        ...base,
        id: 'target',
        name: 'Objectif de négociation',
        gross: negotiate(base.gross, data.extraNet, base.dependants).gross,
      },
    ]

  // The assistant works from a gross: with extras, it gets the total gross and is told so.
  aiScenarios = aiScenarios.map((sc) =>
    sc.extras && hasExtras(sc.extras)
      ? {
          ...sc,
          gross: payslip(sc.gross, sc.dependants, sc.extras).gross,
          name: `${sc.name.slice(0, 40)} (avec primes, heures ou avantages)`,
          extras: undefined,
        }
      : sc,
  )

  const widgetUrl = new URL(location.pathname, location.origin)
  widgetUrl.search = new URLSearchParams({
    embed: '1',
    brut: String(widgetGross),
    theme: widgetDark ? 'dark' : 'light',
  }).toString()
  const embedCode = `<iframe src="${widgetUrl.href}" title="Calculateur de salaire Karama" width="100%" height="560" style="border:0;border-radius:6px" loading="lazy"></iframe>`

  const aiAvailable = true
  const explain = aiAvailable
    ? () => {
        setAsk({ id: Date.now(), question: QUESTIONS[panel][0] })
        setAiOpen(true)
      }
    : undefined
  const net0 = results[0].net
  const plural = (n: number, one: string, many: string) => (n > 1 ? many : one)
  const details = (result: Result) => (
    <div className="studio-breakdown">
      <Breakdown headingLevel={3} result={result} />
    </div>
  )

  return (
    <div className="studio-page" data-ai={aiOpen || undefined}>
      <GrainField fixed />
      <ToolBar current={panel}>
        {aiAvailable && (
          <button
            type="button"
            className="btn btn-ghost"
            aria-label="Poser une question"
            aria-expanded={aiOpen}
            onClick={() => setAiOpen(!aiOpen)}
          >
            <ActionIcon id="chat" />
            <span>Poser une question</span>
          </button>
        )}
        {panel !== 'integrer' && (
          <Menu label="Enregistrer et partager" icon={<ActionIcon id="save" />} align="end" tone="outline">
            <div className="menu-save">
              <TextField label="Nom de la simulation" value={name} onChange={setName} />
              <button className="btn btn-accent" onClick={save}>
                Enregistrer sur cet appareil
              </button>
            </div>
            <button className="menu-action" data-close onClick={share}>
              <ActionIcon id="link" />
              <span>
                <strong>Copier un lien de partage</strong>
                <small>Le lien contient tous les montants de l’atelier.</small>
              </span>
            </button>
            <button className="menu-action" data-close onClick={exportCsv}>
              <ActionIcon id="table" />
              <span>
                <strong>Télécharger en tableur (CSV)</strong>
                <small>Les chiffres de cet outil, pour Excel ou Sheets.</small>
              </span>
            </button>
            <button className="menu-action" data-close onClick={() => window.print()}>
              <ActionIcon id="print" />
              <span>
                <strong>Imprimer ou enregistrer en PDF</strong>
                <small>Une page propre, sans les menus.</small>
              </span>
            </button>
            <a className="menu-action" href="#atelier/sauvegardes">
              <ActionIcon id="grid" />
              <span>
                <strong>Voir mes simulations enregistrées</strong>
                <small>Rouvrir, supprimer ou transférer.</small>
              </span>
            </a>
          </Menu>
        )}
      </ToolBar>

      <main id="atelier-content" className="studio-main">
        <div className="studio-title">
          <span className="tool-icon">
            <ToolIcon id={panel} />
          </span>
          <div>
            <h1>{title}</h1>
            <p>{INTRO[panel]}</p>
          </div>
        </div>
        <ScaleNotice />
        {invalidShare && (
          <BrandFeedback state="error" className="studio-notice">
            Ce lien partagé est invalide. Votre atelier local a été conservé ; aucune donnée du lien n’a été
            chargée.
          </BrandFeedback>
        )}
        {storageError && (
          <BrandFeedback state="error" className="studio-notice">
            {storageError}
          </BrandFeedback>
        )}

        {panel === 'comparer' &&
          (() => {
            const best = results.reduce((top, r, i) => (r.net > results[top].net ? i : top), 0)
            const gain = results[best].net - net0
            return (
              <Work
                title="Vos offres"
                hint="Saisissez le brut mensuel de votre situation et de chaque offre. Vous pouvez en comparer jusqu’à quatre."
                inputs={
                  <>
                    {data.scenarios.map((s, i) => (
                      <fieldset key={s.id} className="studio-set">
                        <legend>{i === 0 ? 'Votre situation actuelle' : `Proposition ${i}`}</legend>
                        <TextField label="Nom" value={s.name} onChange={(name) => editScenario(i, { name })} />
                        <div className="studio-pair">
                          <NumberField label="Salaire de base mensuel" value={s.gross} onChange={(gross) => editScenario(i, { gross })} />
                          <DependantsField
                            label="Personnes à charge"
                            value={s.dependants}
                            onChange={(dependants) => editScenario(i, { dependants })}
                          />
                        </div>
                        <ExtrasPanel
                          extras={s.extras ?? NO_EXTRAS}
                          disabled={false}
                          onChange={(extras) => editScenario(i, { extras })}
                        />
                        {i > 1 && (
                          <button
                            className="studio-link"
                            onClick={() => patch({ scenarios: data.scenarios.filter((_, j) => j !== i) })}
                          >
                            <ActionIcon id="trash" />
                            Retirer {s.name || 'cette offre'}
                          </button>
                        )}
                      </fieldset>
                    ))}
                    <button
                      className="btn btn-outline"
                      disabled={data.scenarios.length >= 4}
                      onClick={() =>
                        patch({
                          scenarios: [
                            ...data.scenarios,
                            { ...base, id: crypto.randomUUID(), name: `Offre ${data.scenarios.length}` },
                          ],
                        })
                      }
                    >
                      <ActionIcon id="plus" />
                      Ajouter une proposition
                    </button>
                  </>
                }
              >
                {best === 0 ? (
                  <Verdict label="Votre situation actuelle reste la meilleure" value={formatAr(net0)} onExplain={explain}>
                    de net par mois. Aucune proposition ne fait mieux que {base.name || 'votre référence'}.
                  </Verdict>
                ) : (
                  <Verdict
                    label={`${data.scenarios[best].name || 'La meilleure offre'} vous rapporte`}
                    value={`+${formatAr(gain)}`}
                    onExplain={explain}
                  >
                    de net en plus chaque mois que {base.name || 'votre situation actuelle'}, soit +
                    {formatAr(gain * 12)} sur douze mois.
                  </Verdict>
                )}
                <div className="table-scroll">
                  <table className="studio-table">
                    <caption>Toutes les offres, côte à côte</caption>
                    <thead>
                      <tr>
                        <th>Offre</th>
                        <th>Brut</th>
                        <th>Net par mois</th>
                        <th>Écart de net</th>
                        <th>IRSA</th>
                        <th>Coût employeur</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.scenarios.map((s, i) => (
                        <tr key={s.id} data-best={i === best || undefined}>
                          <th scope="row">{s.name || (i === 0 ? 'Référence' : `Proposition ${i}`)}</th>
                          <td>{formatAr(results[i].gross)}</td>
                          <td data-key>
                            <strong>{formatAr(results[i].net)}</strong>
                          </td>
                          <td>{i === 0 ? 'Référence' : <Difference value={results[i].net - net0} suffix="" />}</td>
                          <td>{formatAr(results[i].irsa)}</td>
                          <td>{formatAr(results[i].employerCost)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Notice>
                  Comparez ici les salaires fixes. Les primes, avantages en nature et frais de déplacement ne sont
                  pas inclus.
                </Notice>
              </Work>
            )
          })()}

        {panel === 'negocier' &&
          (() => {
            const next = negotiate(base.gross, data.extraNet, base.dependants)
            return (
              <Work
                title="Votre demande"
                hint="Indiquez votre brut actuel et le net en plus que vous aimeriez toucher chaque mois."
                inputs={
                  <>
                    <NumberField label="Votre brut actuel" value={base.gross} onChange={(gross) => editScenario(0, { gross })} />
                    <NumberField
                      label="Net en plus que vous visez, par mois"
                      value={data.extraNet}
                      onChange={(extraNet) => patch({ extraNet })}
                    />
                    <DependantsField
                      label="Personnes à charge"
                      value={base.dependants}
                      onChange={(dependants) => editScenario(0, { dependants })}
                    />
                  </>
                }
              >
                <Verdict label="Le brut à demander" value={formatAr(next.gross)} onExplain={explain}>
                  soit {formatAr(next.gross - base.gross)} de brut en plus qu’aujourd’hui, pour toucher{' '}
                  {formatAr(next.net - net0)} de net en plus chaque mois.
                </Verdict>
                <dl className="studio-metrics">
                  <Metric label="Votre net passerait à" value={next.net} />
                  <Metric strong label="Gain sur douze mois" value={(next.net - net0) * 12} />
                  <Metric label="Coût en plus pour l’employeur" value={next.employerCost - results[0].employerCost} />
                </dl>
                <Notice>
                  {next.net - net0 < data.extraNet
                    ? 'L’objectif dépasse la limite de ce simulateur : le brut affiché est plafonné à un milliard d’ariary.'
                    : 'Le résultat vise au moins le supplément net demandé, avec les arrondis du moteur.'}
                </Notice>
                {details(next)}
              </Work>
            )
          })()}

        {panel === 'explorer' &&
          (() => {
            const r = compute(data.exploreGross, base.dependants)
            return (
              <Work
                title="Votre salaire"
                hint="Tapez un brut ou faites glisser le curseur : le net et la courbe suivent."
                inputs={
                  <>
                    <SalaryControls
                      gross={data.exploreGross}
                      dependants={base.dependants}
                      onChange={(exploreGross) => patch({ exploreGross })}
                    />
                    <DependantsField
                      label="Personnes à charge"
                      value={base.dependants}
                      onChange={(dependants) => editScenario(0, { dependants })}
                    />
                  </>
                }
              >
                <Verdict label={`Pour ${formatAr(r.gross)} brut, vous touchez`} value={formatAr(r.net)} onExplain={explain}>
                  de net. {formatAr(r.gross - r.net)} partent en impôt et cotisations, soit{' '}
                  {formatPercent(r.effectiveRate, 1)} de votre brut.
                </Verdict>
                <SalaryChart gross={data.exploreGross} dependants={base.dependants} />
                <dl className="studio-metrics">
                  <Metric strong label="IRSA" value={r.irsa} />
                  <Metric label="CNaPS et OSTIE" value={r.socialDeductions} />
                  <Metric label="Coût pour l’employeur" value={r.employerCost} />
                </dl>
                {details(r)}
              </Work>
            )
          })()}

        {panel === 'fiche' &&
          (() => {
            const p = data.payslip
            const r = payslip(p.gross, p.dependants, p.extras).result
            const update = (v: Partial<typeof p>) => patch({ payslip: { ...p, ...v } })
            const lines = [
              { key: 'cnaps' as const, name: 'CNaPS', expected: r.contributions[0].employee },
              { key: 'ostie' as const, name: 'OSTIE', expected: r.contributions[1].employee },
              { key: 'irsa' as const, name: 'IRSA', expected: r.irsa },
              { key: 'net' as const, name: 'Net versé', expected: r.net },
            ]
            const gaps = lines.filter((l) => p[l.key] !== l.expected)
            return (
              <Work
                title="Votre fiche de paie"
                hint="Recopiez les montants imprimés sur votre fiche. Rien n’est envoyé : tout reste dans ce navigateur."
                inputs={
                  <>
                    <div className="studio-pair">
                      <NumberField label="Salaire de base de la fiche" value={p.gross} onChange={(gross) => update({ gross })} />
                      <DependantsField
                        label="Personnes à charge"
                        value={p.dependants}
                        onChange={(dependants) => update({ dependants })}
                      />
                    </div>
                    <ExtrasPanel
                      extras={p.extras ?? NO_EXTRAS}
                      disabled={false}
                      onChange={(extras) => update({ extras })}
                    />
                    {lines.map((l) => (
                      <NumberField key={l.key} label={`${l.name} sur la fiche`} value={p[l.key]} onChange={(n) => update({ [l.key]: n })} />
                    ))}
                  </>
                }
              >
                {gaps.length === 0 ? (
                  <Verdict label="Votre fiche et le calcul" value="Tout concorde" onExplain={explain}>
                    Les quatre lignes saisies correspondent au calcul au barème.
                  </Verdict>
                ) : (
                  <Verdict
                    label="Votre fiche et le calcul"
                    value={`${gaps.length} ${plural(gaps.length, 'écart', 'écarts')}`}
                    onExplain={explain}
                  >
                    {gaps.map((l) => l.name).join(', ')} : {plural(gaps.length, 'ce montant diffère', 'ces montants diffèrent')}{' '}
                    du calcul au barème. Un écart n’est pas forcément une erreur.
                  </Verdict>
                )}
                <div className="table-scroll">
                  <table className="studio-table">
                    <caption>Ligne par ligne</caption>
                    <thead>
                      <tr>
                        <th>Ligne</th>
                        <th>Votre fiche</th>
                        <th>Calcul</th>
                        <th>Écart</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lines.map((l) => (
                        <tr key={l.key} data-gap={p[l.key] !== l.expected || undefined}>
                          <th scope="row">{l.name}</th>
                          <td>{formatAr(p[l.key])}</td>
                          <td>{formatAr(l.expected)}</td>
                          <td data-key>{p[l.key] === l.expected ? 'Identique' : <Difference value={p[l.key] - l.expected} suffix="" />}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Notice>
                  Les primes, absences, remboursements et avantages peuvent expliquer une différence.
                </Notice>
                {details(r)}
              </Work>
            )
          })()}

        {panel === 'embaucher' &&
          (() => {
            const hire = payslip(baseFromBudget(data.budget, data.hireExtras), base.dependants, data.hireExtras)
            const r = hire.result
            return (
              <Work
                title="Votre budget"
                hint="Indiquez ce que le poste peut coûter par mois, cotisations patronales comprises."
                inputs={
                  <>
                    <NumberField
                      label="Votre budget total pour ce poste, par mois"
                      value={data.budget}
                      onChange={(budget) => patch({ budget })}
                    />
                    <DependantsField
                      label="Personnes à charge de la personne recrutée"
                      value={base.dependants}
                      onChange={(dependants) => editScenario(0, { dependants })}
                    />
                    <ExtrasPanel
                      extras={data.hireExtras ?? NO_EXTRAS}
                      disabled={false}
                      onChange={(hireExtras) => patch({ hireExtras })}
                    />
                  </>
                }
              >
                <Verdict label="Le salaire de base que vous pouvez proposer" value={formatAr(hire.base)} onExplain={explain}>
                  {hasExtras(data.hireExtras ?? NO_EXTRAS)
                    ? `Avec les primes et heures prévues, le brut total est de ${formatAr(r.gross)}. `
                    : ''}
                  La personne toucherait {formatAr(r.net)} de net. Il resterait {formatAr(data.budget - r.employerCost)} sur
                  votre budget.
                </Verdict>
                <dl className="studio-metrics">
                  <Metric strong label="Net de la personne" value={r.net} />
                  <Metric label="Cotisations patronales" value={r.employerCharges} />
                  <Metric label="Coût total pour vous" value={r.employerCost} />
                </dl>
                {hire.base < SCALE.minimumWage && (
                  <Notice>
                    Ce budget donne un brut inférieur au salaire minimum d’embauche à temps plein (
                    {formatAr(SCALE.minimumWage)}).
                  </Notice>
                )}
                {details(r)}
              </Work>
            )
          })()}

        {panel === 'equipe' &&
          (() => {
            const team = teamBudget(data.roles)
            return (
              <Work
                title="Vos postes"
                hint="Un bloc par poste : son nom, combien de personnes, et leur brut. Le budget se recalcule à chaque changement."
                inputs={
                  <>
                    {team.rows.map((role) => {
                      const update = (partial: Partial<typeof role>) =>
                        patch({ roles: data.roles.map((r) => (r.id === role.id ? { ...r, ...partial } : r)) })
                      return (
                        <fieldset key={role.id} className="studio-set">
                          <legend>{role.name || 'Poste'}</legend>
                          <div className="studio-pair">
                            <TextField label="Nom du poste" value={role.name} onChange={(name) => update({ name })} />
                            <NumberField
                              label="Effectif"
                              min={1}
                              max={100}
                              suffix=""
                              value={role.count}
                              onChange={(count) => update({ count })}
                            />
                          </div>
                          <div className="studio-pair">
                            <NumberField label="Salaire de base par personne" value={role.gross} onChange={(gross) => update({ gross })} />
                            <DependantsField
                              label="Personnes à charge"
                              value={role.dependants}
                              onChange={(dependants) => update({ dependants })}
                            />
                          </div>
                          <ExtrasPanel
                            extras={role.extras ?? NO_EXTRAS}
                            disabled={false}
                            onChange={(extras) => update({ extras })}
                          />
                          <div className="studio-actions">
                            <button
                              className="studio-link"
                              disabled={data.roles.length >= 30}
                              onClick={() =>
                                patch({
                                  roles: [
                                    ...data.roles,
                                    {
                                      id: crypto.randomUUID(),
                                      name: role.name.slice(0, 72) + ' (copie)',
                                      gross: role.gross,
                                      dependants: role.dependants,
                                      extras: role.extras,
                                      count: role.count,
                                    },
                                  ],
                                })
                              }
                            >
                              <ActionIcon id="copy" />
                              Dupliquer
                            </button>
                            <button
                              className="studio-link"
                              disabled={data.roles.length <= 1}
                              onClick={() => patch({ roles: data.roles.filter((r) => r.id !== role.id) })}
                            >
                              <ActionIcon id="trash" />
                              Retirer
                            </button>
                          </div>
                        </fieldset>
                      )
                    })}
                    <button
                      className="btn btn-outline"
                      disabled={data.roles.length >= 30}
                      onClick={() =>
                        patch({
                          roles: [
                            ...data.roles,
                            { id: crypto.randomUUID(), name: 'Nouveau poste', count: 1, gross: base.gross, dependants: 0 },
                          ],
                        })
                      }
                    >
                      <ActionIcon id="plus" />
                      Ajouter un poste
                    </button>
                  </>
                }
              >
                <Verdict label="Votre équipe coûte" value={formatAr(team.cost)}>
                  par mois pour {team.headcount} {plural(team.headcount, 'personne', 'personnes')}, soit{' '}
                  {formatAr(team.cost * 12)} sur douze mois.
                </Verdict>
                <div className="table-scroll">
                  <table className="studio-table">
                    <caption>Coût par poste</caption>
                    <thead>
                      <tr>
                        <th>Poste</th>
                        <th>Effectif</th>
                        <th>Net par personne</th>
                        <th>Coût mensuel du poste</th>
                      </tr>
                    </thead>
                    <tbody>
                      {team.rows.map((role) => (
                        <tr key={role.id}>
                          <th scope="row">{role.name || 'Poste'}</th>
                          <td>{role.count}</td>
                          <td>{formatAr(role.result.net)}</td>
                          <td data-key>
                            <strong>{formatAr(role.result.employerCost * role.count)}</strong>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <dl className="studio-metrics">
                  <Metric label="Net total versé à l’équipe" value={team.net} />
                  <Metric strong label="Budget sur douze mois" value={team.cost * 12} />
                </dl>
                <Notice>
                  Budget de salaires fixes et cotisations. Les autres frais de recrutement, équipements et
                  avantages ne sont pas inclus.
                </Notice>
              </Work>
            )
          })()}

        {panel === 'annee' &&
          (() => {
            const annual = annualProjection(data.months)
            return (
              <Work
                title="Votre année"
                hint="Partez d’un même brut pour les douze mois, puis ajustez dans le tableau les mois qui changent."
                inputs={
                  <>
                    <NumberField label="Brut à appliquer aux douze mois" value={annualFill} onChange={setAnnualFill} />
                    <ExtrasPanel extras={annualExtras} disabled={false} onChange={setAnnualExtras} />
                    <button
                      className="btn btn-outline"
                      onClick={() =>
                        patch({ months: data.months.map((m) => ({ ...m, gross: annualFill, extras: annualExtras })) })
                      }
                    >
                      Appliquer aux 12 mois
                    </button>
                  </>
                }
              >
                <Verdict label="Votre net sur douze mois" value={formatAr(annual.net)}>
                  dont {formatAr(annual.tax)} d’IRSA prélevés sur l’année. Coût total pour l’employeur :{' '}
                  {formatAr(annual.employerCost)}.
                </Verdict>
                <div className="table-scroll">
                  <table className="studio-table">
                    <caption>Modifiez un mois pour tester une augmentation ou un changement de situation</caption>
                    <thead>
                      <tr>
                        <th>Période</th>
                        <th>Brut de base</th>
                        <th>Primes</th>
                        <th>À charge</th>
                        <th>Net</th>
                        <th>Coût employeur</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.months.map((m, i) => (
                        <tr key={i}>
                          <th scope="row">{MONTHS[i]}</th>
                          <td>
                            <NumberField
                              label={`Brut du mois ${i + 1}`}
                              value={m.gross}
                              onChange={(gross) =>
                                patch({ months: data.months.map((n, j) => (i === j ? { ...n, gross } : n)) })
                              }
                            />
                          </td>
                          <td>
                            <NumberField
                              label={`Primes du mois ${i + 1}`}
                              value={m.extras?.bonus ?? 0}
                              onChange={(bonus) =>
                                patch({
                                  months: data.months.map((n, j) =>
                                    i === j ? { ...n, extras: { ...(n.extras ?? NO_EXTRAS), bonus } } : n,
                                  ),
                                })
                              }
                            />
                          </td>
                          <td>
                            <DependantsField
                              label={`Personnes à charge du mois ${i + 1}`}
                              value={m.dependants}
                              onChange={(dependants) =>
                                patch({ months: data.months.map((n, j) => (i === j ? { ...n, dependants } : n)) })
                              }
                            />
                          </td>
                          <td data-key>{formatAr(annual.results[i].net)}</td>
                          <td>{formatAr(annual.results[i].employerCost)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Notice>
                  Projection au barème constant d’octobre 2026. Elle ne reconstitue pas les anciens barèmes et ne
                  prédit pas les prochains.
                </Notice>
              </Work>
            )
          })()}

        {panel === 'fin' &&
          (() => {
            const r = endOfContract(end)
            const set = (patch: Partial<EndInput>) => setEnd({ ...end, ...patch })
            return (
              <Work
                title="Votre fin de contrat"
                hint="Indiquez votre dernier salaire brut, votre ancienneté et la façon dont le contrat se termine."
                inputs={
                  <>
                    <NumberField label="Dernier salaire brut mensuel" value={end.gross} onChange={(gross) => set({ gross })} />
                    <NumberField label="Années complètes de service" value={end.years} max={50} suffix="ans" onChange={(years) => set({ years })} />
                    <SelectField
                      label="Comment le contrat se termine-t-il ?"
                      value={end.kind}
                      onChange={(kind) => set({ kind: kind as EndInput['kind'] })}
                      options={[
                        { value: 'economic', label: 'Licenciement économique ou arrêt de l’entreprise' },
                        { value: 'other', label: 'Démission ou autre rupture' },
                      ]}
                    />
                    <SelectField
                      label="Le préavis est-il travaillé ?"
                      value={end.noticeWorked ? 'yes' : 'no'}
                      onChange={(v) => set({ noticeWorked: v === 'yes' })}
                      options={[
                        { value: 'yes', label: 'Oui, il est effectué normalement' },
                        { value: 'no', label: 'Non, il est payé à la place' },
                      ]}
                    />
                    <NumberField label="Durée du préavis (convention ou décret)" value={end.noticeDays} max={365} suffix="jours" onChange={(noticeDays) => set({ noticeDays })} />
                    <NumberField label="Mois de service depuis le dernier congé pris" value={end.leaveMonths} max={36} suffix="mois" onChange={(leaveMonths) => set({ leaveMonths })} />
                    <NumberField label="Jours de congé déjà pris sur cette période" value={end.leaveTaken} max={90} suffix="jours" onChange={(leaveTaken) => set({ leaveTaken })} />
                  </>
                }
              >
                <Verdict label="L’employeur doit verser au moins" value={formatAr(r.total)} onExplain={explain}>
                  {r.total === 0
                    ? 'Avec ces informations, aucun montant n’est dû au titre du préavis, de l’indemnité ou des congés.'
                    : 'en indemnités, en plus du salaire du dernier mois travaillé. Chaque élément est détaillé ci-dessous.'}
                </Verdict>
                <div className="table-scroll">
                  <table className="studio-table">
                    <caption>Détail des sommes dues</caption>
                    <thead>
                      <tr>
                        <th>Élément</th>
                        <th>Base de calcul</th>
                        <th>Montant</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <th scope="row">Indemnité de licenciement</th>
                        <td>
                          {end.kind === 'economic'
                            ? `${SEVERANCE_DAYS_PER_YEAR} jours × ${end.years} an${end.years > 1 ? 's' : ''}${r.severanceCapped ? `, plafonné à ${SEVERANCE_CAP_MONTHS} mois` : ''}`
                            : 'Non prévue pour ce type de rupture'}
                        </td>
                        <td data-key>{formatAr(r.severance)}</td>
                      </tr>
                      <tr>
                        <th scope="row">Indemnité de préavis</th>
                        <td>{end.noticeWorked ? 'Préavis travaillé : rien à payer en plus' : `${end.noticeDays} jours de salaire`}</td>
                        <td data-key>{formatAr(r.notice)}</td>
                      </tr>
                      <tr>
                        <th scope="row">Congés payés non pris</th>
                        <td>{String(r.leaveDays).replace('.', ',')} jours restants</td>
                        <td data-key>{formatAr(r.leave)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <dl className="studio-metrics">
                  <Metric label="Un jour de salaire" value={Math.round(r.day)} detail="Salaire brut ÷ 30" />
                  <Metric label="Plafond de l’indemnité" value={end.gross * SEVERANCE_CAP_MONTHS} detail={`${SEVERANCE_CAP_MONTHS} mois de salaire`} />
                </dl>
                <Notice>
                  Montants bruts. Seuls trois éléments sont calculés : la durée du préavis dépend de votre convention collective ou d’un
                  décret (art. 19), l’indemnité de licenciement ci-dessus est celle de l’article 28 (licenciement économique ou arrêt de
                  l’entreprise), et le congé est évalué à 2,5 jours par mois (art. 86). Le traitement fiscal et social de ces indemnités n’est
                  pas calculé ; une convention ou votre contrat peut prévoir plus favorable.
                </Notice>
              </Work>
            )
          })()}

        {panel === 'sauvegardes' && (
          <div className="studio-single">
            <div className="studio-summary">
              <h2>Votre atelier vous appartient</h2>
              <p>
                Les sauvegardes sont stockées dans ce navigateur. Exportez un fichier JSON pour les transférer
                sur un autre appareil. Un lien partagé contient tous les montants de l’atelier.
              </p>
            </div>
            <div className="studio-actions">
              <button
                className="btn btn-outline"
                onClick={() => downloadFile('karama-simulation.json', JSON.stringify(data, null, 2), 'application/json')}
              >
                Exporter l’atelier en JSON
              </button>
              <button className="btn btn-outline" onClick={() => fileInput.current?.click()}>
                Importer une simulation
              </button>
              <input
                type="file"
                accept="application/json,.json"
                ref={fileInput}
                hidden
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  e.target.value = ''
                  if (!file) return
                  if (file.size > 100_000) {
                    notify('Ce fichier dépasse la limite de 100 Ko.', 'error')
                    return
                  }
                  try {
                    const imported: unknown = JSON.parse(await file.text())
                    if (!validWorkspace(imported)) throw new Error()
                    setData(imported)
                    notify('Simulation importée. Vous pouvez l’enregistrer sous un nouveau nom.')
                  } catch {
                    notify('Ce fichier ne contient pas une simulation Karama valide.', 'error')
                  }
                }}
              />
            </div>
            {saved.length === 0 ? (
              <div className="studio-empty">
                <BrandMark state="empty" size={80} />
                <p>
                Aucune simulation enregistrée. Ouvrez le menu « Enregistrer et partager », en haut à droite, pour
                garder la première.
                </p>
              </div>
            ) : (
              <ul className="saved-plans">
                {saved.map((s) => (
                  <li key={s.id}>
                    <div>
                      <h2>{s.name}</h2>
                      <p>
                        {new Date(s.savedAt).toLocaleString('fr-FR')} · {s.data.scenarios.length} situations ·{' '}
                        {s.data.roles.length} poste(s)
                      </p>
                    </div>
                    <div className="studio-actions">
                      <button
                        className="btn btn-solid"
                        onClick={() => {
                          setData(structuredClone(s.data))
                          setName(s.name)
                          notify('Simulation chargée. Choisissez un outil pour la modifier.')
                        }}
                      >
                        Ouvrir {s.name}
                      </button>
                      <button className="btn btn-outline" onClick={() => removeSaved(s.id)}>
                        Supprimer {s.name}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {panel === 'integrer' && (
          <Work
                title="Vos réglages"
                hint="Choisissez le montant affiché au départ et le thème du calculateur."
                inputs={
              <>
                <NumberField label="Brut affiché au démarrage" value={widgetGross} onChange={setWidgetGross} />
                <label className="studio-check">
                  <input type="checkbox" checked={widgetDark} onChange={(e) => setWidgetDark(e.target.checked)} />
                  Thème sombre
                </label>
              </>
            }
          >
            <iframe className="widget-preview" src={widgetUrl.href} title="Aperçu du calculateur intégré" />
            <label className="studio-field">
              Code d’intégration
              <textarea readOnly rows={5} value={embedCode} onFocus={(e) => e.target.select()} />
            </label>
            <button
              className="btn btn-accent"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(embedCode)
                  notify('Code d’intégration copié.')
                } catch {
                  notify('Sélectionnez le code ci-dessus pour le copier.', 'error')
                }
              }}
            >
              <ActionIcon id="copy" />
              Copier le code
            </button>
            <Notice>
              Le widget calcule dans le navigateur et ne contient pas d’assistant IA. Utilisez l’URL de votre
              site publié pour l’intégrer sur un autre domaine.
            </Notice>
          </Work>
        )}

        <p className="studio-scope">
          Secteur privé non agricole, barème en vigueur depuis le{' '}
          {new Date(SCALE.effectiveFrom).toLocaleDateString('fr-FR', { dateStyle: 'long' })}. Estimations
          hors primes, heures supplémentaires et avantages en nature. Vos simulations restent sur cet appareil ;
          seules les questions posées à l’assistant sont envoyées au serveur.{' '}
          <a href="#baremes" className="underline">
            Consulter les sources
          </a>
          {' · '}
          <a
            className="underline"
            href={`${location.pathname}${serialize({ amount: base.gross, dependants: base.dependants, mode: 'gross', view: 'employee', extras: NO_EXTRAS })}#calculateur`}
          >
            Voir le détail de la référence dans le calculateur
          </a>
        </p>
      </main>
      {aiAvailable && (
        <Assistant
          scenarios={aiScenarios}
          open={aiOpen}
          onClose={closeAi}
          tool={panel}
          toolTitle={title}
          suggestions={QUESTIONS[panel]}
          ask={ask}
          onIntent={applyIntent}
        />
      )}
      <BrandFeedback state={status?.state ?? 'success'} className="studio-toast print:hidden" visible={!!status} replayKey={status?.id}>
        {status && <span key={status.id}>{status.message}</span>}
      </BrandFeedback>
    </div>
  )
}

/** Every tool reads the same way: your figures first, then the answer. */
function Work({
  inputs,
  children,
  hint,
  title,
}: {
  inputs: ReactNode
  children: ReactNode
  hint: string
  title: string
}) {
  return (
    <div className="studio-work">
      <section className="pane-inputs" aria-labelledby="inputs-title">
        <h2 id="inputs-title">{title}</h2>
        <p className="pane-hint">{hint}</p>
        <div className="pane-fields">{inputs}</div>
      </section>
      <section className="pane-result" aria-labelledby="result-title">
        <h2 id="result-title" className="sr-only">
          Votre résultat
        </h2>
        {children}
      </section>
    </div>
  )
}

/** The answer in one sentence, before any table. */
function Verdict({
  label,
  value,
  children,
  onExplain,
}: {
  label: string
  value: string
  children: ReactNode
  onExplain?: () => void
}) {
  return (
    <div className="verdict">
      <p className="verdict-label">{label}</p>
      <p className="verdict-figure">{value}</p>
      <p className="verdict-text">{children}</p>
      {onExplain && (
        <button type="button" className="verdict-ai print:hidden" onClick={onExplain}>
          <ActionIcon id="chat" />
          Pourquoi ce résultat ?
        </button>
      )}
    </div>
  )
}
