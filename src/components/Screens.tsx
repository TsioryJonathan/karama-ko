import type { ReactNode } from 'react'
import { GrainField } from './GrainField'
import { BrandMark, type BrandState } from './BrandMark'

/** Shared layout of every page that is not a tool: loading, not found, failure. */
export function StatusPage({
  code,
  title,
  children,
  actions,
  role,
  state = 'empty',
}: {
  code?: string
  title: string
  children: ReactNode
  actions?: ReactNode
  role?: 'alert' | 'status'
  state?: BrandState
}) {
  return (
    <div className="status-page">
      <GrainField fixed />
      <header>
        <a href="/" className="home-wordmark">
          Karama-Ko
        </a>
      </header>
      <main role={role}>
        <div className="status-art">
          <BrandMark state={state} size={160} />
          {code && <p aria-hidden="true">{code}</p>}
        </div>
        <h1>{title}</h1>
        <div className="status-text">{children}</div>
        {actions && <div className="status-actions">{actions}</div>}
      </main>
    </div>
  )
}

/** Shown while a page's code downloads. It only appears if the wait is noticeable. */
export function LoadingScreen() {
  return (
    <div className="loading-screen" role="status">
      <BrandMark state="loading" size={112} />
      <p className="home-wordmark">Karama-Ko</p>
      <p>Préparation de votre atelier…</p>
    </div>
  )
}

export function NotFoundScreen() {
  return (
    <StatusPage code="404" title="Cette page n’existe pas">
      <p>Le lien est peut-être incomplet, ou l’outil a changé de place. Vos simulations, elles, n’ont pas bougé.</p>
      <ul>
        <li>
          <a href="/#calculateur">Calculer mon salaire</a>
        </li>
        <li>
          <a href="/#outils">Voir les dix outils</a>
        </li>
        <li>
          <a href="/#atelier/sauvegardes">Retrouver mes simulations</a>
        </li>
      </ul>
    </StatusPage>
  )
}

export function ErrorScreen({ error, offline }: { error: Error; offline: boolean }) {
  const loading = /dynamically imported|Failed to fetch|Importing a module|Load failed|NetworkError/i.test(error.message)
  return (
    <StatusPage
      role="alert"
      state={offline ? 'offline' : 'error'}
      code={loading ? 'Hors ligne ?' : 'Oups'}
      title={loading ? 'Cette page n’a pas pu se charger' : 'Quelque chose s’est mal passé'}
      actions={
        <>
          <button className="btn btn-accent" onClick={() => location.reload()}>
            Recharger la page
          </button>
          <a className="btn btn-ghost" href="/">
            Retour à l’accueil
          </a>
        </>
      }
    >
      {loading ? (
        <p>
          {offline
            ? 'Vous semblez être hors connexion. Reconnectez-vous, puis rechargez la page.'
            : 'La connexion a été interrompue pendant le chargement, ou le site vient d’être mis à jour. Recharger la page suffit en général.'}
        </p>
      ) : (
        <p>
          Une erreur inattendue a interrompu l’affichage. Vos simulations enregistrées sont conservées sur cet
          appareil : recharger la page les retrouve.
        </p>
      )}
      <details>
        <summary>Détail technique, à joindre à un signalement</summary>
        <pre>{error.name}: {error.message}</pre>
        <p>
          Signaler le problème :{' '}
          <a href="https://github.com/TsioryJonathan" target="_blank" rel="noreferrer">
            github.com/TsioryJonathan
          </a>
        </p>
      </details>
    </StatusPage>
  )
}
