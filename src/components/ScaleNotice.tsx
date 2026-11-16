import { scaleStatus, UPCOMING_WITHIN_DAYS } from '../scales'

const long = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { dateStyle: 'long' })

/**
 * Warns when the scale may be out of date, or announces the next one.
 * Silent otherwise: a notice that is always there is a notice nobody reads.
 */
export function ScaleNotice() {
  const status = scaleStatus()
  const upcoming = status.next && (status.daysUntilNext ?? Infinity) <= UPCOMING_WITHIN_DAYS
  if (!status.stale && !upcoming) return null
  return (
    <aside className="scale-notice print:hidden" role="note" aria-label="État du barème">
      {upcoming && status.next && (
        <p>
          <strong>Un nouveau barème entre en vigueur le {long(status.next.effectiveFrom)}.</strong> Les calculs
          utilisent le barème en vigueur aujourd’hui ; ils changeront à cette date.
        </p>
      )}
      {status.stale && (
        <p>
          <strong>Ce barème a été vérifié il y a plus de six mois ({long(status.current.updatedAt)}).</strong> Les
          taux ont pu changer depuis : confirmez-les avec les <a href="#baremes">sources officielles</a> avant de
          vous y fier.
        </p>
      )}
    </aside>
  )
}
