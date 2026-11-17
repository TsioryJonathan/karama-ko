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
    const storageKey = `karama:seen:${key}`
    try {
      // Once per tab session, even after a reload.
      if (sessionStorage.getItem(storageKey)) return
    } catch {
      /* storage blocked: the in-memory guard still limits it to once per page load */
    }
    reported.add(key)
    // Only a stored event (204) is remembered: if the server was unreachable or not set up, it is tried again.
    void fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind, name }),
      keepalive: true,
    })
      .then((response) => {
        if (response.status !== 204) return void reported.delete(key)
        try {
          sessionStorage.setItem(storageKey, '1')
        } catch {
          /* storage blocked */
        }
      })
      .catch(() => reported.delete(key))
  } catch {
    /* a counter must never break the page */
  }
}

/** Test helper: forget what was reported. */
export function resetTracking(): void {
  reported.clear()
}
