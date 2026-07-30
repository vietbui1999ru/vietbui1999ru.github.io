# Ink Ambient: Prey Flock Predator Conversion

## 1. Summary

Adds a scarcity-driven role-reversal mechanic to the ink-ambient ecosystem: once
prey have ever been manually added via the nav's pencil button, and whenever
live prey outnumber live predators, prey that are being actively hunted can
band together into a flock (3+ members, clustered via boids-style steering)
and turn on whichever predator is chasing one of them. If that predator gets
caught by the flock's cohesion radius, it doesn't die — it's converted into an
ordinary prey (fresh prey-appropriate size/speed), with the same ink-blot
burst the normal catch mechanic already uses. Builds on
`docs/superpowers/specs/2026-07-29-ink-ambient-ecosystem-redesign-design.md`;
extends it rather than replacing anything there.

## 2. Goals

- When prey outnumber predators and the pencil ("Add a prey") button has ever
  been pressed at least once this session, prey being actively hunted can form
  flocks of 3 or more that reverse their normal flee behavior and pursue the
  specific predator hunting them.
- A pursuing flock uses genuine boids steering (cohesion, separation,
  alignment) layered on top of a primary pull toward the target predator, not
  a simple "move toward centroid" approximation.
- If the target predator comes within the flock's own cohesion radius of any
  current member, it is converted to prey (not destroyed) — fresh
  prey-appropriate radius/chaseSpeed, ink-blot burst at its position, sprite
  and behavior immediately switch to ordinary prey rules.
- Hunting-flock prey render with a smoothly blinking bright-red/pastel-red
  tint; the specific predator currently being hunted renders with a steady
  pastel-green tint — both using the existing spawn-tint rendering technique.
- The mechanic is reactive, not ambient: prey only flock and reverse behavior
  when actually being hunted by a specific predator, not merely whenever 3+
  happen to be near each other under the population condition.

## 3. Non-goals

- No change to the normal predator-catches-prey mechanic, its catch radius,
  or its lives/hunger system — this is an additional, independent path to a
  predator's fate, not a replacement.
- No visible HUD/counter for any of this — consistent with the base spec's
  no-HUD non-goal.
- No speed boost for hunting prey beyond their own rolled `chaseSpeed` — the
  urgency reads through the boids clustering and the color tint, not a
  numeric speed multiplier, at least for this first pass.
- Predators do not get any special awareness of or reaction to being hunted
  (no fleeing, no calling for help) — they keep chasing their own prey target
  obliviously until they're either caught by that prey escaping normally or
  converted by the flock.
- Not a scientifically-motivated addition to the Lotka-Volterra population
  model — this is a discrete-event gameplay mechanic layered on top of the
  existing simulation, independent of the population.ts rhythm generator.

## 4. Trigger and gating

Two independent conditions must both hold for the mechanic to be live at all,
checked once per simulation tick:

1. **One-time unlock**: a new module-level flag in `InkAmbient.svelte`'s
   `onMount` closure, `preyButtonEverPressed = false`, set permanently to
   `true` the first time the pencil ("Add a prey") nav button's handler
   (`forceAddPrey`) fires. Never resets for the rest of the session.
2. **Population condition**: `countAlive("prey") > countAlive("predator")`,
   evaluated fresh each tick (both already-existing helpers).

If either condition is false, the entire mechanic is skipped for that tick —
no clustering, no flag-setting, cheap early exit. Both conditions true is the
gate; nothing else is required to "arm" it beyond that.

## 5. Flock detection and target selection

New module `src/lib/ink-ambient/flocking.ts` (pure, unit-tested), invoked once
per tick from `InkAmbient.svelte`'s `updateSimulation` when the gate above is
open.

### 5.1 Clustering

Among all alive (`vanishElapsed === null`), non-grabbed prey, build connected
components using mutual proximity: an edge exists between two prey if the
distance between their positions is less than `FLOCK_RADIUS`. Union-find or
BFS over this graph; a component qualifies as a **flock** only if it has at
least `FLOCK_MIN_SIZE` (3) members. Prey not in any qualifying component are
unaffected this tick.

### 5.2 Target selection

A qualifying flock only becomes a **hunting flock** if at least one of its
members currently has a predator targeting it — i.e., some predator's
`currentTargetId` equals one of this flock's member ids. If no predator is
currently targeting any member, the flock does not reverse behavior this tick
(its members flee individually as normal, even though they happen to be
clustered) — this is what makes the mechanic reactive rather than ambient.

If multiple predators are each targeting different members of the same
qualifying flock, the flock picks the predator closest to the flock's
centroid (mean position of its members) as its target; ties broken by lowest
predator id, matching the codebase's existing tie-break convention.

### 5.3 Per-tick flags

Two new transient fields on `InkObject` (not persisted/serialized, recomputed
every tick, following the same pattern as `currentTargetId`):

- `huntingFlock: boolean` — true only for prey that are both in a qualifying
  flock and that flock currently has a target predator.
- `beingHunted: boolean` — true only for the specific predator a hunting
  flock has selected as its target.

Both default to `false` at spawn (`makeObject`) and are recomputed by the new
flocking pass at the start of each `updateSimulation` tick, before
`updateObject` runs (so `updateObject` can read them to choose steering).

## 6. Flocking steering (boids)

For prey with `huntingFlock === true`, `updateObject` replaces the normal
`preyAcceleration` call with a new `flockHuntAcceleration` (in
`flocking.ts`), combining four terms as a weighted sum, clamped to the
object's existing `maxAccel`:

1. **Hunt** (primary): direction toward the target predator's position — same
   directional math `predatorAcceleration` already uses, just prey-driven.
2. **Cohesion**: direction toward the mean position of this flock's other
   members within `FLOCK_RADIUS`.
3. **Separation**: for any flock member closer than `FLOCK_SEPARATION_DISTANCE`
   (a much tighter threshold than `FLOCK_RADIUS`), a push directly away from
   it, summed across all such close members. Prevents the group collapsing
   into a single overlapping point.
4. **Alignment**: direction toward the mean velocity of this flock's other
   members within `FLOCK_RADIUS` (steers the group to move together rather
   than as individuals converging from independent angles).

```ts
acceleration =
  FLOCK_HUNT_WEIGHT * huntDirection +
  FLOCK_COHESION_WEIGHT * cohesionDirection +
  FLOCK_SEPARATION_WEIGHT * separationDirection +
  FLOCK_ALIGNMENT_WEIGHT * alignmentDirection
```

Each direction term is a unit vector (or zero if no qualifying neighbors
exist for that term); the weights determine relative influence. Starting
values (tunable live in the browser, same convention as every other constant
in this simulation):

- `FLOCK_RADIUS` — 90 (px)
- `FLOCK_SEPARATION_DISTANCE` — 30 (px)
- `FLOCK_MIN_SIZE` — 3
- `FLOCK_HUNT_WEIGHT` — 1.0
- `FLOCK_COHESION_WEIGHT` — 0.4
- `FLOCK_SEPARATION_WEIGHT` — 0.6
- `FLOCK_ALIGNMENT_WEIGHT` — 0.3

Max speed while hunting stays the prey's own already-rolled `chaseSpeed` — no
separate boost. Prey not in a hunting flock behave exactly as they do today;
nothing changes for them.

## 7. Kill trigger and conversion

Each tick, after the existing `resolveCatches`-driven catch resolution has
been applied (winners/losers/bursts/lives/hunger, all unchanged from the base
spec), a new pass checks every predator with `beingHunted === true`: if it is
within `FLOCK_RADIUS` of *any* current member of the flock currently hunting
it (not a separate, tighter kill-radius — the same radius used for
cohesion, per the explicit design constraint), it is converted:

```ts
predator.role = "prey";
predator.radius = rollRadius("prey", rng);
predator.chaseSpeed = rollChaseSpeed("prey", predator.attractionValue, rng);
predator.currentTargetId = null;
predator.chaseElapsed = 0;
// lives/hungerElapsed/vanishElapsed are simply no longer read for this
// object going forward now that role === "prey" — no explicit reset needed,
// matching how those fields already go unused for prey elsewhere.
```

An ink-blot burst is added at the converted predator's position, reusing the
existing `addBurstEffect`/burst `InkEffect` machinery unchanged — no new
visual effect type.

A predator already mid-vanish (`vanishElapsed !== null`) cannot be a flock
target in the first place (excluded at target-selection time, section 5.2,
consistent with how vanishing objects are already excluded from
`findNearestOpponent`/`resolveCatches` elsewhere) — a predator can't be
un-killed into prey while it's already dying from starvation or lost lives.

If the same predator both wins a normal catch and gets flock-converted in
the same tick, conversion takes precedence — it becomes prey regardless of
what it just ate that tick.

## 8. Visual rendering

Reuses the `source-atop` tint-overlay technique already built for the
spawn-tint cue in `renderer.ts` — no new compositing approach.

- **Hunting flock prey** (`huntingFlock === true`): tint color blends
  between a bright red and a pastel red via a smooth sine-based oscillation
  (same wobble-style time-based math already used elsewhere in this
  renderer/physics code, e.g. `Math.sin(now/1000 * frequency)`), giving a
  "blinking" read without a harsh on/off flicker.
- **Targeted predator** (`beingHunted === true`): a steady pastel-green
  tint, no blinking.
- New config colors: `FLOCK_HUNT_BRIGHT_RED`, `FLOCK_HUNT_PASTEL_RED`,
  `FLOCK_TARGETED_PASTEL_GREEN`, plus a blink-frequency constant.
- On conversion, the object's sprite immediately switches to the pencil
  shape at its newly-rolled prey radius on the very next frame (no
  transition animation beyond the existing spawn-scale/opacity settling that
  already applies to any object, though note this object is NOT going
  through `makeObject`/spawn-fade again — it keeps its existing `opacity`/
  `scale`/`spawnAt`, so no spawn-tint or fade-in re-triggers; it simply
  renders as prey from the next frame onward).

## 9. Testing

Everything in `flocking.ts` is pure and unit-tested, matching the convention
established by `targeting.ts`/`catches.ts`:

- Clustering correctly identifies connected components of 3+ prey within
  `FLOCK_RADIUS`, and correctly excludes components under 3 members or prey
  too far apart to connect.
- Target selection correctly identifies which predator a qualifying flock
  should hunt (a predator targeting one of its members), correctly returns
  no target when no predator is targeting any member, and correctly
  tie-breaks by centroid-distance then lowest id when multiple candidate
  predators target different members of the same flock.
- The four boids force components (hunt/cohesion/separation/alignment) each
  produce correct direction/magnitude given known test positions and
  velocities, including edge cases (a flock member with no other neighbors
  within `FLOCK_SEPARATION_DISTANCE` contributes zero separation force,
  etc.).
- The kill-trigger distance check correctly fires only when the target
  predator is within `FLOCK_RADIUS` of a *current* flock member, and does
  not fire for a predator that's merely `beingHunted` but still far away.

The Svelte-component wiring (per-tick flag setting in `updateSimulation`,
the conversion side-effects, the rendering tint application) is not covered
by unit tests, consistent with how all other component-level wiring in this
ecosystem has been handled — verified via manual browser testing instead.

## 10. Open implementation notes

- `flocking.ts`'s clustering and target-selection functions need read access
  to the full `objects` array each tick, same signature shape as
  `resolveCatches(objects)` — no new per-object stored adjacency data needed
  given the tiny object counts involved (recomputing from scratch each tick
  is cheap).
- `huntingFlock`/`beingHunted` are plain booleans on `InkObject`, defaulting
  to `false` in `makeObject`, alongside `currentTargetId`'s existing
  transient-field pattern.
- Constants in section 6 are explicitly starting values pending live-browser
  tuning, same as every other tunable constant in this simulation
  (population dynamics, spawn ramp, chase acceleration, etc.).
