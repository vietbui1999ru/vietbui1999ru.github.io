---
status: approved
branch: feat/garden-b2
---
# SPEC: Library of backlogs (spec B)

## Objective
Add a `/library` section for games, books, films and recipes, fed by vault notes routed by `type` (spec D). Each item carries simple tracking (status, progress, rating, dates) and the owner's writing. The owner orders and toggles categories in `Site/Library.md`; visitors never see an empty or disabled category, while the local preview shows everything. Success: adding a `type: book` note with `publish: true` and running the publish flow puts it on `/library` with no code change. Context: `docs/superpowers/specs/2026-11-22-digital-garden-pivot.md`. Builds on spec A (#16) and spec D (#17), both on `main`. Follows the `draft` and `publish` model of #31: `draft` items show only on a local dev build.

Build fixture used by the verify lines: `tests/fixtures/garden-vault` extended with `Library/` items of every type and status, a `Site/Library.md` that disables one category, and one enabled category with no items.

## Acceptance Criteria
- AC-1: One library schema validates all four types: required `title`, `type`, `status`, `publish`; optional `draft`, `cover`, `tags`, `rating` (1–10), `progress` (0–100), `started`, `finished`, `creator`, `year`, `link`; `platform` only on games, `staple` only on recipes
  verify: `npx vitest run tests/content/library-schema.test.ts`
- AC-2: Status values are `backlog`, `active`, `paused`, `done`, `dropped`, shown with per-type labels (game: playing/finished, book: reading/read, film: watching/watched, recipe: to try/trying/tried/not for me; recipes have no `paused`)
  verify: `npx vitest run tests/lib/library-status.test.ts`
- AC-3: The publish router sends `game`, `book`, `film` and `recipe` notes to `Library/<type>/<slug>.md` and copies their covers; `/_preview` links each pending library item to its page at `/library/<type>/<slug>`
  verify: `npx vitest run tests/lib/publish/route-library.test.ts tests/lib/publish/preview-diff.test.ts`
- AC-4: `Site/Library.md` frontmatter `categories` sets category order and `enabled`; visitors see only enabled categories that have at least one published item
  verify: `npx vitest run tests/lib/library-categories.test.ts`
- AC-5: In the production build, the disabled and the empty fixture categories have no tab and no page
  verify: `VAULT_ROOT=tests/fixtures/garden-vault npx astro build --outDir .cache/verify-b >/dev/null && node tests/verify/library-tabs.mjs .cache/verify-b/library/index.html`
- AC-6: Under `astro dev`, library pages also show items with `draft: true`, marked "draft", and the disabled and empty categories; the production build shows none of them
  verify: `npx vitest run tests/lib/library-categories.test.ts -t "dev mode"`
- AC-7: Each category tab shows a "now" shelf of `active` items, then a cover grid filterable by status and tag, sorted by the most recent of `started`/`finished`
  verify: `npx vitest run tests/components/library-collection.test.ts`
- AC-8: Recipes have a "staples" filter driven by `staple: true`
  verify: `npx vitest run tests/components/library-collection.test.ts -t staples`
- AC-9: Each item has a detail page at `/library/<type>/<slug>` in the `visual` layout with cover, meta line (creator, year, platform, rating when set), a progress bar only while `active`, the note body and backlinks
  verify: `VAULT_ROOT=tests/fixtures/garden-vault npx astro build --outDir .cache/verify-b >/dev/null && node tests/verify/library-detail.mjs .cache/verify-b/library`
- AC-10: Items without a cover render a placeholder card with the type icon and title
  verify: `npx vitest run tests/components/library-card.test.ts`
- AC-11: Grid thumbnails are resized at build time with Astro's image pipeline
  verify: `npx vitest run tests/components/library-card.test.ts -t thumbnail`
- AC-12: A `currently` home block lists `active` items across types and renders only when listed in `Site/Home.md`
  verify: `npx vitest run tests/lib/garden-blocks.test.ts -t currently`
- AC-13: The feed block accepts a `sources` prop; library items enter the feed only when their body has text, dated by `finished` or else `started`
  verify: `npx vitest run tests/lib/garden-feed.test.ts -t library`
- AC-14: Nav reads home, blog, thoughts, library, projects, about, playground
  verify: `npx vitest run tests/data/nav-links.test.ts`
- AC-15: Property-only templates for each type and a sample `.base` file exist under `docs/library/templates/`, and each template's frontmatter passes the library schema
  verify: `npx vitest run tests/content/library-templates.test.ts`
- AC-16: Every new block and card has a `/ui-lab` fixture
  verify: `npx vitest run tests/lib/garden-blocks-ui-lab.test.ts`
- AC-17: Existing tests still pass
  verify: `npx vitest run`
  baseline: pass
- AC-18: Lint passes
  verify: `npx oxlint`
  baseline: pass
- AC-19: `/library` and a detail page read well at 375 px and 1280 px, light and dark
  verify: manual - visual layout judgement in a browser

## Boundaries
### Always
- Build library sections as registry blocks composed from the shared primitives
- Keep status labels and category logic in pure, tested modules under `src/lib/`
- Run `svelte-autofixer` on every new or changed Svelte component
- Run `~/dotfiles/scripts/spec check SPEC.md` and `~/dotfiles/scripts/floor-guard` before claiming done
### Ask first
- New dependencies
- Any write to a real vault outside test fixtures
### Never
- Write library entries, reviews or any owner copy; fixtures use obvious placeholders only
- Fetch covers or metadata from external APIs
- Let an item without `publish: true`, or with `draft: true`, reach a production build
- Edit a `verify:` line or a test to make a check pass

## Changes since the 2026-11-22 draft (2026-11-26)
- Spec D landed with a dev-only `/_preview` page and no `--include-private` flag. AC-6 now uses the #31 model: drafts and hidden categories show under `astro dev` only.
- AC-3 adds `/_preview` links for library items, because `pageUrlFor` maps only blog posts today.
- AC-14 keeps the `playground` nav link added by #21.
- The branch is `feat/garden-b2`, from `main` after #17. The old `feat/garden-b` sits on the pre-A primitives branch.

## Open Questions
- Card size and grid density per category. Default: one density for all; tune in `/ui-lab` before merge.
- Do films, games and books share one `visual` preset or get their own? Default: shared `visual`.
- Owner checklist outside this repo: copy the templates into Obsidian Templater, add `Site/Library.md`, build the Bases views, and start tracking real entries.
