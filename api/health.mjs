// Vercel function: GET /api/health
import { createApi } from '../server/api.mjs'

const api = createApi()

export default {
  fetch: () => api.health(),
}
