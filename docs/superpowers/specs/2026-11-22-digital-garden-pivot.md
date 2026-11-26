# Digital garden pivot

- **Status:** Direction agreed 2026-11-22; specs A and D drafted, B and C not yet written
- **Date:** 2026-11-22
- **Related:** `2026-10-31-shared-ui-primitives.md` (base), `2026-10-31-live-status-widgets.md` (spec C),
  `2026-11-22-spotify-taste-sidecar-brief.md` (separate project)

## Goal

Turn the portfolio into a personal and professional digital garden. The owner now works on AI/LLM
gateway pipelines (a software factory that includes static analysis and formal verification),
automation, networking, DevOps/SRE and self-hosting. The site should show what is growing, with
projects and skills demoted.

## Ground rules

- **The owner writes every word of copy.** Agents build layout and content wiring only, and never
  draft intro, about or focus-area text.
- **Write in the personal vault, publish through PortfolioVault.** Notes live in `~/repos/Obsidian`.
  The existing `sync-full.sh` pipeline (in `~/repos/Obsidian/scripts`, outside this repo) copies
  publishable notes to PortfolioVault, which this site reads as the `vendor/vault` submodule.
- **One publish rule: `publish: true`.** It replaces the `blog/published/` folder move. Schemas
  still filter on it as a second guard. Sync-script changes are tracked as owner checklists, since
  they live in the Obsidian repo.
- **Site copy lives in the vault**, under `Site/`, not in `src/data/*.ts`.
- **Everything is a reusable block.** Each page section is a block: one Svelte component plus a
  zod props schema with defaults, registered in one block registry. A page's `Site/*.md`
  frontmatter lists its blocks in order, each with optional props (`- block: feed` /
  `limit: 6`). Reordering, removing or tuning a block is a vault edit; a new block type is a
  component, a schema and a registry entry. Blocks compose the shared primitives (`Section`,
  `SectionHeader`, `Chip`, `InkLink`) rather than styling from scratch, and each block has a
  `/ui-lab` fixture. Specs B, C and D add their sections as blocks too.

## Specs and order

| Order | Spec | Branch | Scope |
| --- | --- | --- | --- |
| 1 | A: repositioning | `feat/garden-a` | `Site/` collection, home (identity, focus areas, tended feed), skills folded into focus areas, projects demoted and sortable, nav, `VAULT_ROOT` everywhere |
| 2 | D: publishing pipeline | `feat/garden-d` (from `feat/garden-a`) | `publish: true` migration, local dry-run preview, Excalidraw (plugin SVG export + sync check), Mermaid via pele at build time, Typst via a per-post `math` property, video embeds, `essay`/`notebook`/`visual` layouts, hover previews for published wikilinks, `%% comment %%` stripping |
| 3 | B: library (backlogs) | `feat/garden-b2` (from `main` after #17) | `/library` for games, books, films, recipes: image, tags, status, progress, the owner's writing; categories ordered and toggled in `Site/Library.md`, empty ones hidden publicly, all visible in local preview |
| 4 | C: status widgets | `feat/garden-c` | Spotify (top tracks, artists, genres), Monkeytype, WakaTime as daily snapshots via a scheduled GitHub Action; `/now` page; live now-playing deferred |

All four branch from `claude/ui-content-layout-analysis-d5062e` (shared primitives) until it merges.

## Decisions log

| Date | Decision |
| --- | --- |
| 2026-11-22 | Deadlock dropped from widgets; Cloudflare Worker deferred with live now-playing |
| 2026-11-22 | Spotify taste graph moved to a separate sidecar project |
| 2026-11-22 | `resumeloop.me` abandoned; stale root `CNAME` removed |
| 2026-11-22 | Typst for new writing; KaTeX posts converted later |
| 2026-11-22 | Excalidraw rendered from the Obsidian plugin's SVG export, checked by the sync |
| 2026-11-22 | Video is embeds only; nothing self-hosted |
| 2026-11-22 | Web clippings stay off the site; clipping sync and popover retired |
| 2026-11-22 | Publishing moves into this repo (`npm run publish`); Obsidian sync scripts retired |
| 2026-11-22 | Notes route by `type` property from anywhere in the personal vault |
| 2026-11-22 | Blog variants kept; they inherit the parent's `publish` |
| 2026-11-22 | Typst covers math and fenced blocks |
| 2026-11-22 | Layouts are block presets with per-type defaults, no per-note overrides |
| 2026-11-22 | One wikilink index over all types; hover previews, backlinks, note embeds as cards |
| 2026-11-22 | PortfolioVault push triggers the deploy via repository dispatch; no site commit per publish |
| 2026-11-22 | Library: one status set (backlog, active, paused, done, dropped) with per-type labels |
| 2026-11-22 | Library feeds the home feed only for items with writing; `currently` is an opt-in home block |
| 2026-11-26 | Library drafts and hidden categories show under `astro dev` only (#31 model) |
