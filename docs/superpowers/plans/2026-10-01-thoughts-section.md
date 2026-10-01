# Thoughts section — plan (not started)

## Goal
A `/thoughts` page on the portfolio: a reverse-chronological stream of short, dated observations and small daily learnings. Written in Obsidian, published through the existing vault pipeline, no manual copying.

## Existing pipeline this reuses
```
Obsidian (~/repos/Obsidian)            write here
  └─ scripts/sync-to-portfolio.sh      rsync → PortfolioVault
PortfolioVault (~/repos/PortfolioVault, private GitHub)
  └─ scripts/sync-full.sh              commit + push PV, bump submodule, push site
Portfolio site vendor/vault (submodule) → src/content/config.ts glob loaders → Astro pages
```
Blogs already flow this way (`blog/published/` → `PV/Blogs/` → `blog` collection). Thoughts should be a sibling of Blogs, not a new mechanism.

## Proposed design
1. **Obsidian source:** `thoughts/` folder, one note per thought, filename `YYYY-MM-DD-short-slug.md`.
   Frontmatter: `date`, optional `tags`, and `publish: true` as an explicit opt-in (thoughts are written casually; nothing goes public by default).
   Add `Templates/Thought.md` with that frontmatter; bind it to a Templater/QuickAdd hotkey for one-keystroke capture.
2. **Sync:** in `sync-to-portfolio.sh`, add a block `thoughts/ → $PV/Thoughts/`, guarded with `[[ -d ]]` like Clippings. Copy only `publish: true` notes via a small node step (mirrors `sync-attachments.mjs`), so unpublished thoughts never reach the PortfolioVault remote.
3. **Site content collection:** `thoughts` in `src/content/config.ts`, `glob({ pattern: "**/*.md", base: "./vendor/vault/Thoughts" })`. Schema in `src/content/schemas.ts`: `date` (coerce), `tags` optional, `publish` default false. Wikilinks, callouts and math already work via the shared remark pipeline in `astro.config.ts`.
4. **Page:** `src/pages/thoughts.astro` — full bodies rendered inline (thoughts are short), grouped by month, newest first; tag filter optional later. Match the Paper* visual language (see the `PaperAboutTeaser.svelte` header pattern). No per-thought route in v1; add anchors (`#2026-10-01-slug`) for linking.
5. **Navigation:** add "thoughts" to `src/components/svelte/PaperNav.svelte`; optionally a "latest thought" teaser on the home page.
6. **Empty-state safety:** the build must pass when `vendor/vault/Thoughts` does not exist yet (CI checks out the pinned submodule). Verify the glob loader tolerates a missing base, or commit `Thoughts/.gitkeep` to PortfolioVault first.

## Open questions (decide at session start)
- One note per thought (proposed) vs. a `## Thoughts` section inside Daily notes extracted by a script. Extraction means no new files, but couples publishing to the Daily template, which currently has uncommitted deletions in the Obsidian repo.
- RSS feed for thoughts? Cheap to add alongside the page.
- Show tags publicly, or keep them private for organization only?

## Verification
- Unit test for the schema / publish filter, following `tests/lib/vault.test.ts`.
- `pnpm build` under Node 22, with and without a `Thoughts/` dir present.
- End-to-end: write a thought in Obsidian → `scripts/sync-full.sh` → PR build green → merge → thought visible on live `/thoughts`.
