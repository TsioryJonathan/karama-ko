export function createApi(options?: {
  env?: Record<string, string | undefined>
  providers?: unknown[]
  fetcher?: typeof fetch
  limiter?: unknown
  log?: (line: string) => void
  context?: (value: unknown) => unknown | Promise<unknown>
}): {
  configured: boolean
  health(): Promise<Response>
  assistant(request: Request, ip?: string): Promise<Response>
}
