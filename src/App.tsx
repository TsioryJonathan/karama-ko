import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { BrandFeedback } from './components/BrandFeedback'
import { GrainField } from './components/GrainField'
import { ScaleNotice } from './components/ScaleNotice'
import { LoadingScreen, NotFoundScreen } from './components/Screens'
import { DependantsField, SelectField } from './workspace/Fields'
import { Assistant } from './workspace/Assistant'
import { Menu, ToolBar } from './workspace/ToolBar'
import { ActionIcon, ToolIcon } from './workspace/tools'
import { AmountField } from './components/AmountField'
import { ResultCard } from './components/ResultCard'
import { Sources } from './components/Sources'
import { SCALE, compute } from './engine/compute'
import { inverse } from './engine/inverse'
import { payslip, hasExtras, NO_EXTRAS } from './engine/pay'
import type { Intent } from './engine/intent'
import { ExtrasPanel } from './components/ExtrasPanel'
import { formatAr, formatNumber } from './lib/format'
import { PANELS, type Panel } from './workspace/state'
import { TOOLS } from './workspace/tools'
import { LEGAL_PAGES } from './workspace/legal-pages'
import { isLegalId } from './workspace/legal-pages'
import { SiteFooter } from './workspace/SiteFooter'
import { loadInitial, persist, type Mode, type State } from './lib/state'

const MAX_AMOUNT = 1_000_000_000
/** Focusing the field on a phone would pop the keyboard over the page. */
const DESKTOP = matchMedia('(min-width: 960px)').matches
const QUICK_AMOUNTS = [500_000, 1_000_000, 2_000_000, 5_000_000]
const MODES: { id: Mode; name: string }[] = [
  { id: 'gross', name: 'Mon salaire brut' },
  { id: 'net', name: 'Le net que je souhaite' },
]

const CALC_QUESTIONS = [
  'Pourquoi mon net est-il inférieur à mon brut ?',
  'Comment l’IRSA est-il calculé pour ce salaire ?',
  'Que coûte ce salaire à l’employeur ?',
]

const Studio = lazy(() => import('./workspace/Studio'))
const Home = lazy(() => import('./workspace/Home'))
const Widget = lazy(() => import('./workspace/Widget'))
const Legal = lazy(() => import('./workspace/Legal'))

/** Anchors inside a page: following one must not change which page is shown. */
const IN_PAGE = new Set(['#resultat', '#atelier-content'])

function isKnown(hash: string, search: URLSearchParams) {
  const parts = hash.replace(/^#/, '').split('/')
  if (location.pathname !== '/' && location.pathname !== '/index.html') return false
  if (search.get('embed') === '1' || search.has('brut') || search.has('net')) return true
  if (['', 'outils', 'calculateur', 'baremes'].includes(parts[0])) return parts.length === 1
  if (isLegalId(parts[0])) return parts.length === 1
  return parts[0] === 'atelier' && (parts.length === 1 || PANELS.some((p) => p.id === parts[1]))
}

/** Title, description and indexing of the page being shown: the address of a tool is a hash, so this is what tabs, history and shares see. */
function routeMeta(hash: string, known: boolean, search: URLSearchParams) {
  const suffix = ' · Karama-Ko'
  const parts = hash.replace(/^#/, '').split('/')
  if (!known) return { title: 'Page introuvable' + suffix, noindex: true }
  if (search.get('embed') === '1') return { title: 'Calculateur de salaire intégré' + suffix, noindex: true }
  if (parts[0] === 'atelier') {
    const tool = TOOLS.find((t) => t.id === parts[1]) ?? TOOLS.find((t) => t.id === 'comparer')!
    return { title: tool.title + suffix, description: `${tool.text} ${tool.output}.` }
  }
  const legal = LEGAL_PAGES.find((page) => page.id === parts[0])
  if (legal) return { title: legal.title + suffix, noindex: false }
  if (parts[0] === 'baremes') return { title: 'Barèmes et sources : IRSA, CNaPS, OSTIE' + suffix }
  if (hash === '#calculateur' || search.has('brut') || search.has('net'))
    return { title: 'Calculer mon salaire net à Madagascar' + suffix, description: 'Du salaire brut au net, ou du net au brut : IRSA, CNaPS et OSTIE au barème en vigueur, avec primes, heures supplémentaires et avantages.' }
  return null
}

const DEFAULTS = {
  title: document.title,
  description: document.querySelector<HTMLMetaElement>('meta[name="description"]')?.content ?? '',
}

export function App() {
  const [hash, setHash] = useState(location.hash)
  useEffect(() => {
    const updateHash = () => {
      if (!IN_PAGE.has(location.hash)) setHash(location.hash)
    }
    window.addEventListener('hashchange', updateHash)
    return () => window.removeEventListener('hashchange', updateHash)
  }, [])
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (hash === '#baremes' || hash === '#outils') document.getElementById(hash.slice(1))?.scrollIntoView()
      else window.scrollTo(0, 0)
    })
    return () => cancelAnimationFrame(frame)
  }, [hash])
  const search = new URLSearchParams(location.search)
  const parts = hash.replace(/^#/, '').split('/')
  const known = isKnown(hash, search)
  useEffect(() => {
    const meta = routeMeta(hash, known, search)
    document.title = meta?.title ?? DEFAULTS.title
    const set = (name: string, content: string) => document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)?.setAttribute('content', content)
    set('description', meta?.description ?? DEFAULTS.description)
    set('robots', meta?.noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large')
    document.documentElement.toggleAttribute('data-og', search.has('og') && !meta)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hash, known])
  const panel = PANELS.some((p) => p.id === parts[1]) ? (parts[1] as Panel) : 'comparer'
  return (
    <Suspense fallback={<LoadingScreen />}>
      {!known ? (
        <NotFoundScreen />
      ) : search.get('embed') === '1' ? (
        <Widget />
      ) : parts[0] === 'atelier' ? (
        <Studio panel={panel} key={parts[2] || 'draft'} />
      ) : isLegalId(parts[0]) ? (
        <Legal page={parts[0]} />
      ) : hash === '#calculateur' || hash === '#baremes' || search.has('brut') || search.has('net') ? (
        <Calculator />
      ) : (
        <Home />
      )}
    </Suspense>
  )
}

function Calculator() {
  const [state, setState] = useState<State>(loadInitial)
  const update = (patch: Partial<State>) => setState((s) => ({ ...s, ...patch }))
  useEffect(() => persist(state), [state])
  const [copyFeedback, setCopyFeedback] = useState<{ message: string; state: 'success' | 'error'; id: number } | null>(null)
  const [aiOpen, setAiOpen] = useState(false)
  const [ask, setAsk] = useState<{ id: number; question: string } | undefined>()
  useEffect(() => {
    if (!copyFeedback) return
    const timer = setTimeout(() => setCopyFeedback(null), 5000)
    return () => clearTimeout(timer)
  }, [copyFeedback])

  const outOfRange = state.amount !== null && state.amount > MAX_AMOUNT
  const pay = useMemo(() => {
    if (!state.amount || outOfRange || state.mode === 'net') return null
    return payslip(state.amount, state.dependants, state.extras)
  }, [state.amount, state.mode, state.dependants, state.extras, outOfRange])
  const result = useMemo(() => {
    if (!state.amount || outOfRange) return null
    if (state.mode === 'gross') return pay?.result ?? null
    return compute(inverse(state.amount, state.dependants), state.dependants)
  }, [state.amount, state.mode, state.dependants, outOfRange, pay])
  /** The visitor asked for a change (« et si j'ai 20 h de suppl ») : the form is filled in, the engine answers. */
  const applyIntent = (intent: Intent): string | null => {
    const baseGross = intent.gross ?? (state.mode === 'net' ? result?.gross : state.amount)
    if (!baseGross || baseGross > MAX_AMOUNT) return null
    const extras = { ...(state.extras ?? NO_EXTRAS) }
    if (intent.hours !== undefined) extras.hours1 = intent.hours
    if (intent.bonus !== undefined) extras.bonus = intent.bonus
    const dependants = intent.dependants ?? state.dependants
    const before = payslip(result?.gross ?? baseGross, state.dependants, state.extras)
    const after = payslip(baseGross, dependants, extras)
    update({ mode: 'gross', amount: baseGross, dependants, extras })
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

  let hint: string | undefined
  const tone = 'warning' as const
  if (outOfRange) hint = `Montant trop élevé : le simulateur s’arrête à ${formatAr(MAX_AMOUNT)}.`
  else if (result && result.gross < SCALE.minimumWage)
    hint = `Sous le salaire minimum d’embauche à temps plein (${formatAr(SCALE.minimumWage)}).`

  return (
    <>
      <div className="calculator-shell flex min-h-dvh flex-col print:min-h-0">
        <GrainField fixed />
        <a href="#resultat" className="sr-only-focusable btn btn-solid absolute top-2 left-2 z-20">
          Aller au résultat
        </a>
        <ToolBar current="calculer">
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
          <Menu label="Partager ce calcul" icon={<ActionIcon id="send" />} align="end" tone="outline">
            <button
              className="menu-action"
              data-close
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(location.href)
                  setCopyFeedback({ message: 'Lien copié.', state: 'success', id: Date.now() })
                } catch {
                  setCopyFeedback({ message: 'Copie indisponible. Copiez le lien depuis la barre d’adresse.', state: 'error', id: Date.now() })
                }
              }}
            >
              <ActionIcon id="link" />
              <span>
                <strong>Copier le lien</strong>
                <small>Il rouvre ce calcul avec les mêmes montants.</small>
              </span>
            </button>
            {typeof navigator.share === 'function' && (
              <button
                className="menu-action"
                data-close
                onClick={() =>
                  navigator
                    .share({ title: 'Karama-Ko : mon calcul de salaire', url: location.href })
                    .catch(() => {})
                }
              >
                <ActionIcon id="send" />
                <span>
                  <strong>Envoyer à quelqu’un</strong>
                  <small>Via vos applications de messagerie.</small>
                </span>
              </button>
            )}
            <button className="menu-action" data-close onClick={() => print()}>
              <ActionIcon id="print" />
              <span>
                <strong>Imprimer ou enregistrer en PDF</strong>
                <small>Une page propre avec le détail du calcul.</small>
              </span>
            </button>
          </Menu>
        </ToolBar>

        <main className="studio-main w-full grow">
          <div className="studio-title">
            <span className="tool-icon">
              <ToolIcon id="calculer" />
            </span>
            <div>
              <h1>Calculer mon salaire</h1>
              <p>Madagascar, secteur privé. Barème d’octobre 2026.</p>
            </div>
          </div>
          <ScaleNotice />
          <div className="studio-work">
            <form className="pane-inputs print:hidden" onSubmit={(e) => e.preventDefault()} aria-labelledby="inputs-title">
              <h2 id="inputs-title">Votre salaire</h2>
              <p className="pane-hint">
                Indiquez un montant mensuel, ou partez d’un exemple. Le résultat s’affiche à côté.
              </p>
<div className="pane-fields" data-calc>
              <SelectField
                label="Je pars de"
                value={state.mode}
                onChange={(mode) => update({ mode: mode as Mode })}
                options={MODES.map((m) => ({ value: m.id, label: m.name }))}
              />
              <div className="pane-wide">
                <AmountField
                  label={
                    state.mode === 'net' ? 'Net souhaité, par mois (le résultat est le brut à demander)' : 'Salaire brut, par mois'
                  }
                  value={state.amount}
                  onChange={(amount) => update({ amount })}
                  hint={hint}
                  tone={tone}
                  autoFocus={DESKTOP && state.amount === null && location.hash !== '#baremes'}
                />
                <p id="quick-amounts" className="text-14 text-muted">
                  Ou partez d’un exemple
                </p>
                <div className="quick-amounts" role="group" aria-labelledby="quick-amounts">
                  {QUICK_AMOUNTS.map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      aria-pressed={state.amount === amount}
                      onClick={() => update({ amount })}
                    >
                      {formatNumber(amount)}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <DependantsField value={state.dependants} onChange={(dependants) => update({ dependants })} />
              </div>
              <ExtrasPanel
                extras={state.extras}
                disabled={state.mode === 'net'}
                onChange={(extras) => update({ extras })}
              />
</div>
            </form>

            <div className="pane-result">
              <h2 className="sr-only">Votre résultat</h2>
              {result && (
                <p className="mb-4 hidden print:block">
                  Karama-Ko, simulation du {new Date().toLocaleDateString('fr-FR')} : brut de{' '}
                  {formatAr(result.gross)}, {result.dependants} personne{result.dependants > 1 ? 's' : ''} à
                  charge. Barème {SCALE.year}, SME de {formatAr(SCALE.minimumWage)}. Estimation, hors
                  primes, heures supplémentaires et avantages en nature.
                </p>
              )}
              <ResultCard result={result} mode={state.mode} pay={hasExtras(state.extras) ? pay : null} />
              {result && (
                <p className="calc-next print:hidden">
                  <button
                    type="button"
                    className="verdict-ask"
                    onClick={() => {
                      setAsk({ id: Date.now(), question: CALC_QUESTIONS[0] })
                      setAiOpen(true)
                    }}
                  >
                    <ActionIcon id="chat" />
                    Pourquoi ce résultat ?
                  </button>
                  {' · '}Et ensuite ?{' '}
                  <a href={`${location.pathname}#atelier/comparer`}>Comparer avec une autre offre</a>
                  {' · '}
                  <a href={`${location.pathname}#atelier/negocier`}>Préparer une négociation</a>
                </p>
              )}
            </div>
          </div>
        </main>
      </div>
      <Assistant
        scenarios={[
          {
            id: 'calc',
            name: hasExtras(state.extras)
              ? 'Salaire brut avec primes et heures supplémentaires'
              : state.mode === 'net'
                ? 'Brut à demander'
                : 'Mon salaire',
            gross: hasExtras(state.extras) && pay ? pay.base : (result?.gross ?? 0),
            dependants: state.dependants,
            extras: hasExtras(state.extras) ? state.extras : undefined,
          },
        ]}
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        tool="calculer"
        toolTitle="Calculer mon salaire"
        suggestions={CALC_QUESTIONS}
        ask={ask}
        onIntent={applyIntent}
      />
      <BrandFeedback state={copyFeedback?.state ?? 'success'} className="studio-toast print:hidden" visible={!!copyFeedback} replayKey={copyFeedback?.id}>
        {copyFeedback?.message}
      </BrandFeedback>

      <Sources />
      <SiteFooter />

      {result && (
        <div
          className="fixed inset-x-0 bottom-0 z-10 flex items-baseline justify-between bg-ink px-6 py-3 text-bg lg:hidden print:hidden"
          aria-hidden="true"
        >
          <span className="font-medium">Salaire net</span>
          <span className="figure text-20 font-bold">{formatAr(result.net)}</span>
        </div>
      )}
    </>
  )
}

