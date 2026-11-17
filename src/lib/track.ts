/**
 * Anonymous counters: « a visit happened », « this tool was opened », « this option was used ».
 * Nothing the visitor types is sent, no cookie is set, no address is kept. Each event is reported once per
 * browser tab session, and not at all when the browser asks not to be tracked (Do Not Track, Global Privacy Control).
 */
export type TrackKind = 'visit' | 'tool' | 'option'

const reported = new Set<string>()

export function refusesTracking(): boolean {
  try {
    const nav = navigator as Navigator & { globalPrivacyControl?: boolean }
    return nav.doNotTrack === '1' || nav.globalPrivacyControl === true
  } catch {
    return true
  }
}

export function track(kind: TrackKind, name: string): void {
  try {
    if (refusesTracking()) return
    // Offline, a failed request would only fill the console: it is tried again at the next visit.
    if (navigator.onLine === false) return
    const key = `${kind}:${name}`
    if (reported.has(key)) return
    reported.add(key)
    try {
      // Once per tab session, even after a reload.
      if (sessionStorage.getItem(`karama:seen:${key}`)) return
      sessionStorage.setItem(`karama:seen:${key}`, '1')
    } catch {
      /* storage blocked: the in-memory guard above still limits it to once per page load */
    }
    void fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind, name }),
      keepalive: true,
    }).catch(() => {})
  } catch {
    /* a counter must never break the page */
  }
}

/** Test helper: forget what was reported. */
export function resetTracking(): void {
  reported.clear()
}
