// Node's request and response objects, translated to and from the Web Request and Response
// that the API speaks, so the same API runs under the production server and the Vite dev server.

/** @returns {Promise<Request | null>} null when the body is larger than `limit` bytes. */
export async function readRequest(req, limit = 12_000) {
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > limit) return null
    chunks.push(chunk)
  }
  const headers = new Headers()
  for (const [name, value] of Object.entries(req.headers)) if (value !== undefined) headers.set(name, [value].flat().join(', '))
  const body = ['GET', 'HEAD'].includes(req.method) ? undefined : Buffer.concat(chunks)
  return new Request(new URL(req.url, `http://${req.headers.host || 'localhost'}`), { method: req.method, headers, body })
}

export async function sendResponse(res, response) {
  res.writeHead(response.status, Object.fromEntries(response.headers))
  res.end(Buffer.from(await response.arrayBuffer()))
}

/** The address a request comes from; forwarded headers count only when `trustProxy` says so. */
export function visitorAddress(req, trustProxy = false) {
  const forwarded = trustProxy ? String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() : ''
  return forwarded || req.socket.remoteAddress || 'unknown'
}
