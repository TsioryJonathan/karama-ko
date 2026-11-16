import { useEffect, useRef, useState } from 'react'
import { compute } from '../engine/compute'
import type { Scenario } from '../engine/planning'
import { formatAr } from '../lib/format'
import { Markdown } from '../components/Markdown'
import { BrandFeedback } from '../components/BrandFeedback'
import { BrandMark } from '../components/BrandMark'
import { ActionIcon } from './tools'

/** Side panel: always one click away, and nothing is sent before the visitor presses send. */
export function Assistant({
  scenarios,
  open,
  onClose,
  tool,
  toolTitle,
  suggestions,
  ask: requested,
}: {
  scenarios: Scenario[]
  open: boolean
  onClose: () => void
  tool: string
  toolTitle: string
  suggestions: string[]
  /** A question the visitor asked by tapping « Pourquoi ce résultat ? »: answered at once. */
  ask?: { id: number; question: string }
}) {
  const [configured, setConfigured] = useState<boolean | null>(null)
  const [question, setQuestion] = useState(suggestions[0])
  /** What was sent, frozen: the field is free to be typed in again. */
  const [asked, setAsked] = useState('')
  const [answer, setAnswer] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const controller = useRef<AbortController | null>(null)
  const field = useRef<HTMLTextAreaElement>(null)
  // Asked once, when the panel is first opened: pages that never open it make no request at all.
  useEffect(() => {
    if (!open || configured !== null) return
    const abort = new AbortController()
    fetch('/api/health', { signal: abort.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setConfigured(data?.aiConfigured === true))
      .catch(() => {
        if (!abort.signal.aborted) setConfigured(false)
      })
    return () => abort.abort()
  }, [open, configured])
  useEffect(() => () => controller.current?.abort(), [])
  useEffect(() => {
    if (!open) return
    field.current?.focus()
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    addEventListener('keydown', close)
    return () => removeEventListener('keydown', close)
  }, [open, onClose])

  // Results are tied to the exact snapshot that was sent, not to later edits.
  const [snapshot, setSnapshot] = useState('')
  const context = scenarios.map((s) => ({ name: s.name, gross: s.gross, dependants: s.dependants }))
  const current = JSON.stringify(context)
  const stale = !!answer && current !== snapshot
  const send = async (sent = question) => {
    controller.current?.abort()
    const abort = new AbortController()
    controller.current = abort
    setAsked(sent)
    setQuestion('')
    setBusy(true)
    setError('')
    setAnswer('')
    setSnapshot(current)
    try {
      const response = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abort.signal,
        body: JSON.stringify({ question: sent, scenarios: context, tool }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'L’explication est indisponible pour le moment.')
      setAnswer(data.answer)
    } catch (e) {
      if (!abort.signal.aborted)
        setError(e instanceof Error ? e.message : 'Impossible de joindre l’assistant.')
    } finally {
      if (controller.current === abort) setBusy(false)
    }
  }
  const ready = configured === true && !busy
  // Another tool means another conversation: start clean with that tool's own first question.
  useEffect(() => {
    controller.current?.abort()
    setBusy(false)
    setAnswer('')
    setAsked('')
    setError('')
    setQuestion(suggestions[0])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tool])
  const latest = useRef(send)
  latest.current = send
  const handled = useRef(0)
  useEffect(() => {
    if (!requested || requested.id === handled.current || configured === null) return
    handled.current = requested.id
    if (configured) void latest.current(requested.question)
  }, [requested, configured])
  const known = scenarios.map((s) => ({ ...s, result: compute(s.gross, s.dependants) }))

  return (
    <aside className="assistant print:hidden" aria-labelledby="assistant-title" data-open={open || undefined} inert={!open}>
      <header>
        <span className="assistant-mark">
          <BrandMark size={36} />
        </span>
        <h2 id="assistant-title">Vos questions</h2>
        <button type="button" className="icon-button" aria-label="Fermer l’assistant" onClick={onClose}>
          <ActionIcon id="close" />
        </button>
      </header>
      <div className="assistant-body">
        <section className="assistant-known" aria-label="Ce que l’assistant sait de votre simulation">
          <p>
            Je pars de ce que vous avez saisi dans <strong>{toolTitle}</strong> :
          </p>
          <ul>
            {known.map((k, i) => (
              <li key={i}>
                <span>{k.name || 'Sans nom'}</span>
                <span>
                  {formatAr(k.gross)} brut, {k.dependants} à charge
                  <b>{formatAr(k.result.net)} net</b>
                </span>
              </li>
            ))}
          </ul>
        </section>
        {open && configured === null && (
          <BrandFeedback state="loading" className="assistant-busy">
            Connexion à l’assistant…
          </BrandFeedback>
        )}
        {open && configured === false && (
          <BrandFeedback state="offline" className="studio-notice">
            L’assistant n’est pas connecté sur cette installation. Les outils de calcul restent disponibles.
          </BrandFeedback>
        )}
        {!answer && !busy && (
          <div className="assistant-suggestions">
            <p>Questions fréquentes</p>
            {suggestions.map((suggestion) => (
              <button key={suggestion} type="button" disabled={!ready} onClick={() => send(suggestion)}>
                <ActionIcon id="arrow" />
                {suggestion}
              </button>
            ))}
          </div>
        )}
        {busy && (
          <BrandFeedback state="loading" className="assistant-busy">
            Préparation de l’explication…
          </BrandFeedback>
        )}
        {error && (
          <BrandFeedback state={navigator.onLine ? 'error' : 'offline'} role="alert" className="studio-notice">
            {error}
          </BrandFeedback>
        )}
        {stale && (
          <p className="studio-notice">
            Vous avez modifié les montants. Cette réponse concerne la simulation précédente ; reposez la
            question pour les nouveaux montants.
          </p>
        )}
        {answer && (
          <div className="assistant-answer" aria-live="polite">
            <p className="assistant-asked">{asked}</p>
            <Markdown text={answer} />
            <small>Réponse générée par une IA : les montants calculés par les outils font foi.</small>
          </div>
        )}
      </div>
      <form
        className="assistant-form"
        onSubmit={(event) => {
          event.preventDefault()
          if (ready && question.trim()) void send()
        }}
      >
        <label htmlFor="assistant-question">Votre question</label>
        <div>
          <textarea
            id="assistant-question"
            ref={field}
            placeholder="Posez une autre question…"
            maxLength={1200}
            rows={2}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                event.currentTarget.form?.requestSubmit()
              }
            }}
          />
          {busy ? (
            <button
              type="button"
              className="icon-button"
              aria-label="Annuler la demande"
              onClick={() => {
                controller.current?.abort()
                setBusy(false)
              }}
            >
              <ActionIcon id="close" />
            </button>
          ) : (
            <button type="submit" className="icon-button" aria-label="Envoyer la question" disabled={!ready || !question.trim()}>
              <ActionIcon id="send" />
            </button>
          )}
        </div>
        <p>
          Envoyer transmet votre question, les salaires bruts, les personnes à charge et les noms des
          simulations à un service d’IA, via le serveur Karama-Ko. N’y mettez aucune information
          personnelle. <a href="#confidentialite">En savoir plus</a>
        </p>
      </form>
    </aside>
  )
}
