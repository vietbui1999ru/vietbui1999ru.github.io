# Ink Ambient Remediation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps
> use checkbox (`- [ ]`) syntax for tracking. Read
> `docs/superpowers/specs/2026-07-26-ink-ambient-physics.md` §24 (Remediation addendum)
> before starting any task — it is the normative source for every parameter below.

**Goal:** Fix the "rigid/ugly" ink visual and "wrong" physics/behavior reported against
the first Ink Ambient implementation, without changing its architectural boundaries
(still Canvas 2D inside a Svelte island, still isolated from `src/scenes/`/r3f/Three.js).

**Root cause:** confirmed deviations from the feature's own spec — a faceted polygon
sprite instead of a rounded blob, instant behavior-transition snapping instead of
blended steering, fixed-magnitude collision squash instead of impact-scaled
deformation, a broken/dead boundary-wrap path, and unconditional summing of pointer/
anchor/behavior accelerations instead of priority-gated composition. Full analysis in
spec §24.1.

**Landing order:** A (independent, ship first) → B → C → D (highest conflict risk,
land last) → E → F (docs, can run anytime, no code conflict) → test follow-up (last).

---

## File Map

| Action | Path | Responsibility |
| --- | --- | --- |
| Modify | `src/lib/ink-ambient/renderer.ts` | Spline-based ink silhouette, gradual occlusion opacity |
| Modify | `src/lib/ink-ambient/types.ts` | Add blend-transition fields to `BehaviorState` |
| Modify | `src/lib/ink-ambient/behaviors.ts` | Steering blend, priority-gated pointer reaction |
| Modify | `src/components/svelte/InkAmbient.svelte` | Behavior-swap blend wiring, collision impact scaling, update-order fix, boundary clamp, rotation-from-heading |
| Modify | `src/lib/ink-ambient/physics.ts` | Impact-magnitude return from collision resolution, restitution tune, boundary rewrite, heading-smoothing helper |
| Modify | `tests/lib/ink-ambient.test.ts` | Update collision assertion, add coverage for blend/priority/boundary/rotation |
| Create or amend | `docs/adr/*.md` | Record Ink Ambient runtime boundary + remediation decisions |
| Modify | `CONTEXT.md` | Confirm Ink Ambient vs. scene-engine distinction still accurate |

---

## Task A: Ink silhouette spline + gradual occlusion opacity

**Files:** `src/lib/ink-ambient/renderer.ts` only. No physics/behavior coupling —
independent, safe to land alone.

- [ ] **Step 1:** Replace `createSprite()`'s straight-`lineTo` polygon outline with a
      closed spline through 6-10 seeded control points (Catmull-Rom converted to
      `bezierCurveTo` segments, or direct `quadraticCurveTo`/`bezierCurveTo` chaining).
      Keep determinism: control-point angle/radius jitter must derive from the same
      per-variant seed already used (`(index * 31 + variant * 17) % 19`-style formula
      or a `SeededRng` instance), not `Math.random()`.
- [ ] **Step 2:** Add asymmetry so silhouettes read as "blob, comma, pebble, or
      brush-stroke" (spec §7.1) rather than uniform circles — e.g. pull 1-2 adjacent
      control points inward on a subset of variants to form a tail/taper.
- [ ] **Step 3:** Keep 4-6 cached sprite variants (already the case via
      `rebuildSprites()`'s `[0,1,2,3,4]` map) — do not regenerate per frame.
- [ ] **Step 4:** Change `obstacleOpacity()` from the current two-step function
      (`1 → 0.12 → 0` at `radius` / `radius + 14`) to a linear (or smoothstep)
      interpolation across that same distance band, so ink fades before touching
      protected content instead of snapping.
- [ ] **Step 5:** Visual review in the dev server (no external reference asset
      required per spec §24.2) — confirm silhouettes read as ink, not gems, at both
      small and large radii, in light and dark theme.

**Acceptance:**
- [ ] No straight-line segments remain in the primary blob outline (decorative accent
      stroke may keep its existing `quadraticCurveTo`).
- [ ] `obstacleOpacity()` returns a continuous range, not three discrete values.
- [ ] `rebuildSprites()` still runs only on DPR/theme change, not per frame.

---

## Task B: Steering blend + priority-gated pointer/anchor reactions

**Files:** `src/lib/ink-ambient/types.ts`, `src/lib/ink-ambient/behaviors.ts`.
Also touches the `chooseBehavior` call site in `InkAmbient.svelte` (the single line
where the swap happens), but not the rest of `updateObject`.

**Sequencing note:** Task D also edits `updateObject`. Land this task first (or
together) so Task D reorders `updateObject` against the *final* acceleration-
composition logic, not the old unconditional-sum version — avoids a rebase collision
in the same function.

- [ ] **Step 1:** Add blend-transition fields to `BehaviorState` (`types.ts`) —
      e.g. `blendFrom: Vec2 | null`, `blendElapsed: number`, `blendDuration: number`.
      These are simulation-local; confirm `InkSnapshot` does not need matching
      fields (persistence only stores `behavior` name + `behaviorRemaining`).
- [ ] **Step 2:** At the `chooseBehavior` swap site, capture the outgoing behavior's
      last computed acceleration into `blendFrom` and set `blendDuration` to
      `220ms * temperamentScale`, reusing the exact temperament scale already defined
      in `behaviorDuration()` (`restless` → `0.82`, `lazy` → `1.18`, others → `1`) —
      do not introduce a second temperament-scale constant set.
- [ ] **Step 3:** In `behaviorAcceleration()`, when `blendElapsed < blendDuration`,
      linearly interpolate from `blendFrom` to the new behavior's raw acceleration;
      advance `blendElapsed` by `dt` each step.
- [ ] **Step 4:** Gate pointer-reaction acceleration (currently summed
      unconditionally in `behaviorAcceleration`) so it does not fire during
      committed-intent behaviors — `flee_object`, `streak`, `hide_offscreen` — per
      spec §14.1's priority hierarchy (pointer reaction is tier 5, these are
      effectively higher-commitment autonomous states that should not be diluted).
- [ ] **Step 5:** Gate the `activeAnchor` safe-field pull (currently summed
      unconditionally at the `InkAmbient.svelte` call site) the same way — do not
      apply it while the object is in `flee_object`, `orbit_object`, or
      `seek_boundary`, since those already have their own field-aware steering.

**Acceptance:**
- [ ] No behavior swap produces an instantaneous acceleration-direction discontinuity
      visible frame-to-frame; blend is verified by eye at both `restless` and `lazy`
      temperament.
- [ ] An object executing `flee_object`/`streak`/`hide_offscreen` does not
      simultaneously get pulled by pointer proximity or safe-anchor recall.

---

## Task C: Collision impact scaling + restitution/cooldown tuning

**Files:** `src/lib/ink-ambient/physics.ts` (`resolveCircleCollision`),
`InkAmbient.svelte` (the collision pair loop inside `updateSimulation` only — not
`updateObject`), `tests/lib/ink-ambient.test.ts`.

**Sequencing note:** touches `physics.ts` and one isolated block of
`InkAmbient.svelte`. Low overlap with Task D as long as Task D confines its rewrite to
`updateObject`'s single-object pipeline and `keepInsideViewport`. If both land in the
same review pass, diff the `updateSimulation`/`updateObject` boundary carefully — they
are adjacent functions in the same file.

- [ ] **Step 1:** Change `resolveCircleCollision`'s return from `boolean` to a shape
      that also exposes impulse magnitude (e.g.
      `{ hit: boolean; impulse: number } | false`, or an out-parameter) so callers can
      scale visual response to impact strength.
- [ ] **Step 2:** In the collision loop, replace the fixed `scale.x = 1.14 / scale.y =
      0.82` assignment with a magnitude-scaled squash, e.g.
      `scaleX = 1 + clamp(impulse / K, 0.02, 0.22)` (pick `K` empirically against the
      existing mass range `0.7-1.5` and max speeds `115-260`), squashed proportionally
      on the perpendicular axis.
- [ ] **Step 3:** Gate the squash assignment itself behind a cooldown (reuse
      `effectCooldown` or add a dedicated field) so sustained overlap across
      consecutive fixed steps does not keep re-flattening the object and defeating
      the existing spring-back easing (`object.scale.x += (1 - object.scale.x) *
      Math.min(1, dt * 5)`).
- [ ] **Step 4:** Tune restitution in `resolveCircleCollision` from `0.72` down into
      the `0.30-0.45` range; target `0.38` per spec §24.2 unless visual testing
      motivates otherwise.
- [ ] **Step 5:** Update the existing assertion at
      `tests/lib/ink-ambient.test.ts` (currently
      `expect(resolveCircleCollision(first, second)).toBe(true)`) for the new return
      shape.

**Acceptance:**
- [ ] A graze and a head-on collision visibly produce different squash amounts.
- [ ] Two objects resting against each other (sustained contact) do not flicker
      between squashed and relaxed scale every frame.
- [ ] Restitution constant is in `0.30-0.45`.

---

## Task D: Update-order fix + boundary handling rewrite

**Files:** `src/lib/ink-ambient/physics.ts` (`keepInsideViewport` rewrite),
`InkAmbient.svelte` (`updateObject` — the largest structural diff in this plan).

**Sequencing note:** land this task **last**, after B and C are merged — it rewrites
the function body both of those plug into. If parallelized anyway, this task's author
needs B's and C's diffs as input, not the pre-remediation file, to avoid a three-way
merge conflict.

- [ ] **Step 1:** Reorder `updateObject` to match spec §12's algorithm: compute
      behavior acceleration → apply anchor/boundary force → apply drag → integrate
      velocity/position/rotation. Currently `integrate()` runs before `applyDrag()`
      and before the boundary force is applied.
- [ ] **Step 2:** Remove the teleport-wrap branch from `keepInsideViewport()` for
      ordinary (non-exiting) behaviors — per spec §24.2, wraparound is not an
      approved boundary strategy outside the existing `hide_offscreen`/`streak`/throw
      exit paths (which already bypass this function via `canLeaveViewport`).
- [ ] **Step 3:** Replace the un-scaled (`+= softness`, not `dt`-multiplied) velocity
      nudge with a proper `dt`-scaled steering force proportional to penetration
      depth past the margin, applied as part of the acceleration sum before
      integration (not as a direct velocity mutation after the fact).
- [ ] **Step 4:** If an object still reaches the extreme edge despite continuous
      boundary steering (e.g. after an unusual velocity spike), hard-clamp position
      to `[radius, width - radius]` / `[radius, height - radius]` per spec §24.2 —
      do not wrap or teleport.

**Acceptance:**
- [ ] No object can be observed to teleport/pop from one edge to the opposite edge
      during ordinary (non-`streak`/`hide_offscreen`) motion.
- [ ] No visible edge oscillation/twitchiness when an object lingers near a boundary.
- [ ] `updateObject`'s force/integration order matches spec §12 step-by-step.

---

## Task E: Rotation coupled to heading

**Files:** `src/lib/ink-ambient/physics.ts` (`integrate`, or a new smoothing helper),
`InkAmbient.svelte` (`makeObject` — remove spawn-random `angularVelocity` as the base
driver).

**Sequencing note:** touches `integrate()`, which Task D's reordered pipeline also
calls — land after Task D to avoid clobbering the corrected step order.

- [ ] **Step 1:** Derive `rotation` from a smoothed `atan2(velocity.y, velocity.x)`
      instead of integrating a free-running `angularVelocity` every step.
- [ ] **Step 2:** Apply smoothing (e.g. an exponential lerp toward the target heading
      angle, careful with angle wraparound at ±π) so rotation doesn't snap when
      velocity direction changes abruptly.
- [ ] **Step 3:** Remove or repurpose the spawn-random `angularVelocity` field as the
      base motion driver. An optional small collision-triggered rotational
      perturbation may be layered on top as an embellishment, but heading-coupling is
      the required baseline (spec §24.2).

**Acceptance:**
- [ ] An object's rotation visibly tracks its direction of travel.
- [ ] No object spins independently of its velocity direction at rest or during slow
      movement.

---

## Task F: ADR + CONTEXT.md documentation

**Files:** `docs/adr/` (new entry or amend `2026-07-20-astro-svelte-islands-migration.md`),
`CONTEXT.md`.

**Sequencing note:** no code dependency — can run in parallel with any other task.

- [ ] **Step 1:** Record the Ink Ambient / legacy r3f-scene-engine runtime boundary
      decision in an ADR (new file or amendment to the existing migration ADR),
      satisfying spec §22's previously-unmet "documented in an ADR or ADR 001
      amendment" acceptance criterion.
- [ ] **Step 2:** Record this remediation's key decisions (restitution target,
      rotation-from-heading, boundary hard-clamp, no-wrap policy) in the same ADR or
      a follow-up entry, so future contributors don't reintroduce the fixed defects.
- [ ] **Step 3:** Confirm `CONTEXT.md` still accurately distinguishes Ink Ambient from
      the scene engine; update if drifted.

**Acceptance:**
- [ ] An ADR exists that a reviewer can point to for spec §22's architecture checklist.
- [ ] `CONTEXT.md` requires no further correction after this task.

---

## Test follow-up (cross-cutting, do last)

**Files:** `tests/lib/ink-ambient.test.ts`.

Run after Tasks A-E land, since it asserts against their final signatures/behavior.

- [ ] Update/add coverage for: `resolveCircleCollision`'s new return shape (Task C),
      behavior-transition blend timing (Task B), priority gating of pointer/anchor
      reactions during committed behaviors (Task B), boundary hard-clamp instead of
      wrap (Task D), rotation tracking heading (Task E).
- [ ] Confirm the full suite still passes and `npm run build` succeeds.
