import { BrandLogo } from '../components/BrandLogo'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ThemeToggle } from '../components/ThemeToggle'
import { TOOLS, ToolIcon, type ToolGroupId, type ToolId } from './tools'

const GROUP_LABELS: Record<ToolGroupId, string> = {
  salary: 'Mon salaire',
  team: 'Recruter',
  workspace: 'Mon espace',
}

/** Disclosure menu: a labelled button that opens a panel of links or actions. */
export function Menu({
  label,
  icon,
  align = 'start',
  tone = 'plain',
  active,
  children,
}: {
  label: string
  icon?: ReactNode
  align?: 'start' | 'end'
  tone?: 'plain' | 'outline'
  active?: boolean
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setOpen(false)
      root.current?.querySelector('button')?.focus()
    }
    const close = () => setOpen(false)
    addEventListener('pointerdown', outside)
    addEventListener('keydown', escape)
    addEventListener('hashchange', close)
    return () => {
      removeEventListener('pointerdown', outside)
      removeEventListener('keydown', escape)
      removeEventListener('hashchange', close)
    }
  }, [open])
  return (
    <div className="menu" ref={root}>
      <button
        type="button"
        className="menu-trigger"
        aria-label={label}
        data-tone={tone}
        data-active={active || undefined}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {icon}
        <span>{label}</span>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m4 6 4 4 4-4" />
        </svg>
      </button>
      {open && (
        <div
          className="menu-panel"
          data-align={align}
          onClick={(event) => {
            if ((event.target as Element).closest('a, [data-close]')) setOpen(false)
          }}
        >
          {children}
        </div>
      )}
    </div>
  )
}

/** Shared top bar of every tool: where you are, every other tool, then the page's own actions. */
export function ToolBar({ current, children }: { current: ToolId; children?: ReactNode }) {
  const home = location.pathname
  return (
    <header className="studio-bar print:hidden">
      <a href={home} className="home-wordmark">
        <BrandLogo />
      </a>
      <nav aria-label="Outils Karama-Ko">
        {(Object.keys(GROUP_LABELS) as ToolGroupId[]).map((group) => {
          const tools = TOOLS.filter((tool) => tool.group === group)
          return (
            <Menu key={group} label={GROUP_LABELS[group]} active={tools.some((tool) => tool.id === current)}>
              {tools.map((tool) => (
                <a
                  key={tool.id}
                  className="menu-tool"
                  href={home + tool.href}
                  aria-current={tool.id === current ? 'page' : undefined}
                >
                  <span className="tool-icon">
                    <ToolIcon id={tool.id} size={20} />
                  </span>
                  <span>
                    <strong>{tool.title}</strong>
                    <small>{tool.text}</small>
                  </span>
                </a>
              ))}
            </Menu>
          )
        })}
      </nav>
      <div className="studio-bar-actions">
        {children}
        <ThemeToggle />
      </div>
    </header>
  )
}
