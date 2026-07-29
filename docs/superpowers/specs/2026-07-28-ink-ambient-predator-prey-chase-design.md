# Ink Ambient: Predator/Prey Chase

## 1. Summary

Replaces the mutual "attract and collide" pairing behavior in the Ink Ambient
background sim with a directional predator/prey chase: one object in a pair
actively pursues the other at a faster top speed, both follow a curved
(zigzag) path rather than a straight line, and dragging/throwing either
object recalibrates its partner's speed to preserve the predator-faster
relationship. Builds on the existing pairing/physics system documented in
`docs/superpowers/specs/2026-07-26-ink-ambient-physics.md`.

## 2. Goals

- Pairs read as a chase, not mutual gravitation: one object (predator) seeks
  the other (prey); prey flees.
- Predator's top speed is always greater than its prey's, by a believable
  margin, without hand-tuned per-pair exceptions.
- Both objects follow a curved path — predator weaves deliberately, prey
  jukes erratically — instead of a straight-line vector to/from the target.
- Dragging and throwing either object (existing grab/throw interaction)
  recalibrates the *other* object's speed so the predator > prey
  relationship holds after the throw, at any thrown velocity.
- New speed ranges stay close to the sim's existing ~115–155 max-speed band
  so the chase doesn't look like a different simulation.

## 3. Non-goals

- No new "species" visuals (color, shape) distinguishing predator from prey
  — role is a behavioral state, not a rendered trait, matching how
  `attractionValue` is invisible today.
- No change to catch/collision behavior: mutual overlap between paired
  partners still destroys both with the existing burst effect and triggers
  a new pair spawn. This spec only changes *how they move toward that
  moment*, not what happens at it.
- No predictive/pursuit steering (aiming ahead of the target's velocity).
  Zigzag comes from a lateral sine wobble on top of a direct seek/flee
  vector, reusing the wobble fields already on `InkObject`.
- No change to non-paired collision handling (`resolveCircleCollision`
  bounce-off between objects that aren't partners).

## 4. Data model changes (`types.ts`)

Add to `InkObject`:

```ts
role: "predator" | "prey" | null; // null when unpaired
chaseSpeed: number;               // this object's current max-speed cap while paired
```

`attractionValue` (existing per-object stat, range `ATTRACTION_VALUE_MIN`
0.5–`ATTRACTION_VALUE_MAX` 1.5, already randomized per object and persisted
in snapshots) is repurposed as "vigor": for a predator it scales hunting
drive (pushes its speed multiplier toward the top of its range), for prey
it scales spryness (pushes its base speed toward the top of its range).
Existing config constants and snapshot persistence are unchanged.

## 5. Role assignment and speed rules

New config constants (`config.ts`):

```ts
PREY_SPEED_MIN = 95;
PREY_SPEED_MAX = 130;
PREDATOR_SPEED_MULTIPLIER_MIN = 1.15;
PREDATOR_SPEED_MULTIPLIER_MAX = 1.45;
```

At pair formation (`formPair` in `pairing.ts`, called from both
`formInitialPairs` and `reevaluatePartner`):

1. Coin flip assigns one object `role: "predator"`, the other `role: "prey"`.
2. Prey's `chaseSpeed` is rolled in `[PREY_SPEED_MIN, PREY_SPEED_MAX]`,
   weighted by the prey object's `attractionValue` (higher vigor → closer
   to `PREY_SPEED_MAX`).
3. Predator's `chaseSpeed = preySpeed * multiplier`, where `multiplier` is
   rolled in `[PREDATOR_SPEED_MULTIPLIER_MIN, PREDATOR_SPEED_MULTIPLIER_MAX]`,
   weighted by the predator object's own `attractionValue`. This guarantees
   `predator.chaseSpeed > prey.chaseSpeed` by construction — no clamping
   race is possible.

This replaces the current mass-derived `maxSpeed` formula in
`updateObject` for paired objects: `maxSpeed = object.chaseSpeed` when
paired, falling back to the existing mass-based formula when unpaired
(idle objects keep today's behavior unchanged).

The existing "final rush" ramp (`pairApproachRamp`, scales up to
`ATTRACTION_RAMP_MAX` as a pair closes in on touching) is kept **only for
the predator**, applied as a multiplier on top of its `chaseSpeed` — a
pounce burst as it closes the gap. Prey's `chaseSpeed` is not ramped by
proximity; its speed stays flat so the chase reads as "prey holds its
pace, predator surges" rather than both mutually accelerating into the
collision (today's symmetric behavior).

## 6. Chase steering (`pairing.ts`)

Replace `pairAcceleration` with two directional functions, both following
the same shape as today's function (direction × clamped magnitude, plus a
wobble term):

```ts
function predatorAcceleration(object: InkObject, prey: InkObject, maxAccel: number, now: number): Vec2
function preyAcceleration(object: InkObject, predator: InkObject, maxAccel: number, now: number): Vec2
```

- **Base direction**: predator seeks the prey's current position
  (`normalize(subtract(prey.position, object.position))`); prey flees the
  predator's current position (`normalize(subtract(object.position,
  predator.position))`). No velocity prediction — this is the same
  direct-vector approach `pairAcceleration` already uses, just made
  directional instead of mutual.
- **Magnitude**: derived from `object.chaseSpeed` (predator includes the
  proximity ramp from §5; prey does not), clamped to `maxAccel` as today.
- **Lateral wobble** (the zigzag): a sine-wave offset perpendicular to the
  base direction, using the object's existing `wobbleFrequency` /
  `wobblePhase` fields (same pattern as today's idle wobble and the
  pre-collision wobble fade in `pairAcceleration`):
  - Predator: small, slow wobble — amplitude ≈15% of its accel magnitude.
    Reads as deliberate weaving, not confusion.
  - Prey: larger, faster wobble — amplitude ≈40% of its accel magnitude
    at baseline, **scaling up further as the predator closes in**, reusing
    the same proximity-ramp math as `pairApproachRamp` but driving wobble
    amplitude instead of speed. This inverts today's behavior (wobble
    *fades* near collision in `pairAcceleration`) — for prey, panic
    *grows* as the gap closes.

`updateObject` in `InkAmbient.svelte` swaps its single
`pairAcceleration(object, partner, maxAccel, now)` call for:

```ts
object.role === "predator"
  ? predatorAcceleration(object, partner, maxAccel, now)
  : preyAcceleration(object, partner, maxAccel, now)
```

## 7. Drag / throw recalibration

In `releasePointer` (`InkAmbient.svelte`), when a dragged object is thrown
(`throwObject` true, velocity clamped to ±260 as today, unchanged):

1. The thrown object's new `chaseSpeed` = magnitude of its clamped throw
   velocity. If it's prey, this is further clamped so a very light flick
   or a very hard throw still lands in a sane band (95 up to ~180 — some
   overshoot above `PREY_SPEED_MAX` is allowed since a real throw should
   feel responsive); if it's predator, no extra ceiling beyond the ±260
   pointer clamp.
2. `reevaluatePartner` (already called on release to re-pair) re-rolls the
   partner's `chaseSpeed` fresh, not a scaled copy of its old value: if the
   thrown object is now predator, prey's `chaseSpeed` is re-rolled from
   `[PREY_SPEED_MIN, PREY_SPEED_MAX]`; if the thrown object is prey,
   predator's `chaseSpeed` = new prey speed × a freshly rolled multiplier
   from `[PREDATOR_SPEED_MULTIPLIER_MIN, PREDATOR_SPEED_MULTIPLIER_MAX]`.
   This keeps the margin intact regardless of throw force, and avoids
   compounding ratios across repeated throws.
3. If the throw breaks up a pair and forms a brand-new one via
   `reevaluatePartner`, role + speed assignment for that new pair follows
   the same `formPair` logic as §5 — no separate code path.

## 8. Catch behavior (unchanged)

Mutual overlap between paired partners (`mutuallyPaired && circlesOverlap`
in `updateSimulation`) still destroys both objects, plays the existing
burst effect, and triggers a new pair spawn when the population hits zero.
No change to this block. Role only changes *how* a pair converges, not
what happens at convergence.

## 9. Testing

`tests/lib/ink-ambient.test.ts` already unit-tests pairing/physics
primitives without any DOM/canvas dependency. New cases follow the same
style:

- `formPair` assigns exactly one predator and one prey, and
  `predator.chaseSpeed > prey.chaseSpeed` holds across many seeded rolls.
- Rolled speeds stay within `[PREY_SPEED_MIN, PREY_SPEED_MAX]` for prey and
  within the derived multiplier band for predator.
- `predatorAcceleration`'s base direction points toward the prey;
  `preyAcceleration`'s base direction points away from the predator.
- Prey's wobble amplitude increases monotonically as distance to predator
  decreases (mirrors the existing `pairApproachRamp` proximity test, but
  asserts on wobble amplitude instead of speed multiplier).
- After simulating a throw (recalibration path), the partner's freshly
  rolled `chaseSpeed` still satisfies predator > prey.

## 10. Implementation notes

- `pairAcceleration` and its wobble-fade helper are removed and replaced by
  `predatorAcceleration` / `preyAcceleration` (§6). `pairApproachRamp` is
  kept and reused as-is for the predator's pounce ramp (§5); a new sibling
  function, `preyPanicRamp`, mirrors its proximity math but drives wobble
  amplitude instead of speed, for prey (§6). Two small single-purpose
  functions, consistent with this file's existing style of one function
  per named behavior, rather than one parameterized function branching on
  role.
- `idleAcceleration` (unpaired objects) is unaffected by this spec.
