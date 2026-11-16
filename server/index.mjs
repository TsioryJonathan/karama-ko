import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { brotliCompress, gzip } from 'node:zlib'
import { promisify } from 'node:util'
import { resolve, extname, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createApi } from './api.mjs'
import { readRequest, sendResponse, visitorAddress } from './node-adapter.mjs'

const ROOT = resolve(fileURLToPath(new URL('../dist', import.meta.url)))
const brotli = promisify(brotliCompress)
const deflate = promisify(gzip)
const COMPRESSIBLE = new Set(['.html', '.js', '.css', '.json', '.webmanifest', '.svg'])
const compressed = new Map()
/** Hash of each inline script, so the policy can forbid every other one. */
function inlineScriptHashes(html) {
  return [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(
    (match) => `'sha256-${createHash('sha256').update(match[1]).digest('base64')}'`,
  )
}
const security = (html) => ({
  'Content-Security-Policy': [
    "default-src 'self'",
    `script-src 'self' ${inlineScriptHashes(html).join(' ')}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self'",
    "worker-src 'self'",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
  ].join('; '),
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
})
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.woff2': 'font/woff2',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
}

export function createApp({ env = process.env, trustProxy = env.TRUST_PROXY === '1', ...options } = {}) {
  const api = createApi({ env, ...options })
  const json = (res, status, data) => {
    res.writeHead(status, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    })
    res.end(JSON.stringify(data))
  }
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost')
      if (url.pathname.startsWith('/api/')) {
        const handler =
          url.pathname === '/api/health' && req.method === 'GET'
            ? () => api.health()
            : url.pathname === '/api/assistant'
              ? (request) => api.assistant(request, visitorAddress(req, trustProxy))
              : null
        if (!handler) {
          json(res, 404, { error: 'Service inconnu.' })
          return
        }
        const request = await readRequest(req)
        if (!request) {
          json(res, 413, { error: 'Demande trop volumineuse.' })
          return
        }
        await sendResponse(res, await handler(request))
        return
      }
      if (!['GET', 'HEAD'].includes(req.method)) {
        json(res, 405, { error: 'Méthode non autorisée.' })
        return
      }
      let path = resolve(ROOT, '.' + decodeURIComponent(url.pathname))
      if (path !== ROOT && !path.startsWith(ROOT + sep)) {
        json(res, 403, { error: 'Accès interdit.' })
        return
      }
      let status = 200
      try {
        if ((await stat(path)).isDirectory()) path = resolve(path, 'index.html')
      } catch {
        if (extname(path)) {
          json(res, 404, { error: 'Fichier introuvable.' })
          return
        }
        // Every real page lives at the root: any other address is a genuine 404 that the app explains.
        path = resolve(ROOT, 'index.html')
        status = 404
      }
      const type = extname(path)
      let content = await readFile(path)
      const headers = {
        'Content-Type': TYPES[type] || 'application/octet-stream',
        // Built files carry a hash in their name and never change; the page itself is always revalidated.
        'Cache-Control':
          type === '.html' || path.endsWith('/sw.js')
            ? 'no-cache'
            : path.includes(`${sep}assets${sep}`) || type === '.woff2'
              ? 'public, max-age=31536000, immutable'
              : 'public, max-age=3600',
        Vary: 'Accept-Encoding',
        ...(type === '.html' ? security(content.toString()) : { 'X-Content-Type-Options': 'nosniff' }),
      }
      const wanted = String(req.headers['accept-encoding'] || '')
      const encoding = COMPRESSIBLE.has(type) ? (/\bbr\b/.test(wanted) ? 'br' : /\bgzip\b/.test(wanted) ? 'gzip' : '') : ''
      if (encoding) {
        // The file's own date is part of the key: a rebuilt file of the same size must not be served from the old copy.
        const key = `${path}:${encoding}:${(await stat(path)).mtimeMs}:${content.length}`
        if (!compressed.has(key))
          compressed.set(key, encoding === 'br' ? await brotli(content) : await deflate(content))
        content = compressed.get(key)
        headers['Content-Encoding'] = encoding
      }
      headers['Content-Length'] = content.length
      res.writeHead(status, headers)
      res.end(req.method === 'HEAD' ? undefined : content)
    } catch {
      if (!res.headersSent) json(res, 500, { error: 'Impossible de traiter la demande.' })
      else res.end()
    }
  })
  server.requestTimeout = 15_000
  server.headersTimeout = 10_000
  return server
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT) || 8787
  createApp().listen(port, process.env.HOST || '127.0.0.1', () =>
    console.log(`Karama server ready on http://${process.env.HOST || '127.0.0.1'}:${port}`),
  )
}
