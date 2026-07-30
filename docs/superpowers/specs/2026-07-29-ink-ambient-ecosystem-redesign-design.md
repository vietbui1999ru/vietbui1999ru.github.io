# Ink Ambient: Ecosystem Redesign (decoupled agents, lives/hunger, population dynamics)

## 1. Summary

Replaces the ink-ambient sim's fixed 1-to-1 pairing model with a free-agent
ecosystem: every predator (pen) continuously retargets whichever prey
(pencil) is currently nearest, independent of any assigned partner.
Multiple predators can converge on the same prey. A caught prey is
destroyed (ink-blot "blood" burst at its position); the winning predator
survives and keeps hunting. Predators carry two independent survival
mechanics — discrete lives (lost when a rival predator wins a prey you
were chasing) and a continuous hunger timer (fades color, then vanishes,
if too long since your last catch). Population targets are no longer a
fixed max — they're driven by a small Lotka-Volterra population model
that cycles prey/predator counts over time, with a manual "top-up" button
in the nav to force an immediate refill toward the current target.

Builds directly on `docs/superpowers/specs/2026-07-28-ink-ambient-predator-prey-chase-design.md`
and the two follow-up iterations already shipped (size differentiation,
pen/pencil sprites, sticky roles, ink-blot burst). This spec **removes**
the pairing/sticky-role machinery those introduced — it's superseded, not
extended, by continuous per-tick targeting.

## 2. Goals

- Predators and prey are independent agents, not halves of a fixed pair.
  A predator always steers toward whichever prey is nearest *right now*.
- A caught prey is destroyed (existing ink-blot burst, now understood as
  the prey's "blood"); the predator that caught it survives.
- Multiple predators can race for the same prey. Losing that race costs
  the loser a life. Winning resets the winner's hunger.
- Predators have 3 lives and a starvation timer; either reaching its
  limit triggers a vanish animation and removal.
- Predators ramp up from a slower spawn speed to full speed over a few
  seconds — a fixed warm-up curve from spawn, independent of any later
  catches or losses.
- Population counts (how many prey, how many predators should exist right
  now) are driven by a Lotka-Volterra ODE instead of a fixed max, and a
  manual nav button can force an immediate top-up toward that target.
- Dragging a predator near a different prey (even one another predator is
  already chasing) makes it immediately chase that new nearest prey.
- A held (grabbed) prey remains a valid, trackable target — predators
  don't ignore it just because the user is holding it.

## 3. Non-goals

- No visible score/HUD element. "Scoring" is internal bookkeeping (hunger
  reset, lives) with no on-screen counter.
- Prey has no lives/hunger/aging mechanic — it only ever dies by being
  caught. (It still has the existing panic-wobble fleeing behavior.)
- No change to the catch-adjacent visual language beyond what's specified
  here: trail rendering, sprite shapes/sizes, and general steering-and-wobble
  math (`predatorAcceleration`/`preyAcceleration`'s direction+wobble
  approach) are unchanged in spirit — only *what* they steer toward
  changes (dynamic nearest target instead of a fixed partner).
- No multiplayer/shared state — this is still a single client's local
  canvas simulation.
- The Lotka-Volterra model is a *stylistic* population-rhythm generator,
  not a scientifically faithful simulation — parameters are tuned for a
  pleasant, bounded on-screen cycle, not biological accuracy.

## 4. Architecture: from fixed pairs to continuous targeting

### 4.1 What's removed

`src/lib/ink-ambient/pairing.ts` loses `formPair`, `formInitialPairs`,
`detachPair`, `reevaluatePartner`, `recalibratePair`, and
`resolveStickyRoles` entirely — there is no pair relationship left to
form, break, recalibrate, or keep sticky. `InkObject.partnerId` and
`formerPartnerId` are removed from `types.ts`. Every existing test in
`tests/lib/ink-ambient.test.ts` that exercises these functions is removed
and replaced per §9.

### 4.2 Role, radius, and chaseSpeed become spawn-time properties

Today these are assigned when a pair forms. With no pairing, they're
rolled once at spawn instead, in `makeObject` (`InkAmbient.svelte`):

- Role: a coin flip (`rng.chance(0.5)`), same 50/50 split as before.
- Radius: rolled from the same role-specific ranges as today
  (`PREY_RADIUS_MIN/MAX`, `PREDATOR_RADIUS_MIN/MAX`).
- `chaseSpeed`: prey rolls from `[PREY_SPEED_MIN, PREY_SPEED_MAX]`
  (vigor-weighted by `attractionValue`, same formula as today's
  `rollPreySpeed`); predator's `chaseSpeed = ownSpeed-independent roll`
  — **not** derived from a partner's prey speed anymore, since there's no
  paired prey at spawn time. Predator instead rolls its own value from
  `[PREY_SPEED_MIN * PREDATOR_SPEED_MULTIPLIER_MIN, PREY_SPEED_MAX *
  PREDATOR_SPEED_MULTIPLIER_MAX]` (vigor-weighted the same way via
  `rollPredatorMultiplier`-equivalent logic applied to the same range
  bounds). This keeps predators statistically faster than prey as a
  population without requiring a specific paired prey to derive from.
- A drag/throw no longer recalibrates anything — it only changes
  position/velocity. Role/radius/chaseSpeed are fixed for the object's
  lifetime once rolled at spawn. (This is what makes today's "sticky
  roles" feature moot: there's no more re-roll event to be sticky about.)

### 4.3 Per-tick targeting

New function in `pairing.ts` (or a renamed module — implementer's call,
but keep it in `src/lib/ink-ambient/` alongside the physics/pairing split):
`findNearestOpponent(object, objects)` — same nearest-neighbor scan as
today's `findNearestAvailable`, but:

- Filters candidates to the **opposite role only** (predator searches
  prey, prey searches predator) — not "opposite role AND unpaired," since
  there's no unpaired concept anymore.
- Does **not** exclude `grabbed` candidates — a held object is still a
  valid target in both directions (predators still chase a held prey;
  the search a held predator would run, if it ever needs one, isn't
  excluded either, though a grabbed object doesn't run its own steering
  while held, per existing `updateObject` behavior).
- Excludes candidates currently mid-vanish-animation (§7) — a fading-out
  predator shouldn't be selected as anything (irrelevant for prey search
  since only predators vanish, but keep the guard for consistency).

Called every simulation tick for every non-grabbed object, replacing the
`partner = objects.find(...)` partnerId lookup in `updateObject`.

**Anti-flicker rule:** to avoid a predator's direction jittering when two
prey are nearly equidistant, only switch the *tracked* target
(`object.currentTargetId`, a new transient field — recomputed each tick
but persisted between ticks so we can detect a change) if the new nearest
candidate is more than 10% closer than the currently-tracked target's
distance (or the currently-tracked target no longer exists / isn't a
valid candidate at all, e.g. it just got caught). When the tracked target
*does* change, blend into the new steering direction using the same
`motionBlend` mechanism today's pair-formation uses (`MOTION_BLEND_SECONDS`),
now triggered by "tracked target changed" instead of "pair formed."

### 4.4 Prey panic scales with nearby predator count

`preyAcceleration`'s wobble amplitude (currently `PREY_WOBBLE_FACTOR *
preyPanicRamp(object, predator)`, scaled by proximity to its one target)
gains an additional multiplier: count how many predators are within some
threshold distance (proposing `(prey.radius + predator.radius) *
ATTRACTION_RAMP_START_MULTIPLIER`, reusing the existing ramp-start
distance already used for proximity ramps) and scale wobble up
further per nearby predator (e.g. `1 + 0.25 * (nearbyCount - 1)`,
clamped to a sane ceiling like 2x) — a prey being converged on by three
predators panics visibly harder than one being chased by one.

## 5. Catch resolution

Replaces the `mutuallyPaired && circlesOverlap` block in
`updateSimulation`. Each tick:

1. For every predator, check overlap against every prey using a new,
   *smaller* catch-only radius (§6.2) — not the full physics `radius`.
2. Collect all (predator, prey) overlapping pairs this tick.
3. Group by prey: for each prey with 1+ overlapping predators, the
   **closest** predator (by distance) wins. (Ties — exactly equal
   distance — broken by lowest object id, matching the existing
   `findNearestAvailable` tiebreak convention.)
4. Winning predator: `hungerElapsed = 0`. Prey: destroyed, ink-blot burst
   spawned at its position (its "blood").
5. Every *other* predator whose `currentTargetId` equals this prey's id
   at the moment of the catch (i.e., was actively chasing it and lost):
   `lives -= 1`. Predators not targeting this specific prey are
   unaffected, even if they also happened to overlap a *different* prey
   this same tick (each prey's resolution is independent).
6. A predator whose `lives` reaches 0, or whose `hungerElapsed` reaches
   `PREDATOR_STARVE_SECONDS`, enters the vanish animation (§7) instead of
   being removed immediately.

## 6. Predator kinematics

### 6.1 Spawn ramp

New field `InkObject.spawnElapsed` (seconds since this object was
created — could reuse the existing `spawnAt`/now-timestamp pattern
already used for spawn-fade instead of a new field; implementer's call
which is cleaner). New config `PREDATOR_SPAWN_RAMP_SECONDS` (~3) and
`PREDATOR_SPAWN_RAMP_START_FRACTION` (~0.5). For predators only, the
`maxSpeed` calculation in `updateObject` gains a multiplier:
`lerp(PREDATOR_SPAWN_RAMP_START_FRACTION, 1, min(1, spawnElapsed /
PREDATOR_SPAWN_RAMP_SECONDS))` — linear ramp from 50% to 100% of the
predator's rolled `chaseSpeed` over the first ~3 seconds of its life.
Applies once at spawn, not on every catch/vanish/respawn cycle for a
*surviving* predator (a predator that's been alive and hunting for
hours doesn't re-ramp — only freshly spawned ones do).

### 6.2 Tighter catch-trigger radius

New config `PREDATOR_PREY_CATCH_RADIUS_FRACTION` (~0.65), applied to
*both* objects' radii when checking catch overlap in §5 step 1:
`(predator.radius * FRACTION + prey.radius * FRACTION)` as the overlap
threshold, instead of the full `predator.radius + prey.radius`. This is
catch-detection-only — rendering, boundary steering, and obstacle
repulsion keep using the full `radius` unchanged.

## 7. Lives, hunger, and vanish rendering

New `InkObject` fields (predators only meaningful, but present on all
objects for type simplicity — prey's `lives`/`hungerElapsed` just go
unused, matching how `role` is already nullable/unused for some paths):

- `lives: number` — starts at 3 for predators (irrelevant for prey).
- `hungerElapsed: number` — seconds since last catch (or since spawn, if
  never caught), starts at 0.
- `vanishElapsed: number | null` — `null` while alive; set to `0` the
  instant lives or hunger hits its limit, then counts up each frame
  during the vanish animation.

New config: `PREDATOR_STARVE_SECONDS` (~16), `VANISH_DURATION_SECONDS`
(~0.5).

**Rendering (opacity-based, not recoloring):**
`renderedOpacityMultiplier = livesFadeStep(lives) * (1 - hungerElapsed /
PREDATOR_STARVE_SECONDS)`, where `livesFadeStep` maps 3→1.0, 2→0.7,
1→0.4 (matches the brainstormed stepped-dimming). This multiplies into
the existing `object.opacity` at render time (`renderer.ts`'s `draw()`),
not stored back into `object.opacity` itself (which is still separately
owned by the spawn-fade-in logic).

**Vanish animation:** once `vanishElapsed !== null`, `updateObject` skips
normal steering entirely for that object and instead drives `scale.x`/
`scale.y` toward 0 and `opacity` toward 0 linearly over
`VANISH_DURATION_SECONDS`. When `vanishElapsed >= VANISH_DURATION_SECONDS`,
the object is removed from the array (same removal pattern
`updateSimulation` already uses for caught prey).

## 8. Population dynamics (Lotka-Volterra)

### 8.1 Model

New small module, e.g. `src/lib/ink-ambient/population.ts`:

```ts
export interface PopulationState { prey: number; predator: number }

export function stepLotkaVolterra(state: PopulationState, dt: number): PopulationState {
  const { prey: x, predator: y } = state;
  const dx = LV_ALPHA * x - LV_BETA * x * y;
  const dy = -LV_GAMMA * y + LV_DELTA * x * y;
  return {
    prey: Math.max(0.05, x + dx * dt),
    predator: Math.max(0.05, y + dy * dt),
  };
}
```

Integrated once per simulation tick (`FIXED_STEP`) inside
`updateSimulation`, alongside a persisted `PopulationState` (module-level
state in `InkAmbient.svelte`'s `onMount` closure, same lifetime as
`objects`). `LV_ALPHA/BETA/GAMMA/DELTA` are new config constants tuned
(by the implementer, iterating in the browser) so a full boom/bust cycle
takes roughly 20-40 seconds and `prey`/`predator` stay within a range
that maps cleanly to small integer targets — floor is enforced at 0.05 to
avoid the classic Lotka-Volterra "populations approach but never reach
zero" turning into a literal zero that stalls the oscillation.

### 8.2 Mapping to integer targets

`preyTarget = clamp(round(state.prey * SCALE), 1, PREY_TARGET_MAX)`,
same for `predatorTarget`, where `SCALE` is a tuning constant chosen so
the *combined* max (`PREY_TARGET_MAX + PREDATOR_TARGET_MAX`) doesn't
exceed today's existing `MAX_OBJECTS_DESKTOP`/`MAX_OBJECTS_MOBILE`
(4/2). Continuous top-up (already the agreed respawn model) now spawns
toward `preyTarget`/`predatorTarget` instead of a fixed split, and can
also *not* replace a vanished/eaten object immediately if the current
target for that role is already met or exceeded — population visibly
breathes with the cycle instead of staying pinned at a constant count.

### 8.3 Manual top-up button

New button in `PaperNav.svelte`, visually identical to the existing
ink-ambient-toggle/theme-toggle (`h-8 w-8` bordered square, same
`lift`/border/shadow classes), placed adjacent to the theme toggle.
`onclick` dispatches `window.dispatchEvent(new CustomEvent("ink-ambient-topup"))`
— no local state needed in the nav component, mirroring how
`ink-ambient-change` is already a fire-and-forget event. `InkAmbient.svelte`
adds a listener (alongside its existing `ink-ambient-change` listener)
that, on receipt, immediately spawns objects up to the *current*
`preyTarget`/`predatorTarget` (skipping the normal randomized respawn
delay) rather than overriding the Lotka-Volterra targets themselves —
it's a "catch the scene up to where the model already says it should
be," not a cheat that inflates the targets.

## 9. Testing

`tests/lib/ink-ambient.test.ts` loses every test covering
`formPair`/`formInitialPairs`/`detachPair`/`reevaluatePartner`/
`recalibratePair`/`resolveStickyRoles` (§4.1). New coverage:

- `findNearestOpponent` returns the correct nearest opposite-role
  candidate, includes grabbed objects, excludes same-role and
  mid-vanish objects.
- Anti-flicker: a tracked target does *not* switch when a new candidate
  is only marginally closer (under the 10% threshold), but does switch
  when clearly closer or when the tracked target no longer exists.
- Catch resolution: multiple predators overlapping the same prey in one
  tick resolves to the closest winner; every other predator whose
  `currentTargetId` was that prey loses exactly 1 life; predators not
  targeting that prey are unaffected.
- Lives/hunger vanish thresholds: `lives` reaching 0 and `hungerElapsed`
  reaching `PREDATOR_STARVE_SECONDS` both trigger `vanishElapsed` to
  start; a catch resets `hungerElapsed` to 0.
- `stepLotkaVolterra` produces a bounded, oscillating series over many
  steps (no NaN/negative/unbounded blowup) for the tuned constants.
- Spawn ramp: a freshly-spawned predator's effective max speed is below
  its full `chaseSpeed` immediately after spawn and reaches full speed
  by `PREDATOR_SPAWN_RAMP_SECONDS`.

## 10. Open implementation notes

- `motionBlend`'s trigger changes from "pair formed/broken" to "tracked
  target changed" (§4.3) — the field and its consumption in
  `updateObject` stay structurally the same, just re-triggered from a
  different call site.
- `InkObject.partnerId`/`formerPartnerId` removal touches `persistence.ts`
  only if it currently serializes those fields — confirm during
  implementation (per the original spec, the snapshot schema already
  only stores `id`/`position`/`velocity`/`attractionValue`/`rngState`, so
  this is likely a non-issue, not a required change).
- This is a full removal-and-rebuild of `pairing.ts`'s public surface;
  expect the plan to restructure that file substantially rather than
  patch it incrementally.
