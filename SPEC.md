---
status: approved
branch: feat/garden-a
---
# SPEC: Garden repositioning (spec A)

## Objective
Turn the home and about pages into a digital-garden shell built from reusable blocks configured in the vault: identity, focus areas and a recently-tended feed on home; skills folded into focus areas; projects demoted and sortable. The owner writes all copy in `Site/` notes; no copy is hard-coded. Success: changing block order, props or text in `Site/*.md` changes the built pages without touching `src/`. Context: `docs/superpowers/specs/2026-11-22-digital-garden-pivot.md`.

Build fixture used by the verify lines: `tests/fixtures/garden-vault`, a minimal vault (Blogs, Thoughts, Portfolio/Projects, Gallery, Site) with placeholder copy written for tests only.

## Acceptance Criteria
- AC-1: Every content collection and asset path resolves through `getVaultRoot()`, so `VAULT_ROOT` redirects all of them
  verify: `npx vitest run tests/content/vault-root.test.ts`
- AC-2: A block registry maps block ids to a component plus a zod props schema with defaults; unknown ids and invalid props fail the build with a message naming the note and field
  verify: `npx vitest run tests/lib/garden-blocks.test.ts`
- AC-3: A `site` collection loads `Site/Home.md`, `Site/About.md` and `Site/Focus/*.md`; the build passes when `Site/` is absent, and pages then omit vault-driven blocks
  verify: `npx vitest run tests/content/site-collection.test.ts`
- AC-4: Home renders the blocks listed in `Site/Home.md` frontmatter, in that order, with their props; the fixture lists identity, focus, feed
  verify: `VAULT_ROOT=tests/fixtures/garden-vault npx astro build --outDir .cache/verify-a >/dev/null && node tests/verify/block-order.mjs .cache/verify-a/index.html identity focus feed`
- AC-5: Home no longer renders the old project grid, blog block or about teaser
  verify: `VAULT_ROOT=tests/fixtures/garden-vault npx astro build --outDir .cache/verify-a >/dev/null && ! rg -q 'data-block="(projects|blog|about-teaser)"' .cache/verify-a/index.html`
- AC-6: The identity block renders the body of `Site/Home.md`
  verify: `VAULT_ROOT=tests/fixtures/garden-vault npx astro build --outDir .cache/verify-a >/dev/null && rg -q 'FIXTURE-IDENTITY-COPY' .cache/verify-a/index.html`
- AC-7: Each focus area renders its note's title, body and at most 4 tool icons; more than 4 tools fails validation
  verify: `npx vitest run tests/content/focus-schema.test.ts`
- AC-8: The feed block merges published blog posts and published thoughts, newest first, each labelled with its type, capped by its `limit` prop (default 8)
  verify: `npx vitest run tests/lib/garden-feed.test.ts`
- AC-9: About renders `Site/About.md` body above Experience and Education, and no longer renders the skill-group grid
  verify: `VAULT_ROOT=tests/fixtures/garden-vault npx astro build --outDir .cache/verify-a >/dev/null && node tests/verify/block-order.mjs .cache/verify-a/about/index.html about-prose experience education && ! rg -q 'data-block="skills"' .cache/verify-a/about/index.html`
- AC-10: Skill icons include NixOS, OPNsense and a networking icon usable by focus areas
  verify: `jq -e 'has("NixOS") and has("OPNsense") and has("Networking")' src/data/skillIcons.json`
- AC-11: `/projects` lists every non-draft project with a visitor sort control (featured, newest, title, status), featured first by default
  verify: `npx vitest run tests/components/project-sort.test.ts`
- AC-12: Nav is home, blog, thoughts, projects, about; gallery is linked from about, not the nav
  verify: `npx vitest run tests/data/nav-links.test.ts`
- AC-13: No identity copy remains in source (`ABOUT_TAGLINE`, `ABOUT_PARAGRAPHS`, the hero intro string)
  verify: `! rg -q "ABOUT_TAGLINE|ABOUT_PARAGRAPHS" src`
- AC-14: Every block has a `/ui-lab` fixture
  verify: `npx vitest run tests/lib/garden-blocks-ui-lab.test.ts`
- AC-15: Ink-ambient background stays enabled on home
  verify: `rg -q "enableInkAmbient=\{true\}" src/pages/index.astro`
- AC-16: Existing tests still pass
  verify: `npx vitest run`
  baseline: pass
- AC-17: Lint passes
  verify: `npx oxlint`
  baseline: pass
- AC-18: Home, about and projects read well at 375 px and 1280 px, light and dark
  verify: manual - visual layout judgement in a browser

## Boundaries
### Always
- Run `git submodule update --init vendor/vault` before building against the real vault
- Build sections as registry blocks composed from the shared primitives
- Run `svelte-autofixer` on every new or changed Svelte component
- Run `~/dotfiles/scripts/spec check SPEC.md` and `~/dotfiles/scripts/floor-guard` before claiming done
### Ask first
- New dependencies
- Removing a component that another page still imports
- Any change under `vendor/vault` (owner content)
### Never
- Write site copy (intro, about, focus-area text); fixtures use obvious placeholders only
- Edit a `verify:` line or a test to make a check pass
- Add library, now or publishing features (specs B, C, D)

## Open Questions
- Contact on home was not in the agreed list. Default: home drops `PaperContact`; contact links live in `SiteFooter`.
- Should focus areas link to posts sharing their tags? Default: no, until tag pages exist.
- Which projects are featured? Default: the owner sets `featured` in the vault; the build only sorts.
- Hero typing animation and gradients in `homeData.ts`. Default: removed with the hardcoded intro; identity renders as plain prose.
- Owner checklist outside this repo: create `Site/Home.md`, `Site/About.md`, `Site/Focus/*.md` in the personal vault and add `Site/` to `sync-to-portfolio.sh`.
