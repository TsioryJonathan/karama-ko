// Vercel function: POST /api/track
import { createApi } from '../server/api.mjs'

const api = createApi()

export default {
  fetch(request) {
    // On Vercel the platform sets this header itself; it cannot be forged by the visitor.
    const ip = request.headers.get('x-real-ip') || request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown'
    return api.track(request, ip)
  },
}
