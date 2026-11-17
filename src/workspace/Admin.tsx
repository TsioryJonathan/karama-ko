import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { BrandLogo } from '../components/BrandLogo'
import { ThemeToggle } from '../components/ThemeToggle'
import { PANELS } from './state'

interface Summary {
  days: number
  visits: number
  daily: { day: string; visits: number; asked: number }[]
  tools: { name: string; count: number }[]
  options: { name: string; count: number }[]
  assistant: { asked: number; answered: number; refused: number; failed: number; avgMs: number }
}

const TOOL_LABELS: Record<string, string> = {
  calculateur: 'Calculer mon salaire',
  ...Object.fromEntries(PANELS.map((p) => [p.id, p.label])),
}
const OPTION_LABELS: Record<string, string> = {
  overtime: 'Heures supplémentaires',
  premiums: 'Nuit, dimanche, jours fériés',
  ostie: 'OSTIE modifié',
  cadre: 'Statut cadre',
  share: 'Lien de partage copié',
}
const PERIODS = [7, 30, 90]
const number = new Intl.NumberFormat('fr-FR')

function Bars({ rows, labels, empty }: { rows: { name: string; count: number }[]; labels: Record<string, string>; empty: string }) {
  const max = Math.max(1, ...rows.map((r) => r.count))
  if (rows.every((r) => r.count === 0)) return <p className="text-14 text-muted">{empty}</p>
  return (
    <table className="w-full text-16">
      <thead className="sr-only">
        <tr>
          <th scope="col">Nom</th>
          <th scope="col">Nombre</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.name} className="border-t border-line">
            <th scope="row" className="w-1/2 py-2 pr-3 text-left font-medium">
              {labels[r.name] ?? r.name}
            </th>
            <td className="py-2">
              <div className="flex items-center gap-3">
                <span className="h-2 rounded bg-accent" style={{ width: `${Math.max(2, (r.count / max) * 100)}%`, opacity: r.count ? 1 : 0.2 }} aria-hidden="true" />
                <span className="figure shrink-0 tabular-nums">{number.format(r.count)}</span>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function Figure({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-lg bg-surface p-4">
      <dt className="text-14 text-muted">{label}</dt>
      <dd className="figure mt-1 text-28 font-bold tabular-nums">{value}</dd>
      {detail && <dd className="mt-1 text-14 text-muted">{detail}</dd>}
    </div>
  )
}

export default function Admin() {
  const [authenticated, setAuthenticated] = useState(false)
  const [typed, setTyped] = useState('')
  const [days, setDays] = useState(30)
  const [data, setData] = useState<Summary | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const load = useCallback(
    async (span: number, signal?: AbortSignal) => {
      setLoading(true)
      setError('')
      try {
        const response = await fetch(`/api/metrics?days=${span}`, { credentials: 'same-origin', cache: 'no-store', signal })
        const body = await response.json().catch(() => ({}))
        if (response.status === 401) {
          setAuthenticated(false)
          setData(null)
          setError('')
          return
        }
        if (!response.ok) throw new Error(body.error || 'Impossible de charger les mesures.')
        setAuthenticated(true)
        setData(body as Summary)
      } catch (e) {
        if (!signal?.aborted) setError(e instanceof Error ? e.message : 'Impossible de charger les mesures.')
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  useEffect(() => {
    // Remove passwords saved by earlier versions; never reuse them.
    try { sessionStorage.removeItem('karama:admin') } catch { /* storage blocked */ }
    const controller = new AbortController()
    void load(days, controller.signal)
    return () => controller.abort()
  }, [days, load])

  const signIn = async (event: FormEvent) => {
    event.preventDefault()
    if (!typed || loading) return
    const password = typed
    setTyped('')
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/admin-session', {
        method: 'POST', credentials: 'same-origin', cache: 'no-store',
        headers: { 'Content-Type': 'application/json', 'X-Karama-Admin': '1' },
        body: JSON.stringify({ password }),
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body.error || 'Connexion impossible.')
      await load(days)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Connexion impossible.')
    } finally { setLoading(false) }
  }
  const signOut = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/admin-session', {
        method: 'DELETE', credentials: 'same-origin', cache: 'no-store',
        headers: { 'X-Karama-Admin': '1' },
      })
      if (!response.ok) throw new Error('Déconnexion impossible. Réessayez.')
      setAuthenticated(false)
      setData(null)
    } catch (e) { setError(e instanceof Error ? e.message : 'Déconnexion impossible.') }
    finally { setLoading(false) }
  }

  const assistant = data?.assistant
  const peak = Math.max(1, ...(data?.daily.map((d) => d.visits) ?? [1]))
  const success = assistant && assistant.asked ? Math.round((assistant.answered / assistant.asked) * 100) : null

  return (
    <div className="legal-page">
      <header className="legal-header">
        <a href={location.pathname} className="home-wordmark">
          <BrandLogo />
        </a>
        <nav aria-label="Navigation principale">
          {authenticated && (
            <button type="button" className="btn btn-outline" onClick={signOut} disabled={loading}>
              Se déconnecter
            </button>
          )}
          <ThemeToggle />
        </nav>
      </header>
      <main className="mx-auto w-full max-w-5xl px-4 pb-16 pt-8 lg:px-8">
        <h1 className="text-40 font-bold">Tableau de bord</h1>
        <p className="mt-2 max-w-2xl text-16 text-muted">
          Compteurs anonymes : jamais de montant, de question, d’adresse ni de cookie. Une visite compte une fois par onglet, et pas du
          tout si le navigateur refuse le suivi.
        </p>

        {!authenticated ? (
          <form onSubmit={signIn} className="mt-8 max-w-sm space-y-3">
            <div className="studio-field">
              <label htmlFor="admin-password">Mot de passe</label>
              <input
                id="admin-password"
                className="studio-input"
                type="password"
                autoComplete="current-password"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                aria-describedby={error ? 'admin-error' : undefined}
                aria-invalid={error ? true : undefined}
              />
            </div>
            {error && (
              <p id="admin-error" role="alert" className="text-14 text-warning">
                {error}
              </p>
            )}
            <button type="submit" className="btn btn-accent" disabled={!typed || loading}>
              Ouvrir
            </button>
          </form>
        ) : (
          <>
            <div className="mt-6 flex flex-wrap items-center gap-2" role="group" aria-label="Période">
              {PERIODS.map((p) => (
                <button
                  key={p}
                  type="button"
                  className={`btn ${days === p ? 'btn-accent' : 'btn-outline'}`}
                  aria-pressed={days === p}
                  onClick={() => setDays(p)}
                >
                  {p} jours
                </button>
              ))}
              {loading && <span className="text-14 text-muted" role="status">Chargement…</span>}
            </div>
            {error && (
              <p role="alert" className="mt-4 text-16 text-warning">
                {error}
              </p>
            )}
            {data && assistant && (
              <>
                <dl className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Figure label="Visites" value={number.format(data.visits)} detail={`sur ${data.days} jours`} />
                  <Figure label="Questions à l’assistant" value={number.format(assistant.asked)} detail={`${number.format(assistant.refused)} refusées`} />
                  <Figure
                    label="Réponses réussies"
                    value={success === null ? '—' : `${success} %`}
                    detail={`${number.format(assistant.answered)} réponses, ${number.format(assistant.failed)} échecs`}
                  />
                  <Figure
                    label="Temps de réponse moyen"
                    value={assistant.answered ? `${(assistant.avgMs / 1000).toFixed(1).replace('.', ',')} s` : '—'}
                    detail="des réponses réussies"
                  />
                </dl>

                <section className="mt-10" aria-labelledby="daily">
                  <h2 id="daily" className="text-20 font-bold">
                    Visites par jour
                  </h2>
                  <div
                    className="mt-3 flex h-40 items-end gap-px rounded-lg bg-surface p-3"
                    role="img"
                    aria-label={`Visites par jour sur ${data.days} jours, au plus ${peak} en une journée. Le détail est dans le tableau dessous.`}
                  >
                    {data.daily.map((d) => (
                      <div
                        key={d.day}
                        className="min-w-px flex-1 rounded-t bg-accent"
                        style={{ height: `${Math.max(d.visits ? 3 : 1, (d.visits / peak) * 100)}%`, opacity: d.visits ? 1 : 0.25 }}
                        title={`${d.day} : ${d.visits} visite${d.visits > 1 ? 's' : ''}`}
                      />
                    ))}
                  </div>
                  <div className="mt-1 flex justify-between text-14 text-muted" aria-hidden="true">
                    <span>{data.daily[0]?.day}</span>
                    <span>{data.daily.at(-1)?.day}</span>
                  </div>
                  <details className="mt-3">
                    <summary className="cursor-pointer text-16 font-medium">Voir le tableau jour par jour</summary>
                    <table className="mt-2 w-full text-16">
                      <thead>
                        <tr className="text-left text-14 text-muted">
                          <th scope="col">Jour</th>
                          <th scope="col">Visites</th>
                          <th scope="col">Questions à l’assistant</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...data.daily].reverse().map((d) => (
                          <tr key={d.day} className="border-t border-line">
                            <th scope="row" className="py-1 text-left font-medium">
                              {d.day}
                            </th>
                            <td className="figure tabular-nums">{number.format(d.visits)}</td>
                            <td className="figure tabular-nums">{number.format(d.asked)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </details>
                </section>

                <div className="mt-10 grid gap-10 lg:grid-cols-2">
                  <section aria-labelledby="tools">
                    <h2 id="tools" className="text-20 font-bold">
                      Outils utilisés
                    </h2>
                    <p className="mb-2 text-14 text-muted">Nombre de visites ayant ouvert l’outil.</p>
                    <Bars rows={data.tools} labels={TOOL_LABELS} empty="Aucun outil ouvert sur la période." />
                  </section>
                  <section aria-labelledby="options">
                    <h2 id="options" className="text-20 font-bold">
                      Options utilisées
                    </h2>
                    <p className="mb-2 text-14 text-muted">Nombre de visites ayant utilisé l’option dans le calculateur.</p>
                    <Bars rows={data.options} labels={OPTION_LABELS} empty="Aucune option utilisée sur la période." />
                  </section>
                </div>
              </>
            )}
          </>
        )}
      </main>
    </div>
  )
}
