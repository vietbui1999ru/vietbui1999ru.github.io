---
status: approved
branch: refactor/ink-core
---
# SPEC: Ink-ambient simulation core (issue #14, part 1)

## Objective
Move the ink-ambient world state and step loop out of `InkAmbient.svelte` into a framework-free core, with no behaviour change. The core must run headless, seeded and deterministic, so part 2 can reproduce the green/red flicker in a test before fixing it. The rule modules (`targeting`, `flocking`, `catches`, `population`, `lifecycle`) stay where they are; the core composes them. Success: a test steps a seeded world for thousands of frames with no DOM, and the component only wires the DOM, the renderer and the pointer to the core. Context: issue #14.

## Acceptance Criteria
- AC-1: `src/lib/ink-ambient/world.ts` exports `createWorld(options, seed)`, which returns the world state (objects, effects, rng, population, flock state, spawn timers, geometry), plus the world actions: initial spawn, add predator, add prey, reset and snapshot restore
  verify: `npx vitest run tests/lib/ink-world.test.ts -t "world"`
- AC-2: `src/lib/ink-ambient/step.ts` exports `step(world, dt, now, rules?)` and `DEFAULT_RULES`; `step` runs the rules in order, and a world stepped with an extra rule runs that rule after the defaults
  verify: `npx vitest run tests/lib/ink-world.test.ts -t "rules"`
- AC-3: Two worlds created with the same seed and geometry, stepped 1,200 frames, end in identical states; a different seed ends in a different state
  verify: `npx vitest run tests/lib/ink-world.test.ts -t "determinism"`
- AC-4: A seeded world stepped 3,600 frames headless keeps its invariants: no NaN positions or velocities, every object inside the viewport, and each role at or under its per-role cap
  verify: `npx vitest run tests/lib/ink-world.test.ts -t "invariants"`
- AC-5: Adding prey sets the prey-button flag, the add actions respect the device and per-role caps, and reset clears objects, population, spawn timers and flock state
  verify: `npx vitest run tests/lib/ink-world.test.ts -t "actions"`
- AC-6: The core uses no DOM or browser globals
  verify: `! rg -q "document\.|window\.|performance\.|requestAnimationFrame|matchMedia|localStorage" src/lib/ink-ambient/world.ts src/lib/ink-ambient/step.ts`
- AC-7: `InkAmbient.svelte` keeps only the DOM, renderer, pointer and frame-loop wiring: it imports none of the rule modules and is under 500 lines
  verify: `! rg -q "ink-ambient/(targeting|flocking|catches|population|lifecycle|spawn)\"" src/components/svelte/InkAmbient.svelte && test "$(wc -l < src/components/svelte/InkAmbient.svelte)" -lt 500`
- AC-8: The site builds
  verify: `VAULT_ROOT=tests/fixtures/garden-vault npx astro build --outDir .cache/verify-ink >/dev/null`
- AC-9: Existing tests still pass
  verify: `npx vitest run`
  baseline: pass
- AC-10: Lint passes
  verify: `npx oxlint`
  baseline: pass
- AC-11: In the browser the ink ambient behaves as before: spawning, chasing, catches, flocks, the pen and pencil buttons, reset, drag and throw, and the snapshot restore after reload
  verify: manual - side-by-side behaviour check in a browser

## Boundaries
### Always
- Move code as it is. Keep the order of every rng call, so a seed gives the same run as before
- Keep `InkObject`, the renderer and the persistence format unchanged
- Run `svelte-autofixer` on `InkAmbient.svelte`
- Run `~/dotfiles/scripts/spec check SPEC.md` and `~/dotfiles/scripts/floor-guard` before claiming done
### Ask first
- Any change to rule behaviour, constants or tints
- New dependencies
### Never
- Fix the flicker in this spec; that is part 2
- Edit a `verify:` line or a test to make a check pass

## Open Questions
- Pause and geometry. Default: the component keeps the modal-pause check and builds obstacles from the DOM; the core takes width, height, obstacles and the route profile through a `setGeometry` action and builds the spatial field itself.
- Pointer drag. Default: it stays in the component and mutates `world.objects`, as today; the core only reads `grabbed`.
- Snapshot saving. Default: the component keeps `saveSnapshot` and `loadSnapshot` (they use `localStorage`); `restoreWorld` takes the loaded snapshot.
