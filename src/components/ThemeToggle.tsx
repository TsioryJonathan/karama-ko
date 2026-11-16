import { useState } from 'react'

export function ThemeToggle() {
  const [dark, setDark] = useState(() => document.documentElement.dataset.theme === 'dark')
  return (
    <button
      type="button"
      aria-pressed={dark}
      aria-label="Thème sombre"
      title={dark ? 'Passer au thème clair' : 'Passer au thème sombre'}
      className="flex h-11 w-11 items-center justify-center rounded hover:bg-raised"
      onClick={() => {
        const next = !dark
        document.documentElement.dataset.theme = next ? 'dark' : 'light'
        try {
          localStorage.setItem('karama:theme', next ? 'dark' : 'light')
        } catch {
          /* storage unavailable */
        }
        setDark(next)
      }}
    >
      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
        <circle cx="9" cy="9" r="7.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M9 1.75a7.25 7.25 0 0 1 0 14.5z" fill="currentColor" />
      </svg>
    </button>
  )
}
