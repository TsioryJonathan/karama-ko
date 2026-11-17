// Vercel function: GET /api/metrics, for the dashboard (needs ADMIN_TOKEN)
import { createApi } from '../server/api.mjs'

const api = createApi()

export default {
  fetch(request) {
    const ip = request.headers.get('x-real-ip') || request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown'
    return api.metrics(request, ip)
  },
}
