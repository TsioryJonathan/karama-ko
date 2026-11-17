import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resetTracking, track } from './track'

function stubBrowser({ dnt = null, gpc = false, online = true }: { dnt?: string | null; gpc?: boolean; online?: boolean } = {}) {
  const store = new Map<string, string>()
  const fetchMock = vi.fn(() => Promise.resolve(new Response(null, { status: 204 })))
  vi.stubGlobal('navigator', { doNotTrack: dnt, globalPrivacyControl: gpc, onLine: online })
  vi.stubGlobal('sessionStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('anonymous counters', () => {
  beforeEach(() => resetTracking())
  afterEach(() => vi.unstubAllGlobals())

  it('reports an event once, with only its kind and name', () => {
    const fetchMock = stubBrowser()
    track('tool', 'comparer')
    track('tool', 'comparer')
    track('tool', 'fin')
    expect(fetchMock).toHaveBeenCalledTimes(2)
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('/api/track')
    expect(JSON.parse(String(init.body))).toEqual({ kind: 'tool', name: 'comparer' })
    expect(init.credentials).toBeUndefined()
  })

  it('does not report again after a reload in the same tab', () => {
    const fetchMock = stubBrowser()
    track('visit', 'site')
    resetTracking() // a reload empties the page's memory, not the tab's storage
    track('visit', 'site')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('respects Do Not Track and Global Privacy Control', () => {
    let fetchMock = stubBrowser({ dnt: '1' })
    track('visit', 'site')
    expect(fetchMock).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
    resetTracking()
    fetchMock = stubBrowser({ gpc: true })
    track('visit', 'site')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('sends nothing while offline, and reports later', () => {
    let fetchMock = stubBrowser({ online: false })
    track('visit', 'site')
    expect(fetchMock).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
    fetchMock = stubBrowser()
    track('visit', 'site')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('never throws, whatever the browser does', () => {
    stubBrowser()
    vi.stubGlobal('fetch', () => {
      throw new Error('offline')
    })
    expect(() => track('option', 'ostie')).not.toThrow()
    vi.stubGlobal('navigator', undefined)
    expect(() => track('option', 'cadre')).not.toThrow()
  })
})
