---
status: draft
branch: feat/ink-persist
---
# SPEC: Persistent ink canvas and manual spawn cap (issue #42)

## Objective
Keep the pen and pencil simulation running across page switches, with the same objects in the same places, on every page that shows it except `/playground`. Cap the pens and pencils that a visitor adds by hand. Success: moving between two non-playground pages keeps every object, its position and its role, with no restart of the canvas. Context: issue #42.

Owner decisions (2026-11-27):
- Approach: Astro `ClientRouter` (view transitions) with `transition:persist` on the ink island.
- Manual cap: at most 6 hand-added pens and 6 hand-added pencils alive at once. Automatic population does not count.
- Cap UI: at the cap, the button looks disabled (`aria-disabled="true"`, greyed). A click on it shakes the button and shows a short note. It becomes active again when a hand-added object of that role dies.
- `/playground`: entering it saves and drops the shared canvas. Coming back restores it from the saved snapshot. Only switches between non-playground pages are seamless.

Facts this spec relies on (Astro 5.17.3, `@astrojs/svelte`):
- On a swap, Astro keeps an element with `transition:persist` when the new page has one with the same name, and copies the new page's island props onto it. The Svelte client updates the props in place (`setProps`), so the component stays mounted.
- Without a match on the new page, the persisted element is removed and its island receives `astro:unmount`.
- The swap replaces `document.body` and the `<html>` attributes. Bundled module scripts run once, not on each navigation.

## Acceptance Criteria
- AC-1: `BaseLayout` renders `<ClientRouter />`. On every non-playground page with the simulation, the ink island carries `transition:persist="ink-ambient"`. On `/playground` it carries no `transition:persist`.
  verify: `VAULT_ROOT=tests/fixtures/garden-vault npx astro build --outDir .cache/verify-ink-persist >/dev/null && node tests/verify/ink-persist.mjs .cache/verify-ink-persist`
- AC-2: A helper `src/lib/page-lifecycle.ts` runs an install function on each `astro:page-load` and runs the cleanup that install returned on the next `astro:before-swap`. The `BaseLayout` page script uses it for `installVideoSwap`, `installTimelineRails` and `installWikilinkPreview`. `installTimelineRails` returns a cleanup function that removes its window listeners and observers. The dev monitor installs once. The share button script on `/sim/[name]` also uses the helper.
  verify: `npx vitest run tests/lib/page-lifecycle.test.ts tests/components/timeline-rail.test.ts`
- AC-3: After each swap, the `dark` and `ink-ambient-disabled` classes on `<html>` match the stored theme and ink preference, before the new page paints.
  verify: `npx vitest run tests/lib/page-lifecycle.test.ts -t "theme"`
- AC-4: When its `pathname` prop changes, the persisted ink island keeps its world, objects and frame loop. It applies the route profile of the new path, observes the new page's `[data-section-id]` elements and obstacles, and moves its body observers to the new `document.body`.
  verify: `npx vitest run tests/components/ink-ambient-persist.test.ts`
- AC-5: An `InkObject` has a `manual` flag. `addPredator` and `addPrey` set it on the object they spawn. Outside the playground, they spawn nothing when 6 hand-added objects of that role are alive (`MANUAL_SPAWN_CAP` in `config.ts`). The existing device and per-role caps still apply. The playground keeps its current limits.
  verify: `npx vitest run tests/lib/ink-world.test.ts -t "manual"`
- AC-6: The snapshot stores and restores the `manual` flag, so the cap holds after a return from `/playground` or a reload. A snapshot without the flag restores its objects as automatic.
  verify: `npx vitest run tests/lib/ink-ambient.test.ts -t "snapshot"`
- AC-7: A module store `src/lib/ink-ambient/spawn-state.ts` holds, for each role, the hand-added count and whether the cap is reached. The ink island updates it on each change. A subscriber gets the current value at once and every later change. The store lives in the module, so it survives page swaps.
  verify: `npx vitest run tests/lib/ink-spawn-state.test.ts`
- AC-8: The pen and pencil buttons in `PaperNav` read the store. At the cap, a button has `aria-disabled="true"` and the greyed style, and its accessible name says the limit is reached. A click at the cap spawns nothing, shakes the button and shows a short note in a polite live region for about 1.5 s. Under reduced motion it does not shake.
  verify: `npx vitest run tests/components/paper-nav-spawn.test.ts`
- AC-9: The ink tests, the reading rail and timeline rail tests, and the layout build tests still pass.
  verify: `npx vitest run tests/lib/ink-ambient.test.ts tests/lib/ink-world.test.ts tests/components/garden-toc.test.ts tests/components/timeline-rail.test.ts tests/build`
- AC-10: Existing tests still pass.
  verify: `npx vitest run`
  baseline: pass
- AC-11: Lint passes.
  verify: `npx oxlint`
  baseline: pass
- AC-12: In a browser, moving between two non-playground pages keeps every object, its position and its role, and the canvas does not blink. `/playground` shows its own simulation; coming back restores the shared objects. The theme, the reading rail, the timeline rail, video swap and wikilink previews work after each navigation. Back and forward work.
  verify: manual - browser check across several page switches

## Boundaries
### Always
- Keep simulation rules in `src/lib/ink-ambient/`, free of DOM code.
- Run `svelte-autofixer` on every new or changed Svelte component (ask the owner to run it when the sandbox cannot reach svelte.dev).
- Run `~/dotfiles/scripts/spec check SPEC.md` and `~/dotfiles/scripts/floor-guard` before claiming done.
### Ask first
- New dependencies.
- A custom view transition animation beyond Astro's default.
- A change to the automatic population caps or the Lotka-Volterra settings.
### Never
- Edit a `verify:` line or a test to make a check pass.
- Write site copy. The cap note text is UI text: "Pen limit reached" and "Pencil limit reached".
- Change the playground simulation or its panel.

## Open Questions
- Transition animation. Default: Astro's default fade for page content; the persisted canvas does not animate.
- Pages without the simulation (for example a 404 page). Default: they drop the shared canvas like `/playground`, and the next page with the simulation restores it from the snapshot.
- Mobile nav. `PaperMobileNav` has only the ink on and off toggle, no spawn buttons. Default: no cap UI there.
- Note placement. Default: the note appears below the button, inside the nav, and does not move the layout.
