# Session State
updated: 2026-05-13 21:15 UTC
branch: main

## Goal
Implement blog style variants (AI + character styles), fix scramble animation, and wire the full vault → CI/CD publish pipeline.

## Completed
- **Blog variant system**: `blog-variants` Astro content collection, hidden-div handoff pattern, `BlogVariantTabs` component with tab strip
- **ScrambleText animation fixes** (multiple rounds):
  - PHASE_MS 350→900 (1800ms total), both-ends-to-center scramble via `buildFrame()`
  - Height lock (`el.style.height`) to prevent page reflow during animation
  - `STATIC_TAGS` set: h1-h6, img, figure, picture — never scrambled
  - `isStaticElement()` also catches `<p><img></p>` blocks via `querySelector("img")`
  - Removed `key={scrambleKey}` from BlogVariantTabs — was causing remount→isVisible=false→identity animation bug
  - Lowered IntersectionObserver threshold 0.1→0 (prose div is only ~8% visible, was below 10% gate)
- **style-blog CC skill** (`~/.claude/skills/style-blog.md`): content preservation rules — every link, image embed (`![[...]]`), wikilink, code block must survive; output ≥ input length
- **Blog variants generated** for `building-a-vault-cms-pipeline`:
  - `.ai.md`: prose polish, all wikilinks/image embeds/links preserved
  - `.yoda.md`: sentence inversion throughout, all structure preserved
  - Both copied to `~/repos/Obsidian/blog/published/` and synced via sync-full.sh
- **Blog tag filter**: tag pill strip in Blog section (same pattern as Gallery)
- **Simulation persistence**: `localStorage` via `readPersistedScene()` + useEffect write in `AppCanvasIsland`
- **CI/CD caching**: `actions/cache@v4` for `.astro/` and `.cache/` dirs
- **`.gitignore`**: added `.playwright-mcp/`, `docs/style-guides/`
- **Animation verified working** via Playwright: mid-content at 350ms shows `9HdNMIhfCK%Xi Pk8...` (fully scrambled); headers static throughout

## In Progress
- Nothing blocked — all changes pushed to main, CI/CD deploying

## Decisions Made
- **Hidden-div handoff pattern** over `experimental_AstroContainer` — more reliable for SSG, avoids experimental API
- **`isStaticElement()` catches `<p><img></p>`** not just top-level img — Obsidian image embeds render as `<p><img></p>` after remark, not standalone `<img>`
- **Removed `scrambleKey` state entirely** — html prop change + existing `cancelAnimationFrame` at effect entry handles interrupts cleanly without remounting
- **threshold: 0** for IntersectionObserver — tall content divs (4964px) are only ~8% visible at normal scroll, which was below the 0.1 gate
- **sync-full.sh is the canonical publish path** — variant files must exist in `~/repos/Obsidian/blog/published/` before running, or rsync --delete will wipe them from PortfolioVault

## Blocked / Needs Input
- None currently

## Files Modified This Session
- `src/components/ui/scramble-text.tsx` — full rewrite (static tags, isStaticElement, buildMixedFrame, height lock, threshold fix)
- `src/components/blog/BlogVariantTabs.tsx` — removed key={scrambleKey}, scrambleKey state
- `src/content/config.ts` — blog-variants collection with `!**/*.*.md` exclusion pattern
- `src/content/schemas.ts` — blogVariantSchema added
- `src/pages/blog/[...slug].astro` — hidden-div handoff, BlogVariantTabs integration
- `src/components/sections/Blog.tsx` — tag filter strip
- `src/pages/index.astro` — tags passed to Blog component
- `src/scenes/engine/AppCanvasIsland.tsx` — localStorage persistence
- `.github/workflows/pages.yml` — cache step
- `.gitignore` — playwright-mcp, style-guides
- `vendor/vault/Blogs/building-a-vault-cms-pipeline.ai.md` — regenerated (full content preserved)
- `vendor/vault/Blogs/building-a-vault-cms-pipeline.yoda.md` — regenerated (full content preserved)
- `~/.claude/skills/style-blog.md` — content preservation rules, image embed rule

## Next Session Should
1. Visually verify the live site after CI deploys (check tabs, animation, image embed rendering)
2. Consider adding a `/style-blog` invocation for the next blog post as a real workflow test
3. If adding more blog posts, run `sync-full.sh` as the publish step (not manual vendor/vault edits)
4. Potential improvement: `pre` / code blocks as additional STATIC_TAGS in ScrambleText (currently they animate, which scrambles code — may look bad)

## Active Plugins This Session
- superpowers (brainstorming, writing-plans, subagent-driven-development, executing-plans)
- wiki-context
- grill-me
