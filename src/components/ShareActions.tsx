import { useEffect, useState, type ReactNode } from 'react'

const Icon = ({ children }: { children: ReactNode }) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.25"
    strokeLinecap="square"
    aria-hidden="true"
  >
    {children}
  </svg>
)

/** Copy the link, hand it to the native share sheet, or print the summary. */
export function ShareActions({ title }: { title: string }) {
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(timer)
  }, [copied])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(location.href)
      setCopied(true)
    } catch {
      /* clipboard refused: the link stays in the address bar */
    }
  }

  return (
    <div className="flex flex-wrap gap-3 print:hidden">
      <button type="button" className="btn btn-solid" onClick={copy}>
        <Icon>
          <rect x="5.5" y="5.5" width="8" height="8" />
          <path d="M10.5 5.5v-3h-8v8h3" />
        </Icon>
        <span aria-live="polite">{copied ? 'Lien copié' : 'Copier le lien'}</span>
      </button>
      {typeof navigator.share === 'function' && (
        <button
          type="button"
          className="btn btn-outline"
          onClick={() => navigator.share({ title, url: location.href }).catch(() => {})}
        >
          <Icon>
            <path d="M8 10.5v-8M5 5l3-3 3 3M3 8.5v5h10v-5" />
          </Icon>
          Partager
        </button>
      )}
      <button type="button" className="btn btn-outline" onClick={() => print()}>
        <Icon>
          <path d="M4.5 5.5v-3h7v3M4.5 11.5h-2v-6h11v6h-2M4.5 9.5h7v4h-7z" />
        </Icon>
        Imprimer
      </button>
    </div>
  )
}
