---
status: draft
branch: feat/ink-panel
---
# SPEC: Playground control panel for the ink simulation (issue #22)

## Objective
Add a themed, collapsible control panel on `/playground` that changes the predator-prey simulation live, so the owner and visitors can explore its rules. The panel sets the object cap (1 to unlimited), start counts, speed, predator survival, flock rules, lifespan scaling, object size and trail length, plus a seed and a reset to defaults. The playground runs its own simulation: it never reads or writes the background simulation's saved state, so no panel setting reaches other pages. Phones get pen, pencil and reset buttons on the playground. Context: issue #22. Builds on #20 (headless core), #27 (calm population) and #29 (touch).

Today every rule reads its values from module constants in `src/lib/ink-ambient/config.ts`, used across 8 modules. A panel must not edit module state. So part 1 moves the tunable values into a config object on the world, with today's constants as defaults. Part 2 builds the panel on top.

## Delivery
Two stacked PRs from this spec, like #20 and #21:
- Part 1 (`feat/ink-panel`): engine config, playground isolation, uncapped objects. AC-1 to AC-8. No visible change on content pages.
- Part 2 (branch from part 1): the panel, seed, mobile buttons and frame-time readout. AC-9 to AC-16.

## Design

### Part 1: engine config
- `SimConfig` in `src/lib/ink-ambient/sim-config.ts`, with `DEFAULT_SIM_CONFIG` built from today's constants:

  | Key | Default | Range in the panel | Applies |
  |---|---|---|---|
  | `objectCap` | 24 (desktop) | 1 to unlimited (`Infinity`) | live |
  | `startPredators` | 4 on the playground | 0 to `objectCap` | on restart |
  | `startPrey` | 6 on the playground | 0 to `objectCap` | on restart |
  | `speedScale` | 1 | 0.25 to 3 | live |
  | `predatorLives` | 3 | 1 to 10 | new objects |
  | `starveSeconds` | 80 | 10 to 600 | live |
  | `lifespanMaxMultiplier` | 4 | 1 to 10 | live |
  | `flockRadius` | 90 | 30 to 300 | live |
  | `flockMinSize` | 3 | 2 to 12 | live |
  | `flockSwitchMargin` | 0.5 | 0 to 0.9 | live |
  | `sizeScale` | 1 | 0.5 to 2.5 | new objects |
  | `trailSeconds` | pen 2.6, pencil 1.4 | 0 to 10, one value scales both | live |
  | `seed` | random | any integer | on restart |

- `createWorld` takes an optional `config: Partial<SimConfig>`, merged over the defaults into `world.config`. Rules read `world.config`. Pure helpers that take objects, not the world (for example `detectFlocks`), get the values they need as parameters, with today's constants as defaults. Content pages pass no config, so their behaviour does not change.
- `FLOCK_KEEP_RADIUS` stays 1.25 times `flockRadius`.
- `setConfig(world, patch)` applies a partial change. Live keys take effect on the next step. "New objects" keys apply to objects spawned after the change.

### Part 1: playground isolation
- On `/playground`, `InkAmbient` neither loads nor saves the snapshot. Each visit starts a fresh world from the defaults (or a seed). Content pages keep `ink-ambient:v1` as today, so playground objects and settings never reach them.
- Every navigation is a full page load (no client router), so the canvas, frame loop and listeners already restart per page. Only the snapshot was shared.

### Part 1: uncapped objects
- On the playground, `objectCap` replaces the device cap and the per-role cap. `objectCap = Infinity` means no cap.
- Spawning still needs a safe point (inside the viewport, clear of obstacles). On the playground, when no point clear of other objects is found, a spawn may overlap other objects. Content pages keep today's separation rule.
- Cost grows with the square of the object count (collisions, catches, flocks). This spec does not add a spatial index; #23 covers performance.

### Part 2: the panel
- `src/components/patterns/InkPanel.svelte`, rendered only on `/playground`:
  - Ink-on-paper theme: 1.5 px ink border, `bg-paper-raised`, mono labels, `shadow-hard-sm`, light and dark from theme tokens.
  - Desktop: a collapsible panel at the right edge. Phones: a bottom sheet with a handle. Collapsed by default on phones.
  - Controls are native range and number inputs with visible labels and values. `objectCap` has a number field and an "unlimited" checkbox.
  - Groups: population, movement, predators, flocks, objects.
  - Buttons: "restart" (applies start counts and seed), "reset to defaults", and a seed field with a "random" button.
  - The panel talks to `InkAmbient` through window events, the same pattern as the nav buttons: `ink-ambient-config` (a partial `SimConfig`) and `ink-ambient-restart` (`{ seed }`).
- Frame-time readout in the panel: object count and average step time. When the average step time passes `FRAME_BUDGET_MS` (8 ms), the readout shows a warning.
- On phones, the panel holds pen, pencil and reset buttons, which the mobile nav lacks.
- Pointer and touch input on the panel never grab objects or reach the canvas.
- Panel values last for the visit only. Presets across visits are out of scope.

## Acceptance Criteria
- AC-1: `DEFAULT_SIM_CONFIG` equals today's constants, and a world created with no config behaves exactly as before: the seeded fingerprint tests are unchanged
  verify: `npx vitest run tests/lib/ink-world.test.ts tests/lib/ink-flicker.test.ts`
- AC-2: `createWorld` merges a partial config over the defaults; `setConfig` applies live keys on the next step and "new objects" keys only to objects spawned after the change
  verify: `npx vitest run tests/lib/ink-sim-config.test.ts -t "merge and apply"`
- AC-3: Each config key changes its rule: speed, starvation, lifespan multiplier, flock radius, flock minimum size, switch margin, object size, trail length and predator lives
  verify: `npx vitest run tests/lib/ink-sim-config.test.ts -t "each key"`
- AC-4: On the playground profile, `objectCap` replaces the device and per-role caps; `objectCap = 1` allows one object, and `Infinity` lets the buttons add 200 objects on a 1280 by 800 viewport
  verify: `npx vitest run tests/lib/ink-sim-config.test.ts -t "object cap"`
- AC-5: Content pages ignore `objectCap` and keep their ambient counts and separation rule
  verify: `npx vitest run tests/lib/ink-world.test.ts -t "calm ambient population"`
- AC-6: On `/playground`, `InkAmbient` neither loads nor saves the snapshot; on other pages it still does
  verify: `npx vitest run tests/lib/ink-sim-config.test.ts -t "snapshot isolation"`
- AC-7: Existing tests still pass
  verify: `npx vitest run`
  baseline: pass
- AC-8: Lint passes and the site builds
  verify: `npx oxlint && npx astro build >/dev/null`
  baseline: pass
- AC-9: The panel renders every control with a label and its current value, and each control dispatches `ink-ambient-config` with its key
  verify: `npx vitest run tests/components/ink-panel.test.ts -t "controls"`
- AC-10: "Restart" dispatches `ink-ambient-restart` with the seed; "reset to defaults" restores every control to `DEFAULT_SIM_CONFIG` and dispatches it
  verify: `npx vitest run tests/components/ink-panel.test.ts -t "restart and reset"`
- AC-11: The "unlimited" checkbox sets `objectCap` to `Infinity` and disables the number field
  verify: `npx vitest run tests/components/ink-panel.test.ts -t "unlimited"`
- AC-12: The same seed and the same config produce the same world fingerprint after a fixed run
  verify: `npx vitest run tests/lib/ink-sim-config.test.ts -t "seed"`
- AC-13: The frame-time readout shows a warning above `FRAME_BUDGET_MS`
  verify: `npx vitest run tests/components/ink-panel.test.ts -t "frame budget"`
- AC-14: The panel is in the `/playground` build and absent from other pages
  verify: `npx astro build --outDir .cache/verify-panel >/dev/null && rg -q "data-ink-panel" .cache/verify-panel/playground/index.html && ! rg -q "data-ink-panel" .cache/verify-panel/index.html`
- AC-15: Pointer and touch input that starts on the panel never grabs an object
  verify: `npx vitest run tests/lib/ink-input.test.ts -t "panel"`
- AC-16: In a browser, light and dark, at 375 px and 1280 px, and on a real phone:
  - the panel matches the site theme and collapses;
  - each control changes the simulation as labelled;
  - "unlimited" with several hundred objects still runs, and the readout warns when slow;
  - pen, pencil and reset work on the phone;
  - after using the playground, content pages still show 2 pens and 3 pencils.
  verify: manual - visual and device check by the owner

## Boundaries
### Always
- Keep `DEFAULT_SIM_CONFIG` equal to today's constants; content pages must not change
- Keep every rule pure: values come from `world.config` or parameters, never from mutated module state
- Run `svelte-autofixer` on every changed Svelte component
- Run `~/dotfiles/scripts/spec check SPEC.md` before claiming done
### Ask first
- New dependencies
- Exposing values outside the table above
- Changing the mobile nav on pages other than `/playground`
### Never
- Persist panel values across visits, or write them to `ink-ambient:v1`
- Add a spatial index or WASM in this spec (#23)
- Edit a `verify:` line to make a check pass

## Open Questions
- Overlap at high caps. Default: on the playground, a spawn may overlap other objects when no clear point is found, so the cap is reachable. Alternative: spawns stop when the screen is full.
- Mobile buttons. Default: pen, pencil and reset live in the playground panel only. Alternative: add them to the mobile nav on every page, which is crowded with six links and the ink toggle.
- Which values to expose. Default: the 13 in the table. Lotka-Volterra rates and boids weights can follow.
- Speed scale. Default: one `speedScale` multiplies prey and predator speeds together, so predators stay faster than prey.
