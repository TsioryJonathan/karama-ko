# Deploying Karama-Ko

Karama-Ko is a static site (built into `dist/`) and a small Node API (`server/`). The API serves the assistant, the anonymous counters and the dashboard. Every tool works without the API.

| Where | How | What works |
| --- | --- | --- |
| **Vercel** | Import the repository; the API runs as functions (`api/*.mjs`) | Everything |
| **Render, Fly, Railway, any Docker host** | The `Dockerfile` | Everything |
| **Your own server** | `pnpm build && pnpm start` (Node 22.9+) | Everything |
| **Static hosting** (GitHub Pages, Netlify drop, S3) | Upload `dist/` | Every tool; no assistant, no counters, no dashboard |

Whatever the host, the same code answers: `server/api.mjs` takes a Web `Request` and returns a `Response`; the Vercel functions and the Node server are thin wrappers around it.

## Environment variables

All are optional. Without any, the site and every tool work; the assistant and the dashboard say they are not configured.

| Variable | Used by | Default | What it does |
| --- | --- | --- | --- |
| `AI_PROVIDERS` | API | every provider that has a key | Order of the assistant's providers: the first answers, the next take over |
| `GROQ_API_KEYS`, `GEMINI_API_KEYS`, `DEEPSEEK_API_KEYS`, `XAI_API_KEYS`, `OPENROUTER_API_KEYS`, `OPENAI_API_KEYS`, `ANTHROPIC_API_KEYS` | API | none | Comma-separated keys of a provider; they take turns |
| `*_MODEL` (one per provider) | API | see `.env.example` | Model used by a provider |
| `AI_RATE_LIMIT_PER_MINUTE` / `AI_RATE_LIMIT_PER_IP_DAY` / `AI_DAILY_LIMIT` | API | 5 / 20 / 100 | Assistant limits, in memory, per instance |
| `DATABASE_URL` | API | none | Postgres of the anonymous counters (see [METRICS.md](METRICS.md)). A `*.neon.tech` host is reached over HTTP, any other Postgres over a normal connection |
| `ADMIN_TOKEN` | API | none | Password of the dashboard. Without it the dashboard refuses everyone |
| `METRICS_MEMORY` | API | off | `1` keeps the counters in memory (lost on restart): to try the dashboard without a database |
| `APP_ORIGIN` | Node server | the request's own origin | Public HTTPS origin(s), comma-separated. **Required behind a proxy**, see below |
| `TRUST_PROXY` | Node server | off | `1` makes `X-Forwarded-For` the visitor's address. **Set it behind a proxy you control** |
| `PORT`, `HOST` | Node server | `8787`, `127.0.0.1` (the Docker image sets `0.0.0.0`) | Where the server listens. Render and similar hosts provide `PORT` |
| `SITE_URL` | build | the production domain on Vercel | Public address for the canonical link, share previews and `sitemap.xml` |

Secrets stay in the host's secret manager or a local `.env` (git-ignored). Never put one in a `VITE_` variable: those end up in the browser.

## Vercel

1. Import the repository. `vercel.json` sets the build (`pnpm build`), the output (`dist`), the security headers and the functions (`assistant`, `health`, `track`, `metrics`).
2. Add the variables you need in *Settings → Environment Variables*. `APP_ORIGIN` and `TRUST_PROXY` are not needed: Vercel sets the visitor's address itself, and same-origin requests are accepted.
3. **A variable only applies to the next deployment.** After adding or changing one, redeploy. This is the usual reason why the dashboard keeps saying it is not configured.
4. The dashboard: create a Postgres database (Neon is what the project uses), run [`metrics.sql`](metrics.sql) on it, set `DATABASE_URL` (the *pooled* connection string, with `?sslmode=require`) and `ADMIN_TOKEN`, redeploy.
5. Unknown addresses get `404.html` with a 404 status; the app draws the page. `/admin` is a real file (`dist/admin/index.html`, written by `scripts/postbuild.mjs`), so it answers 200 and moves to `/#admin`.

## Docker

```sh
docker build -t karama-ko .
docker run --rm -p 8787:8787 karama-ko                     # site + API on http://localhost:8787
ADMIN_TOKEN=a-long-password docker compose up --build      # + Postgres for the counters
```

The image:

- is multi-stage: dependencies, build (type check, site, server bundle), production dependencies only, then a small runtime image;
- runs as the unprivileged `node` user, with `tini` as PID 1 so that `docker stop` is immediate;
- has a `HEALTHCHECK` on `/api/health`;
- contains no source, no dev dependencies, no tests.

`compose.yaml` starts the app and a `postgres:17-alpine`. The database creates the counters table on first start from `docs/metrics.sql`, keeps its data in the `metrics-data` volume, and is not reachable from outside the compose network. The app runs with a read-only filesystem, no Linux capabilities and `no-new-privileges`, and listens on `127.0.0.1` only: put an HTTPS reverse proxy in front to expose it. `ADMIN_TOKEN` is required (compose refuses to start without it). `POSTGRES_PASSWORD` defaults to `karama`, which is fine inside the private network; change it if you publish the database port.

Assistant keys go in a `.env` file next to `compose.yaml` (see `.env.example`); the values of `DATABASE_URL` and `ADMIN_TOKEN` in `compose.yaml` win over it.

### What the CI checks

`.github/workflows/docker.yml` runs on every push to `main` and every pull request, on GitHub's runners. It publishes nothing.

1. **Image**: build, start, wait for the healthcheck; `/` and `/admin` answer 200, an unknown address 404, `/api/track` 202 (counters off); the container is not root; it stops in under five seconds.
2. **Stack**: `docker compose up --wait`; a counter sent to `/api/track` is stored in Postgres, shown by the dashboard API, refused with a wrong password, and still there after the app restarts.

## Render (or any host that builds a Dockerfile)

1. *New → Web Service*, connect the repository, language **Docker**. Render builds the `Dockerfile` and provides `PORT`; the image already listens on `0.0.0.0`.
2. Set the *Health Check Path* to `/api/health` (Render uses its own check, not the image's `HEALTHCHECK`).
3. Set these variables, which a proxy makes necessary:
   - `APP_ORIGIN=https://your-service.onrender.com` (or your own domain). The proxy talks plain HTTP to the container, so the server sees `http://…` while the browser sends an `https://…` origin: without this variable the assistant and the counters answer **403 « Origine non autorisée »**.
   - `TRUST_PROXY=1`. Without it every visitor has the proxy's address and the per-visitor assistant limits apply to everyone at once.
4. Add the assistant keys you want (`GROQ_API_KEYS`, …).
5. The dashboard: create a Render Postgres, set `DATABASE_URL` to its **internal** URL (or the external one with `?sslmode=require`) and `ADMIN_TOKEN`. Render does not run `docs/metrics.sql` by itself: run it once, for example `psql "$EXTERNAL_DATABASE_URL" -f docs/metrics.sql`.
6. Free plans have limits (idle services sleep and answer slowly on the first request; free databases are limited in time). Check Render's current pricing page rather than relying on this document.

The same recipe applies to Fly.io, Railway or a VPS: a Docker build, `APP_ORIGIN`, `TRUST_PROXY=1` behind a proxy, a health check on `/api/health`.

## Your own server

```sh
pnpm install --frozen-lockfile
pnpm build
APP_ORIGIN=https://your-domain TRUST_PROXY=1 HOST=127.0.0.1 PORT=8787 pnpm start
```

Put it behind an HTTPS reverse proxy (Caddy, nginx). Set `TRUST_PROXY=1` only behind a proxy you control. The API validates JSON, caps request sizes, rejects cross-origin browser requests and aborts slow upstream calls.

## Checking a deployment

```sh
curl -fsS https://your-domain/api/health                          # {"aiConfigured":true|false}
curl -s -o /dev/null -w '%{http_code}\n' https://your-domain/admin                      # 200
curl -s -o /dev/null -w '%{http_code}\n' https://your-domain/api/metrics                # 401 if configured, 503 if not
curl -s -o /dev/null -w '%{http_code}\n' -X POST -H 'Content-Type: application/json' \
     -d '{"kind":"visit","name":"site"}' https://your-domain/api/track                  # 204 stored, 202 counters off
```

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| Dashboard says « Le tableau de bord n'est pas configuré » | `DATABASE_URL` or `ADMIN_TOKEN` missing, or set after the last deployment | Set both, then redeploy |
| Dashboard says « Mot de passe incorrect » | The password differs from `ADMIN_TOKEN` | Check for a trailing space or newline in the variable |
| The assistant and counters answer 403 « Origine non autorisée » | Behind a proxy without `APP_ORIGIN` | Set `APP_ORIGIN` to the public `https://` origin |
| Everyone hits the assistant's per-visitor limit | Behind a proxy without `TRUST_PROXY=1` | Set it |
| Counters stay at zero but visits show | Events are reported once per tab session; a tab that already used a tool does not report it again | Open a new tab |
| `/#admin` shows « Page introuvable » after a deployment | The browser still runs the previous cached version (the site is an installable app) | Reload twice, or clear the site's data |
| `/api/metrics` answers 502 | The database is unreachable or the table is missing | Check `DATABASE_URL` and run `docs/metrics.sql` |
