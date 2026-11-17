import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

/** The public address, used by the canonical link, the share previews and the sitemap. */
const SITE_URL = (
  process.env.SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:5173')
).replace(/\/$/, '')

/** Fills %SITE_URL% in the page, and writes robots.txt and sitemap.xml next to it. */
const seo = (): Plugin => ({
  name: 'karama-seo',
  transformIndexHtml: (html) => html.replaceAll('%SITE_URL%', SITE_URL),
  generateBundle() {
    const today = new Date().toISOString().slice(0, 10)
    this.emitFile({
      type: 'asset',
      fileName: 'robots.txt',
      source: `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${SITE_URL}/sitemap.xml\n`,
    })
    this.emitFile({
      type: 'asset',
      fileName: 'sitemap.xml',
      source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url>\n    <loc>${SITE_URL}/</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>1.0</priority>\n  </url>\n</urlset>\n`,
    })
  },
})

/**
 * `pnpm dev` serves the assistant too: the same API as in production, behind the same address,
 * reading its keys from .env. No second server to start.
 */
const devApi = (): Plugin => ({
  name: 'karama-dev-api',
  apply: 'serve',
  async configureServer(server) {
    // Loaded by address at run time, on purpose: written as plain imports, the config bundler would try to
    // resolve the production engine (dist-server), which does not exist yet when the first build starts.
    const load = (file: string) => import(/* @vite-ignore */ pathToFileURL(resolve(process.cwd(), file)).href)
    const [{ createApi }, { readRequest, sendResponse, visitorAddress }] = await Promise.all([
      load('server/api.mjs'),
      load('server/node-adapter.mjs'),
    ])
    const env = { ...loadEnv(server.config.mode, process.cwd(), ''), APP_ORIGIN: '' }
    const api = createApi({
      env,
      context: async (value: unknown) => (await server.ssrLoadModule('/src/engine/assistant.ts')).assistantContext(value),
    })
    server.middlewares.use('/api', async (req, res, next) => {
      const path = new URL(req.url ?? '/', 'http://localhost').pathname
      if (!['/health', '/assistant', '/track', '/metrics'].includes(path)) return next()
      const request = await readRequest(req)
      if (!request) return sendResponse(res, Response.json({ error: 'Demande trop volumineuse.' }, { status: 413 }))
      const ip = visitorAddress(req)
      await sendResponse(
        res,
        path === '/health'
          ? await api.health()
          : path === '/track'
            ? await api.track(request, ip)
            : path === '/metrics'
              ? await api.metrics(request, ip)
              : await api.assistant(request, ip),
      )
    })
    if (!api.configured) server.config.logger.info('  Assistant: aucune clé dans .env, il restera désactivé.')
    else server.config.logger.info('  Assistant: prêt (clés lues dans .env).')
  },
})

export default defineConfig({
  plugins: [
    seo(),
    devApi(),
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        // The error page is the app itself, and the brand preview is a design sheet: neither is worth caching.
        globIgnores: ['404.html', 'brand/preview.*'],
      },
      manifest: {
        name: 'Karama-Ko · Salaire net et IRSA',
        short_name: 'Karama-Ko',
        description: 'Du salaire brut au net à Madagascar : IRSA, CNaPS, OSTIE et coût employeur.',
        lang: 'fr',
        display: 'standalone',
        start_url: '.',
        background_color: '#f4f2ed',
        theme_color: '#7a2640',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
})
