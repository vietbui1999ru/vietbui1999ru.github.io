---
status: approved
branch: fix/ink-flicker
---
# SPEC: Ink playground page and toggle icon (#21 addition)

## Objective
Give the predator-prey simulation its own public page, `/playground`, where nothing sits in front of the pens and pencils. The owner can then watch and drag them, and run the #21 browser check. On content pages the canvas shares the viewport with nav, cards and prose, and route profiles keep the objects in the side margins. The playground lets them roam the whole viewport. The ink toggle's ON icon changes from Lucide `Sparkles` (which reads as an AI button) to Lucide `PenTool` (a fountain-pen nib); the OFF circle stays. A follow-up issue records the planned config sliders. Context: PR #21, issue #14.

## Acceptance Criteria
- AC-1: `/playground` builds as a public page with the ink ambient enabled and only a page header as content
  verify: `VAULT_ROOT=tests/fixtures/garden-vault npx astro build --outDir .cache/verify-pg >/dev/null && rg -q "ink-ambient-canvas" .cache/verify-pg/playground/index.html && ! rg -q "data-block=" .cache/verify-pg/playground/index.html`
- AC-2: `getRouteProfile("/playground")` returns a `playground` profile whose one region spans the whole viewport, with no edge bias
  verify: `npx vitest run tests/lib/ink-ambient.test.ts -t "playground profile"`
- AC-3: The nav lists home, blog, thoughts, projects, about and playground, in that order
  verify: `npx vitest run tests/data/nav-links.test.ts`
- AC-4: The ink toggle in the desktop and mobile nav shows `PenTool` when on and `Circle` when off; `Sparkles` is gone from both
  verify: `rg -q "PenTool" src/components/svelte/PaperNav.svelte && rg -q "PenTool" src/components/svelte/PaperMobileNav.svelte && ! rg -q "Sparkles" src/components/svelte/PaperNav.svelte src/components/svelte/PaperMobileNav.svelte`
- AC-5: Existing tests still pass
  verify: `npx vitest run`
  baseline: pass
- AC-6: Lint passes
  verify: `npx oxlint`
  baseline: pass
- AC-7: On `/playground` in a browser, light and dark, at 375 px and 1280 px: objects roam the whole viewport, can be dragged with a mouse, the pen, pencil and reset buttons work, and the toggle shows the nib when on
  verify: manual - visual and interaction check in a browser

## Boundaries
### Always
- Reuse `BaseLayout`, `PageHeader` and the existing `InkAmbient`; add no simulation code
- Run `svelte-autofixer` on every changed Svelte component
- Run `~/dotfiles/scripts/spec check SPEC.md` and `~/dotfiles/scripts/floor-guard` before claiming done
### Ask first
- New dependencies
- Any change to simulation rules or constants
### Never
- Write site copy beyond the page title and kicker labels
- Build the config sliders in this change (follow-up issue)
- Edit a `verify:` line to make a check pass

## Open Questions
- Mobile. The mobile nav has only the ink toggle, with no pen, pencil or reset buttons, and drag needs a mouse. Default: unchanged in this spec; the slider issue also covers mobile controls.
- Copy. Default: title `playground`, kicker `ink lab`, a back link to home. The owner can replace them.
- `tests/data/nav-links.test.ts` is a spec A contract test. Default: update its expected list to add playground, and record the change in the PR.
