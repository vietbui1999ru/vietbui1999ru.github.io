---
status: approved
branch: feat/rail-side
---
<!-- Owner approvals in session, 2026-11-27: approve 865cca00; approve 1ac026e5 (AC-1 amendment). -->

# SPEC: Reading rail in the sidebar TOC (issue #38, part 2)

## Objective
Package the timeline rail as a reading aid on article pages. The sidebar table of contents becomes the rail. A vertical line runs beside the TOC entries. Each entry has a checkpoint, and a marker shows the reading position. The marker follows the scroll position with the spring from `src/lib/rail-motion.ts`, so it glides between headings like the garden rail. Success: blog posts, project write-ups and library notes show the rail beside the article at 1024 px and wider. The rail reads well in light and dark and respects reduced motion. Context: issue #38. Part 1 (spring follow) landed in #40.

Owner decisions (2026-11-27):
- Placement: a sticky rail in the left column, beside the article.
- Checkpoints: h2 and h3 headings.
- Interaction: click a checkpoint row to jump to its heading. The TOC text is the label.
- Narrow screens: no rail below `lg` (1024 px). The collapsed TOC `<details>` stays as it is.
- Blog posts: the rail becomes the existing sidebar TOC.
- Library notes: the rail sticks below the cover in the existing left column.
- Project pages: the article gains a left column for the rail at `lg` and up.

Build fixture used by the verify lines: `tests/fixtures/garden-vault`.

## Acceptance Criteria
- AC-1: A pure module `src/lib/reading-rail.ts` maps the reading position to a marker offset on the rail. Inputs: the document tops of the headings, the checkpoint offsets on the rail, the reading line (viewport top + 30% of the viewport height, in document coordinates), the document bottom of the content and the rail height. Between heading i and heading i+1, the offset interpolates linearly between checkpoint i and checkpoint i+1. Above the first heading it interpolates from 0 to the first checkpoint. Below the last heading it interpolates from the last checkpoint to the rail height at the content bottom. The result is clamped to [0, rail height]. Over the last viewport height of the scroll range, the reading line moves linearly down to the content bottom. At the end of the scroll, the marker then reaches the rail end and every checkpoint is passed, also on a page too short for the reading line to reach its last headings.
  verify: `npx vitest run tests/lib/reading-rail.test.ts -t "marker"`
- AC-2: The same module marks a checkpoint as passed when its offset is at or above the marker offset, and as upcoming otherwise. It reuses `checkpointStates` from `src/lib/timeline-rail.ts`.
  verify: `npx vitest run tests/lib/reading-rail.test.ts -t "checkpoints"`
- AC-3: In sidebar mode, `GardenToc` renders one rail: a passed line segment, an upcoming line segment, one marker and one checkpoint per entry. An h3 checkpoint is smaller than an h2 checkpoint. The rail elements are `aria-hidden`. Each entry stays a link to its heading, and the checkpoint sits inside the link row, so a click on the checkpoint also jumps.
  verify: `npx vitest run tests/components/garden-toc.test.ts -t "rail"`
- AC-4: A DOM module `src/lib/reading-rail-dom.ts` drives the sidebar rail. It moves the marker with `stepRail` toward the AC-1 offset, and it sets each checkpoint `data-state` from AC-2. It writes only `transform` on the marker and line segments. It measures heading tops and checkpoint offsets again on resize and on the `variant-change` event. It runs its frame loop only while the rail is on screen and the marker moves. It returns a cleanup function that `GardenToc` calls on destroy.
  verify: `npx vitest run tests/components/garden-toc.test.ts -t "scroll"`
- AC-5: Under `prefers-reduced-motion: reduce`, the marker jumps to its target with no spring and checkpoints do not pop.
  verify: `npx vitest run tests/components/garden-toc.test.ts -t "reduced motion"`
- AC-6: Rail colors come from theme tokens and the `design-system/tone.ts` pastels only. `GardenToc.svelte` has no hex or rgb color literals.
  verify: `! rg -q "#[0-9a-fA-F]{3,8}\b|rgb\(" src/components/garden/GardenToc.svelte`
- AC-7: A built library note with a cover and at least 3 h2 or h3 headings has the sidebar rail in its left column, below the cover. A built project page with at least 3 such headings has the sidebar rail in a left column. A built blog post with the `essay` layout has the sidebar rail in its TOC column.
  verify: `VAULT_ROOT=tests/fixtures/garden-vault npx astro build --outDir .cache/verify-reading-rail >/dev/null && node tests/verify/reading-rail.mjs .cache/verify-reading-rail`
- AC-8: The rail is hidden below `lg`, and the existing collapsed TOC `<details>` still shows below `lg`.
  verify: `npx vitest run tests/components/garden-toc.test.ts -t "breakpoint"`
- AC-9: The garden timeline rail (`TimelineRail`, `installTimelineRails`) keeps its current behaviour.
  verify: `npx vitest run tests/components/timeline-rail.test.ts tests/lib/rail-motion.test.ts`
- AC-10: Existing tests still pass.
  verify: `npx vitest run`
  baseline: pass
- AC-11: Lint passes.
  verify: `npx oxlint`
  baseline: pass
- AC-12: At 1280 px the rail reads well in light and dark on a blog post, a project page and a library note. The marker glides between checkpoints while scrolling, and a checkpoint click jumps to its heading. With reduced motion on, the marker does not glide. At 375 px no rail shows.
  verify: manual - visual and motion check in a browser

## Boundaries
### Always
- Keep the marker math in `src/lib/reading-rail.ts`, free of DOM code.
- Reuse `stepRail` and `checkpointStates`. Do not copy the spring.
- Run `svelte-autofixer` on every new or changed Svelte component.
- Run `~/dotfiles/scripts/spec check SPEC.md` and `~/dotfiles/scripts/floor-guard` before claiming done.
### Ask first
- New dependencies.
- A change to `ClientRouter` or page transitions (that is #42).
- A change to the TOC entry text, depth rules or `minHeadings`.
### Never
- Edit a `verify:` line or a test to make a check pass.
- Write site copy. Fixture notes for tests are permitted.
- Change the garden timeline rail on `/about`.

## Open Questions
- Hover labels. The owner chose hover labels, then chose the TOC as the rail, and the TOC already shows every label. Default: no separate hover labels.
- Pointer mode. The garden rail follows a mouse over its section. Default: the reading rail follows the scroll only, because its checkpoints are a map of the whole article.
- Bounce. Default: the bounce ratio comes from the scroll speed, with the same `bounceRatio` limits as the pointer speed.
- Notes with fewer than `minHeadings` (3) headings. Default: no TOC and no rail, as today. A project or library page without a rail keeps its current layout.
- Library notes with the `visual` layout have no `toc` block. Default: library and project pages mount the sidebar TOC with the default settings, whatever their layout preset says.
