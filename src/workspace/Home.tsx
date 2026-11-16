import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { GrainField } from '../components/GrainField'
import { ThemeToggle } from '../components/ThemeToggle'
import { useCountUp } from '../components/useCountUp'
import { compute } from '../engine/compute'
import { formatAr, formatNumber, formatPercent } from '../lib/format'
import { BanknoteHero } from './BanknoteHero'
import { NumberField } from './Fields'
import { SiteFooter } from './SiteFooter'
import { ArrowIcon, TOOLS, ToolIcon, type ToolGroupId, type ToolId } from './tools'

/** Tile sizes carry the hierarchy: one lead tool, everyday tools, then the workspace. */
const BENTO: [ToolId, 'lead' | 'base' | 'mid' | 'mini'][] = [
  ['comparer', 'lead'],
  ['negocier', 'base'],
  ['explorer', 'base'],
  ['fiche', 'base'],
  ['annee', 'base'],
  ['fin', 'mid'],
  ['embaucher', 'mid'],
  ['equipe', 'mid'],
  ['sauvegardes', 'mini'],
  ['integrer', 'mini'],
]
const AUDIENCE: Record<ToolGroupId, string> = { salary: 'Salarié·e', team: 'Employeur', workspace: 'Atelier' }

const QUICK_AMOUNTS = [500_000, 1_000_000, 2_000_000, 5_000_000]

/** The first tool, usable in place: one amount in, the net out. */
function QuickCalculator() {
  const [gross, setGross] = useState(1_500_000)
  const result = compute(gross, 0)
  const net = useCountUp(result.net)
  const parts = [
    { id: 'net', name: 'Net', value: result.net },
    { id: 'irsa', name: 'IRSA', value: result.irsa },
    { id: 'social', name: 'CNaPS et OSTIE', value: result.socialDeductions },
  ]
  return (
    <section className="quick" aria-labelledby="quick-title" data-reveal>
      <div className="quick-entry">
        <h2 id="quick-title">Combien vous <span>reste-t-il&nbsp;?</span></h2>
        <p>Saisissez votre brut mensuel. Le net s’affiche tout de suite, au barème d’octobre 2026.</p>
        <NumberField label="Votre salaire brut, par mois" value={gross} onChange={setGross} />
        <div className="quick-amounts" role="group" aria-label="Exemples de salaire brut">
          {QUICK_AMOUNTS.map((amount) => (
            <button key={amount} type="button" aria-pressed={gross === amount} onClick={() => setGross(amount)}>
              {formatNumber(amount)}
            </button>
          ))}
        </div>
      </div>
      <div className="quick-answer">
        <p className="quick-label">Votre salaire net</p>
        <p className="quick-figure" role="status" data-long={result.net >= 100_000_000 || undefined}>
          <span className="sr-only-focusable">{formatAr(result.net)}</span>
          <span aria-hidden="true">{formatAr(net)}</span>
        </p>
        {gross > 0 && (
          <>
            <div className="quick-bar" aria-hidden="true">
              {parts.map((part) => (
                <span key={part.id} data-part={part.id} style={{ flexGrow: part.value }} />
              ))}
            </div>
            <dl className="quick-parts">
              {parts.map((part) => (
                <div key={part.id} data-part={part.id}>
                  <dt>{part.name}</dt>
                  <dd>{formatAr(part.value)}</dd>
                  <dd>{formatPercent(part.value / gross, 1)}</dd>
                </div>
              ))}
            </dl>
          </>
        )}
        <a className="quick-link" href={`${location.pathname}?brut=${gross}#calculateur`}>
          Voir le détail, tranche par tranche
          <ArrowIcon />
        </a>
      </div>
    </section>
  )
}

export default function Home() {
  const page = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (location.hash !== '#outils') return
    const frame = requestAnimationFrame(() => document.getElementById('outils')?.scrollIntoView())
    return () => cancelAnimationFrame(frame)
  }, [])
  useEffect(() => {
    const root = page.current
    if (!root) return
    const header = root.querySelector<HTMLElement>('.home-header')!
    const solid = new IntersectionObserver(
      ([entry]) => header.toggleAttribute('data-solid', entry.isIntersecting),
      { rootMargin: '0px 0px -92% 0px' },
    )
    solid.observe(root.querySelector('.home-sheet')!)
    const reveal = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          entry.target.setAttribute('data-in', '')
          reveal.unobserve(entry.target)
        }),
      { rootMargin: '0px 0px -12% 0px' },
    )
    root.querySelectorAll('[data-reveal]').forEach((el) => reveal.observe(el))
    return () => {
      solid.disconnect()
      reveal.disconnect()
    }
  }, [])

  return (
    <div className="home-page" ref={page}>
      <a href="#outils" className="sr-only-focusable btn btn-solid home-skip">
        Aller aux outils
      </a>
      <header className="home-header">
        <a href={location.pathname} className="home-wordmark">
          Karama-Ko
        </a>
        <nav aria-label="Navigation principale">
          <a href="#outils">Les outils</a>
          <a href="#atelier/sauvegardes">Mes simulations</a>
          <ThemeToggle />
        </nav>
      </header>
      <main>
        <BanknoteHero />
        <div className="home-sheet">
          <div id="outils" className="home-tools">
          <GrainField />
          <QuickCalculator />
          <section aria-labelledby="tools-title" className="tool-index">
            <div className="tool-index-heading" data-reveal>
              <h2 id="tools-title">Dix outils, chacun pour une question précise.</h2>
              <p>
                Tous partagent le même atelier : vos montants passent de l’un à l’autre sans ressaisie, et vos
                simulations restent sur votre appareil.
              </p>
            </div>
            <div className="bento" data-reveal>
              {BENTO.map(([id, size], i) => {
                const tool = TOOLS.find((t) => t.id === id)!
                return (
                  <a className="bento-tile" data-size={size} href={tool.href} key={id} style={{ '--i': i } as CSSProperties}>
                    <span className="tool-icon">
                      <ToolIcon id={id} />
                    </span>
                    <span className="bento-tag">{AUDIENCE[tool.group]}</span>
                    <h3>{size === 'mini' ? tool.short : tool.title}</h3>
                    <p>{tool.text}</p>
                    {(size === 'lead' || size === 'mid') && (
                      <p className="bento-info">
                        <span>Vous obtenez</span>
                        {tool.output}
                      </p>
                    )}
                    <span className="bento-arrow">
                      <ArrowIcon />
                    </span>
                  </a>
                )
              })}
            </div>
          </section>
          </div>
          <SiteFooter />
        </div>
      </main>
    </div>
  )
}
