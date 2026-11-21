# Live Status Widgets (Spotify, Deadlock, Monkeytype, WakaTime)

- **Status:** Decisions settled 2026-11-01 — implementation not started
- **Date:** 2026-10-31
- **Related:** `2026-10-31-shared-ui-primitives.md` (widgets build on its Chip/Section/label tokens)

## Goal

Show small, live "what I'm up to" signals — music, games, typing, coding —
through **one reusable widget system**, so adding another API later is a
provider file plus a config entry, not a new component. Not on the home page.

## Constraint that shapes everything

The site is a **static build on GitHub Pages** (`.github/workflows/pages.yml`,
CNAME `resumeloop.me`). There is no server at request time, so:

- Secrets (Spotify refresh token, WakaTime token) cannot ship to the browser.
- "Currently playing" changes by the minute, so build-time snapshots are
  too stale for it.

## API research (verified 2026-10-31)

| Provider | Auth | Browser CORS | Limits | Notes |
| --- | --- | --- | --- | --- |
| **Spotify** | OAuth (auth-code + refresh token) — secret | n/a (needs secret) | Dev-mode quota per developer account; 429 `QUOTA_EXCEEDED` | Since Feb/Mar 2026 Dev Mode requires the **app owner to have Premium**, max 5 users, reduced endpoint set. Own-account `/me/player/*` endpoints are not in the removal tables, but must be verified with a test call. |
| **Deadlock** (deadlock-api.com, community) | none (API key optional, gives priority) | `Access-Control-Allow-Origin: *` | `cache-control: max-age=300`; 503/504 + `Retry-After` under load | `/v1/players/{account_id}/match-history`, `/v1/players/{account_id}/rank`, `/v1/players/steam`, `/v1/players/hero-stats`. Uses Steam32 account id. Full history only if the account friends their bot. |
| **Monkeytype** | none for profile; ApeKey for private endpoints | `*` | profile 100/hr, global 30/min | `GET /users/{name}/profile` returns PBs + typing stats publicly (profile must be public). |
| **WakaTime** | OAuth token (read_stats) — secret; or public "share" embed URL | **No CORS** (JSONP only for embeds) | ~10 req/s avg | `/users/current/stats/{range}`, summaries. API keys are write-only — never use them for reading. Wakapi (self-hosted) speaks a compatible API. |

## Recommendation: one small feed gateway + one widget shell

```
browser island ──GET /feeds/spotify──▶ Cloudflare Worker ──▶ Spotify / WakaTime / Monkeytype / Deadlock
   (FeedWidget)   ◀── normalized JSON ──   (secrets, cache, CORS allowlist)
```

### Why a gateway for every provider (even the public ones)

- One fetch pattern, one schema, one error model in the UI.
- Caching protects the rate limits of free community APIs (Deadlock,
  Monkeytype) no matter how many visitors there are.
- Secrets live in `wrangler secret`, never in the repo or bundle.
- Account ids/usernames stay in Worker config, not hard-coded in client JS.
- Hosting-independent: works whether the site stays on GitHub Pages or moves
  to Vercel/Netlify (both configs exist in the repo).

Cloudflare Workers free tier (100k req/day) is plenty; with caching most
visits never reach upstream.

### Alternatives considered

| Option | Verdict |
| --- | --- |
| Build-time snapshot via scheduled GitHub Action rebuild | No live "now playing"; rebuilding the whole site (vault checkout, images) every 30 min is wasteful. **Keep as a fallback layer** (see Phase 5). |
| Browser calls public APIs directly | Works for Deadlock + Monkeytype only; inconsistent; no shared cache. |
| Vercel/Netlify functions | Fine technically, but ties widgets to a host the site is not deployed on. |

## Gateway design (`workers/feeds/`)

```ts
interface FeedProvider<Raw = unknown> {
  id: FeedId;                      // "spotify" | "deadlock" | "monkeytype" | "wakatime"
  ttl: number;                     // seconds cached at the edge
  fetch(env: Env): Promise<Raw>;   // upstream call(s), secrets from env
  normalize(raw: Raw): FeedPayload;
}
```

- Routes: `GET /feeds/:id` and `GET /feeds?ids=a,b` (batch for one page load).
- Cache API keyed by provider; serve stale on upstream error with
  `stale: true` so the UI degrades instead of breaking.
- CORS allowlist: `https://resumeloop.me`, `localhost:4321`, preview hosts.
- TTLs: Spotify now-playing 20s, Spotify top track 6h, Deadlock 10m,
  Monkeytype 1h, WakaTime 1h.

### Shared payload (lives in `src/lib/feeds/types.ts`, imported by both sides)

```ts
type FeedPayload = {
  id: FeedId;
  state: "live" | "idle" | "error";   // live = happening right now
  headline: string;                    // "Song — Artist", "142 wpm", "4h 12m this week"
  detail?: string;                     // secondary line
  href?: string;                       // deep link out
  image?: { src: string; alt: string };
  stats?: Array<{ label: string; value: string }>;
  progress?: { value: number; max: number }; // track progress, language share…
  updatedAt: string;                   // ISO
  stale?: boolean;
};
```

Keeping one shape means a new provider needs **no UI code** unless it wants a
custom look.

## Provider specifics

- **Spotify** — scopes `user-read-currently-playing user-read-recently-played user-top-read`.
  - Playing → `live`, show track, artist, cover, progress bar.
  - Not playing → `idle`, show "last played" from `recently-played`.
  - "Top song": `GET /me/top/tracks?time_range=short_term&limit=1` (Spotify's
    ~4-week ranking). Alternative: most frequent track in the last 50
    recently-played items (truer to "recent history", noisier). Proposal: top
    track from `short_term`, recently-played as the idle fallback.
  - One-time local script `scripts/spotify-auth.ts` does the auth-code flow
    and prints the refresh token to paste into `wrangler secret`.
- **Deadlock** — rank + last few matches (hero, K/D/A, win/loss).
  Hero names/icons from the Deadlock assets API. Normalizer must tolerate
  missing matches (account not bot-friended).
- **Monkeytype** — best 15s/60s wpm + accuracy, tests completed, time typing.
- **WakaTime** — this week's total + top 3 languages as `progress` bars.
  If you self-host Wakapi instead, same provider with a different base URL.

## Front end

- `src/config/widgets.ts` — the only file you edit to add/remove/reorder:
  ```ts
  export const WIDGETS: WidgetConfig[] = [
    { id: "spotify", label: "listening", refresh: 30, enabled: true },
    { id: "wakatime", label: "coding", refresh: 3600, enabled: true },
    { id: "monkeytype", label: "typing", refresh: 3600, enabled: true },
    { id: "deadlock", label: "playing", refresh: 600, enabled: true },
  ];
  ```
- `FeedWidget.svelte` — shell: label, live dot, headline/detail/image/stats,
  progress, "updated 3m ago", and loading / empty / error / stale states.
  Variant `size: "card" | "line"` so the same widget fits a page grid or a
  one-line strip.
- Optional per-provider renderer slot (e.g. Spotify equalizer bars) via a
  `renderers` map; default renderer covers everything else.
- Data: hydrate with `client:visible`; poll at the configured `refresh` only
  while the tab is visible (`visibilitychange`); back off on errors; keep the
  last good payload in `localStorage` for instant paint.
- Motion (live dot, equalizer) respects `prefers-reduced-motion`.
- Styled with the shared primitives (`Chip`, `label-mono`, `toneFor`) so it
  matches the site.

## Placement (not the home page)

1. **`/now` page** (primary) — the "now page" convention: a grid of all
   widgets plus a short hand-written status paragraph. Fits next to
   `/thoughts` in the nav.
2. **Footer strip** (optional) — one `line`-size widget (e.g. "♪ now
   playing …") in the shared `SiteFooter`, visible site-wide without
   cluttering any page.
3. Later: inline embed in posts via a remark directive (`::widget{id=spotify}`).

## Privacy and failure modes

- Live listening and game activity are public the moment they happen. Add a
  per-provider `enabled` flag and a Worker-side kill switch (env var) to hide
  instantly without redeploying the site.
- Spotify Dev Mode stops working if Premium lapses; refresh tokens may need
  re-auth. The Worker returns `state: "error"` and the widget hides its
  headline instead of showing a broken card.
- Community APIs (Deadlock) can shed load: rely on stale cache.

## Task plan

**Phase 0 — decisions and accounts**
1. Confirm Spotify Premium on the owner account; create a Dev Mode app.
2. Choose WakaTime cloud vs self-hosted Wakapi.
3. Collect ids: Steam32 account id, Monkeytype username (profile public).
4. Create a Cloudflare account; deploy the Worker to `feeds-<account>.workers.dev`
   first (see Hosting below). A `feeds.resumeloop.me` custom domain is optional
   and needs the DNS move.

**Phase 1 — contract and gateway skeleton**
5. `src/lib/feeds/types.ts` (`FeedId`, `FeedPayload`, `WidgetConfig`).
6. `workers/feeds/` with wrangler config, router, CORS allowlist, cache + stale fallback.

**Phase 2 — providers (public first to prove the pipe)**
7. Monkeytype provider + normalizer + fixture tests.
8. Deadlock provider (rank, match history, hero metadata) + tests.
9. `scripts/spotify-auth.ts`; Spotify provider (now playing, recently played, top track) + tests.
10. WakaTime/Wakapi provider + tests.

**Phase 3 — widget UI**
11. `src/config/widgets.ts`.
12. `FeedWidget.svelte` (card + line sizes, all states) — run `svelte-autofixer`.
13. Polling/visibility/backoff/localStorage helper + tests.
14. Fixtures in `/ui-lab` for every state.

**Phase 4 — placement**
15. `/now` page + nav entry.
16. Optional footer strip in `SiteFooter` (depends on the primitives work).

**Phase 5 — hardening**
17. Build-time snapshot fallback: Astro fetches `/feeds?ids=…` at build to
    render a no-JS initial state.
18. Worker deploy via GitHub Action on `workers/**` changes; README runbook
    for Spotify re-auth and the kill switch.

## Hosting (decided 2026-11-01: Cloudflare Worker)

- **DNS today:** `resumeloop.me` uses Namecheap nameservers
  (`dns1/dns2.registrar-servers.com`) and the apex currently has **no A record**,
  so the custom domain does not resolve right now. That is a separate problem
  from this feature.
- A Worker **custom domain** (`feeds.resumeloop.me`) requires the zone to be on
  Cloudflare, i.e. switching the nameservers at Namecheap to Cloudflare's
  (free plan). Cloudflare can then also hold the GitHub Pages records.
- **Start with `*.workers.dev`**: no DNS change, works immediately. The
  Worker URL lives in one config value (`PUBLIC_FEEDS_URL`), so switching to
  the custom domain later is a one-line change plus a CORS allowlist update.
- Tooling: `wrangler` as a dev dependency scoped to `workers/feeds/`;
  secrets via `wrangler secret put`; response caching with the Workers
  Cache API (no KV needed at this scale); deploy from a GitHub Action using a
  scoped `CLOUDFLARE_API_TOKEN` repository secret.

## Open decisions

1. ~~Gateway host~~ — Cloudflare Worker.
2. ~~"Top song"~~ — Spotify 4-week top track (`/me/top/tracks?time_range=short_term&limit=1`),
   with recently-played as the idle fallback.
3. ~~WakaTime vs Wakapi~~ — WakaTime cloud, read via an OAuth token with the
   `read_stats` scope (auth-code flow, long-lived token) stored as a Worker secret.
4. ~~Placement~~ — `/now` page plus the one-line footer strip (Spotify `line`
   widget in `SiteFooter`; hidden when idle/error so the footer never shows a
   broken state). The strip depends on the shared-primitives `SiteFooter` task.
