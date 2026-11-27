---
status: approved
branch: feat/timeline
---
# SPEC: Timeline rail (issue #13)

## Objective
Replace the static checkpoint squares in the experience and education timelines with one reusable `TimelineRail` component. A breathing marker rides the vertical line and follows the cursor, with scroll position as the fallback for touch and keyboard users. Checkpoints and the line show what the marker has passed. Success: both timelines on `/about` use the rail, it works in light and dark, and it respects reduced motion. Context: issue #13.

Build fixture used by the verify lines: `tests/fixtures/garden-vault`, whose `Site/About.md` lists the experience and education blocks.

## Acceptance Criteria
- AC-1: A pure rail module computes the marker offset: in pointer mode, the pointer's y relative to the rail; in scroll mode, the viewport's vertical centre relative to the rail; both clamped to [0, rail height]
  verify: `npx vitest run tests/lib/timeline-rail.test.ts -t "marker"`
- AC-2: The rail module marks a checkpoint as passed when its offset is at or above the marker offset, and as upcoming otherwise
  verify: `npx vitest run tests/lib/timeline-rail.test.ts -t "checkpoints"`
- AC-3: `TimelineRail` renders one checkpoint per item, one marker and the line in two segments (passed and upcoming); each checkpoint has `data-state="passed"` or `data-state="upcoming"` from the marker offset
  verify: `npx vitest run tests/components/timeline-rail.test.ts -t "render"`
- AC-4: A mouse or pen pointer moving over the rail section moves the marker to the pointer; touch pointers do not; when no mouse or pen pointer is over the section, the marker follows the scroll position
  verify: `npx vitest run tests/components/timeline-rail.test.ts -t "pointer"`
- AC-5: The marker breathes through a CSS animation whose range and speed come from `--rail-breath-scale` and `--rail-breath-duration`, with defaults in the component
  Superseded by #38 (2026-11-27): the owner removed the breathing animation and its fixture controls.
  verify: `rg -q -- "--rail-breath-scale" src/components/patterns/TimelineRail.svelte && rg -q -- "--rail-breath-duration" src/components/patterns/TimelineRail.svelte && rg -q "@keyframes" src/components/patterns/TimelineRail.svelte`
- AC-6: Under `prefers-reduced-motion: reduce`, the marker does not breathe and moves without a transition
  verify: `rg -q "prefers-reduced-motion: reduce" src/components/patterns/TimelineRail.svelte`
- AC-7: Colors come from theme tokens and the `design-system/tone.ts` pastels only; the component has no hex or rgb color literals
  verify: `! rg -q "#[0-9a-fA-F]{3,8}\b|rgb\(" src/components/patterns/TimelineRail.svelte`
- AC-8: `PaperExperience` and `PaperEducation` render through `TimelineRail` and no longer draw their own checkpoint squares
  verify: `rg -q "TimelineRail" src/components/svelte/PaperExperience.svelte && rg -q "TimelineRail" src/components/svelte/PaperEducation.svelte && ! rg -q "w-\[11px\]" src/components/svelte/PaperExperience.svelte src/components/svelte/PaperEducation.svelte`
- AC-9: The experience and education blocks hydrate on the about page, so the marker runs in the browser; each block contains an Astro island that holds the rail
  Superseded by #38 (2026-11-27): the blocks are server-rendered and a BaseLayout script drives the marker; the verify now checks the server-rendered rail.
  verify: `VAULT_ROOT=tests/fixtures/garden-vault npx astro build --outDir .cache/verify-rail >/dev/null && node tests/verify/rail-hydrated.mjs .cache/verify-rail/about/index.html experience education`
- AC-10: `/ui-lab` has a `TimelineRail` fixture with controls for `--rail-breath-scale` and `--rail-breath-duration`
  Superseded by #38 (2026-11-27): the owner removed the breathing animation and its fixture controls.
  verify: `rg -q "TimelineRailFixture" src/pages/ui-lab.astro && rg -q -- "--rail-breath-scale" src/components/ui-lab/TimelineRailFixture.svelte`
- AC-11: Existing tests still pass
  verify: `npx vitest run`
  baseline: pass
- AC-12: Lint passes
  verify: `npx oxlint`
  baseline: pass
- AC-13: The rail reads well in light and dark at 375 px and 1280 px; the marker follows the mouse on desktop and the scroll on touch; with reduced motion on, it neither breathes nor glides
  verify: manual - visual and motion check in a browser

## Boundaries
### Always
- Keep marker and checkpoint math in `src/lib/timeline-rail.ts`, free of DOM code
- Run `svelte-autofixer` on every new or changed Svelte component
- Run `~/dotfiles/scripts/spec check SPEC.md` and `~/dotfiles/scripts/floor-guard` before claiming done
### Ask first
- New dependencies
- Changes to the timeline data files or their copy
### Never
- Edit a `verify:` line or a test to make a check pass
- Write site copy
- Change the layout of the timeline entries beyond what the rail needs

## Open Questions
- Checkpoint colors. Default: a passed checkpoint keeps its pastel fill from `toneFor`; an upcoming one is hollow (`bg-paper-raised`) with the ink border.
- Line colors. Default: the passed segment is `--ink`; the upcoming segment is the lighter `journal-3` grey.
- Standalone garden block. The issue asks for one, but a timeline block would need its items written in vault frontmatter. Default: the rail ships through the existing experience and education blocks; a standalone `timeline` block waits until a note needs it.
- Hydration. Default: `GardenExperience` and `GardenEducation` become `.astro` wrappers that mount the Svelte timeline with `client:visible`.
