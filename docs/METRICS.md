# Anonymous counters and the dashboard

Karama-Ko counts how it is used, without knowing who uses it. The figures answer three questions: is the site visited, which tools matter, and does the assistant work. Vercel Analytics was not an option (it is used by another project), and a third-party tracker would contradict the site's privacy promise, so the counters are built in.

## What is counted

A fixed list, defined once in `server/metrics.mjs` (`VOCABULARY`). Anything else is dropped.

| Kind | Names | Counted when | By |
| --- | --- | --- | --- |
| `visit` | `site` | The site is opened in a tab | the page |
| `tool` | `calculateur`, `comparer`, `negocier`, `explorer`, `fiche`, `embaucher`, `equipe`, `annee`, `fin`, `sauvegardes`, `integrer` | A tool is opened (the calculator also counts when an amount is typed in the home page) | the page |
| `option` | `overtime`, `premiums`, `ostie`, `cadre`, `share` | The calculator uses overtime, night/Sunday/holiday hours, an edited OSTIE rate, the executive status, or a share link is copied | the page |
| `assistant` | `asked`, `answered`, `refused`, `failed` | A question reaches the server, then how it ended | the server |

For `answered`, the time it took is added, to show an average. The assistant outcomes are counted by the server alone: `/api/track` refuses the `assistant` kind, so a page cannot forge them.

The embedded calculator (`?embed=1`) and the dashboard itself are never counted.

## What is never kept

No amount, no salary, no question, no answer, no name of a simulation, no IP address, no cookie, no identifier of any kind. A row says « on this day, this tool was opened N times ». Nothing links two days or two events to the same person.

The page reports an event **once per tab session**, so the figures read as « visits that used this tool », not as a number of clicks. Nothing is reported when the browser sends *Do Not Track* or *Global Privacy Control*, nor while it is offline. An event is remembered as reported only once the server confirmed it (204): if the counters were off or unreachable, the page tries again.

The site's *Confidentialité* and *Cookies et stockage local* pages say all of this in plain language. Keep them in step with this document when something changes.

## How it works

```text
page ── POST /api/track {kind, name} ──▶ server/api.mjs ──▶ metrics.record ──▶ store (memory | Neon over HTTP | Postgres)
assistant outcome ───────────────────────────────────────▶ metrics.record
dashboard ── GET /api/metrics?days=30 + Bearer ADMIN_TOKEN ─▶ metrics.summary ──▶ JSON ──▶ /#admin
```

- `src/lib/track.ts`: the page side. `track(kind, name)` with the guards above.
- `server/metrics.mjs`: the vocabulary, the stores, `summarize`, the password check and a small throttle. `record` never throws: a failing counter must not break the page or the assistant.
- `server/api.mjs`: `track` and `metrics` handlers; the assistant handler counts its outcomes.
- `src/workspace/Admin.tsx`: the dashboard, loaded only when `#admin` is opened.
- `scripts/postbuild.mjs`: writes `dist/admin/index.html` so that `/admin` is a real address; `src/main.tsx` then moves it to `/#admin`.

### Stores

| Store | Chosen when | Use |
| --- | --- | --- |
| Memory | `METRICS_MEMORY=1` | Trying the dashboard; tests. Lost on restart |
| Neon over HTTP (`@neondatabase/serverless`) | `DATABASE_URL` host ends with `.neon.tech` | Serverless functions: no connection to keep. Use the *pooled* string |
| Postgres (`pg`) | any other `DATABASE_URL` | Docker compose, Render, a VPS |

Without `DATABASE_URL` or `METRICS_MEMORY`, counters are off: `/api/track` answers `202` (received, not kept) and `/api/metrics` answers `503`.

### The table

[`docs/metrics.sql`](metrics.sql): one row per day, kind and name.

```sql
CREATE TABLE IF NOT EXISTS metrics (
  day date NOT NULL, kind text NOT NULL, name text NOT NULL,
  count bigint NOT NULL DEFAULT 0,
  ms bigint NOT NULL DEFAULT 0,          -- total time of the answered assistant questions
  PRIMARY KEY (day, kind, name)
);
```

An event is an upsert (`count = count + 1`), so concurrent requests do not lose counts. There is no retention policy: a year of data is a few thousand rows.

## API

### `POST /api/track`

Body: `{"kind":"tool","name":"comparer"}`, at most 200 bytes, JSON.

| Status | Meaning |
| --- | --- |
| 204 | Stored |
| 202 | Received, not kept: counters are off |
| 400 | Unknown kind or name, or invalid JSON (the `assistant` kind is refused) |
| 403 | Cross-origin browser request |
| 405 / 413 / 429 | Wrong method / body too large / more than 120 events a minute from one address |

### `GET /api/metrics?days=30`

Header: `Authorization: Bearer <ADMIN_TOKEN>`. `days` is clamped to 1–90 (default 30).

| Status | Meaning |
| --- | --- |
| 200 | The summary below |
| 401 | Wrong or missing password |
| 429 | More than 20 attempts a minute from one address |
| 502 | The database is unreachable |
| 503 | `DATABASE_URL` or `ADMIN_TOKEN` is not set |

```jsonc
{
  "days": 30,
  "visits": 124,
  "daily":  [{ "day": "2026-11-17", "visits": 9, "asked": 3 }],       // every day of the period, zeros included
  "tools":  [{ "name": "comparer", "count": 31 }],                    // all tools, most used first
  "options":[{ "name": "ostie", "count": 4 }],
  "assistant": { "asked": 40, "answered": 36, "refused": 2, "failed": 2, "avgMs": 4800 }
}
```

## The dashboard

`/admin` (or `/#admin`) asks for the password, kept in the tab's `sessionStorage` until the tab is closed or *Se déconnecter* is used. It shows, over 7, 30 or 90 days: visits, assistant questions, success rate, average answer time, visits per day (with a table behind the chart), tools used and options used. The page is `noindex`.

## Security

- The password (`ADMIN_TOKEN`) is compared in constant time, from a SHA-256 digest of both sides.
- Password attempts are throttled per address, and the dashboard is switched off when the variable is missing: it never opens by default.
- `/api/track` accepts only the closed vocabulary, small bodies, same-origin browser requests, and at most 120 events a minute per address. The throttles live in memory, per instance: a brake, not a guarantee on a serverless host.
- The database credentials stay on the server. The browser only ever sees the summary.
- Counters can be inflated by someone sending events on purpose. They are for orientation, not for billing.

## Adding a counter

1. Add its name to `VOCABULARY` in `server/metrics.mjs` (and to `PAGE_KINDS` if the page reports it).
2. Call `track(kind, name)` where it happens (`src/lib/track.ts`), or `metrics.record` on the server.
3. Show it in `src/workspace/Admin.tsx` (a label in `TOOL_LABELS` or `OPTION_LABELS`).
4. Update the vocabulary table above and, if it changes what is collected, the site's *Confidentialité* page.
5. Add a case to `server/metrics.test.mjs`.

## Trying it locally

```sh
METRICS_MEMORY=1 ADMIN_TOKEN=local-password pnpm dev     # counters in memory, dashboard at /#admin
ADMIN_TOKEN=local-password docker compose up --build     # counters in a real Postgres
```

Tests: `pnpm test:api` (vocabulary, summary, endpoints, throttles, password, assistant outcomes), `pnpm test` (page side) and `e2e/admin.spec.ts` (the dashboard in a real browser).
