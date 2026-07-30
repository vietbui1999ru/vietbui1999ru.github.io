# Ink Ambient Predator/Prey Chase Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Ink Ambient sim's mutual attract-and-collide pairing with a directional predator/prey chase — predator always faster, both follow a curved (zigzag) path, drag/throw recalibrates the partner's speed.

**Architecture:** `src/lib/ink-ambient/pairing.ts` gains role (`"predator" | "prey"`) and `chaseSpeed` fields on `InkObject`, assigned at pair formation and re-derived on drag/throw. Two new directional steering functions (`predatorAcceleration` / `preyAcceleration`) replace the single symmetric `pairAcceleration`. `src/components/svelte/InkAmbient.svelte` wires role-based acceleration selection and speed capping into the existing fixed-step update loop — no change to spawn/collision/render systems.

**Tech Stack:** TypeScript, Svelte 5, Vitest (jsdom environment, no DOM needed for these tests — pure function unit tests).

## Global Constraints

- Predator's `chaseSpeed` must always exceed its prey's `chaseSpeed` — guaranteed by construction (multiply/divide relationship), never by independent random rolls on both sides.
- New speed constants stay close to the sim's existing ~115–155 max-speed band (spec §2).
- No change to catch/collision behavior (`mutuallyPaired && circlesOverlap` destroy-both logic in `InkAmbient.svelte`'s `updateSimulation`).
- No change to `idleAcceleration` or unpaired-object behavior.
- Design source of truth: `docs/superpowers/specs/2026-07-28-ink-ambient-predator-prey-chase-design.md`.

---

### Task 1: Data model and config constants

**Files:**
- Modify: `src/lib/ink-ambient/types.ts`
- Modify: `src/lib/ink-ambient/config.ts`

**Interfaces:**
- Produces: `InkObject.role: "predator" | "prey" | null`, `InkObject.chaseSpeed: number` — consumed by every later task.
- Produces config constants `PREY_SPEED_MIN`, `PREY_SPEED_MAX`, `PREY_THROW_SPEED_MAX`, `PREDATOR_SPEED_MULTIPLIER_MIN`, `PREDATOR_SPEED_MULTIPLIER_MAX`, `PANIC_RAMP_MAX`, `PREDATOR_WOBBLE_FACTOR`, `PREY_WOBBLE_FACTOR`, `CHASE_VIGOR_JITTER` — consumed by Tasks 2–5.

- [ ] **Step 1: Add fields to `InkObject`**

In `src/lib/ink-ambient/types.ts`, add two fields to the `InkObject` type, right after `partnerId`/`formerPartnerId`:

```ts
  partnerId: number | null;
  formerPartnerId: number | null;
  role: "predator" | "prey" | null;
  chaseSpeed: number;
  attractionValue: number;
```

- [ ] **Step 2: Add config constants**

In `src/lib/ink-ambient/config.ts`, add after the existing `ATTRACTION_*` block (after `ATTRACTION_RAMP_START_MULTIPLIER`):

```ts
export const PREY_SPEED_MIN = 95;
export const PREY_SPEED_MAX = 130;
export const PREY_THROW_SPEED_MAX = 180;
export const PREDATOR_SPEED_MULTIPLIER_MIN = 1.15;
export const PREDATOR_SPEED_MULTIPLIER_MAX = 1.45;
export const PANIC_RAMP_MAX = 2.2;
export const PREDATOR_WOBBLE_FACTOR = 0.15;
export const PREY_WOBBLE_FACTOR = 0.4;
export const CHASE_VIGOR_JITTER = 0.15;
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit -p .` (plain `tsc`, already available — do not install `@astrojs/check` or any new dependency; this repo uses `pnpm` and `pnpm` may not be on PATH in a sandboxed environment, so any dependency install here risks creating a stray `package-lock.json` next to `pnpm-lock.yaml`. If verification requires a new dependency, stop and report NEEDS_CONTEXT instead of installing anything.)
Expected: exactly one error — `tests/lib/ink-ambient.test.ts`'s `object()` test helper is missing `role`/`chaseSpeed` on the `InkObject` literal. That's expected; Task 2 fixes it. Plain `tsc` does not typecheck `.svelte` files, so `makeObject` in `InkAmbient.svelte` (also missing the two fields at this point) will NOT show up here — that gap is fixed in Task 6 and verified there by the test suite and manual browser check instead, not by this command.

- [ ] **Step 4: Commit**

```bash
git add src/lib/ink-ambient/types.ts src/lib/ink-ambient/config.ts
git commit -m "feat(ink-ambient): add predator/prey role and chaseSpeed fields"
```

---

### Task 2: `formPair` assigns role and chaseSpeed

**Files:**
- Modify: `src/lib/ink-ambient/pairing.ts`
- Test: `tests/lib/ink-ambient.test.ts`

**Interfaces:**
- Consumes: `SeededRng` (from `./rng`, already exists — `range(min, max): number`, `chance(probability): boolean`), `clamp` (from `./physics`), `PREY_SPEED_MIN/MAX`, `PREDATOR_SPEED_MULTIPLIER_MIN/MAX`, `CHASE_VIGOR_JITTER`, `ATTRACTION_VALUE_MIN/MAX` (from `./config`, all from Task 1 / already existing).
- Produces: `formPair(a: InkObject, b: InkObject, rng: SeededRng): void` (signature change — now requires `rng`; sets `a.role`/`b.role` and `a.chaseSpeed`/`b.chaseSpeed` in addition to existing partner/motionBlend wiring). Also produces `formInitialPairs(objects: InkObject[], rng: SeededRng): void` and `reevaluatePartner(object: InkObject, objects: readonly InkObject[], rng: SeededRng): void` — signature changes only (both still call plain `formPair`; Step 6 below covers why this task, not Task 3, must make this change). Consumed by Task 3 (adds `recalibratePair` and swaps one `reevaluatePartner` call site to use it) and Task 6 (`InkAmbient.svelte`).

- [ ] **Step 1: Update the `object()` test helper**

In `tests/lib/ink-ambient.test.ts`, add the two new fields to the `object()` helper (around line 56-58, right after `formerPartnerId`):

```ts
    partnerId: null,
    formerPartnerId: null,
    role: null,
    chaseSpeed: 0,
    attractionValue: 1,
```

- [ ] **Step 2: Write the failing test**

Add to `tests/lib/ink-ambient.test.ts`, in the same `describe` block, near the existing `formInitialPairs`/`formPair`-adjacent tests:

```ts
  it("assigns one predator and one prey with predator always faster", () => {
    const rng = new SeededRng(7);
    for (let trial = 0; trial < 50; trial += 1) {
      const a = object(1, 0, 0);
      const b = object(2, 10, 0);
      formPair(a, b, rng);
      const roles = [a.role, b.role].sort();
      expect(roles).toEqual(["predator", "prey"]);
      const predator = a.role === "predator" ? a : b;
      const prey = a.role === "predator" ? b : a;
      expect(predator.chaseSpeed).toBeGreaterThan(prey.chaseSpeed);
      expect(prey.chaseSpeed).toBeGreaterThanOrEqual(PREY_SPEED_MIN);
      expect(prey.chaseSpeed).toBeLessThanOrEqual(PREY_SPEED_MAX);
    }
  });
```

Add `formPair`, `PREY_SPEED_MIN`, `PREY_SPEED_MAX` to the existing imports at the top of the test file (`formPair` joins the `@/lib/ink-ambient/pairing` import; `PREY_SPEED_MIN`/`PREY_SPEED_MAX` join the `@/lib/ink-ambient/config` import).

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run tests/lib/ink-ambient.test.ts -t "assigns one predator and one prey"`
Expected: FAIL — `formPair` doesn't accept an `rng` argument yet / doesn't set `role`/`chaseSpeed`, and `object.role` is `null` for both.

- [ ] **Step 4: Implement `formPair` role and speed assignment**

In `src/lib/ink-ambient/pairing.ts`, replace the existing `import { ... } from "./config"` statement (the one currently listing `ATTRACTION_BASE_ACCELERATION`, `ATTRACTION_RAMP_MAX`, `ATTRACTION_RAMP_START_MULTIPLIER`, `MOTION_BLEND_SECONDS`, `PAIR_FORCE_MAX`, `PAIR_FORCE_MIN`) with:

```ts
import {
  ATTRACTION_BASE_ACCELERATION,
  ATTRACTION_RAMP_MAX,
  ATTRACTION_RAMP_START_MULTIPLIER,
  ATTRACTION_VALUE_MAX,
  ATTRACTION_VALUE_MIN,
  CHASE_VIGOR_JITTER,
  MOTION_BLEND_SECONDS,
  PAIR_FORCE_MAX,
  PAIR_FORCE_MIN,
  PANIC_RAMP_MAX,
  PREDATOR_SPEED_MULTIPLIER_MAX,
  PREDATOR_SPEED_MULTIPLIER_MIN,
  PREDATOR_WOBBLE_FACTOR,
  PREY_SPEED_MAX,
  PREY_SPEED_MIN,
  PREY_THROW_SPEED_MAX,
  PREY_WOBBLE_FACTOR,
} from "./config";
import type { SeededRng } from "./rng";
```

`PAIR_FORCE_MAX`/`PAIR_FORCE_MIN` were already imported before this change (used by the now-removed `pairForceMultiplier`) and stay imported — they're picked up again by `driveMultiplier` in Task 5. `PANIC_RAMP_MAX`, `PREDATOR_WOBBLE_FACTOR`, `PREY_WOBBLE_FACTOR` aren't used until Tasks 4–5 but importing them all now avoids re-touching this block three more times.

Add these private helpers above `formPair` (after `findNearestAvailable`, before the now-removed `pairForceMultiplier` — see Step 5):

```ts
function vigorT(object: InkObject): number {
  return clamp(
    (object.attractionValue - ATTRACTION_VALUE_MIN) / (ATTRACTION_VALUE_MAX - ATTRACTION_VALUE_MIN),
    0,
    1,
  );
}

function rollPreySpeed(prey: InkObject, rng: SeededRng): number {
  const t = clamp(vigorT(prey) + rng.range(-CHASE_VIGOR_JITTER, CHASE_VIGOR_JITTER), 0, 1);
  return PREY_SPEED_MIN + (PREY_SPEED_MAX - PREY_SPEED_MIN) * t;
}

function rollPredatorMultiplier(predator: InkObject, rng: SeededRng): number {
  const t = clamp(vigorT(predator) + rng.range(-CHASE_VIGOR_JITTER, CHASE_VIGOR_JITTER), 0, 1);
  return PREDATOR_SPEED_MULTIPLIER_MIN + (PREDATOR_SPEED_MULTIPLIER_MAX - PREDATOR_SPEED_MULTIPLIER_MIN) * t;
}
```

Replace the existing `formPair` function with:

```ts
export function formPair(a: InkObject, b: InkObject, rng: SeededRng): void {
  a.partnerId = b.id;
  b.partnerId = a.id;
  a.formerPartnerId = null;
  b.formerPartnerId = null;
  a.motionBlend = { from: { ...a.lastAcceleration }, elapsed: 0, duration: MOTION_BLEND_SECONDS };
  b.motionBlend = { from: { ...b.lastAcceleration }, elapsed: 0, duration: MOTION_BLEND_SECONDS };

  const aIsPredator = rng.chance(0.5);
  a.role = aIsPredator ? "predator" : "prey";
  b.role = aIsPredator ? "prey" : "predator";
  const predator = aIsPredator ? a : b;
  const prey = aIsPredator ? b : a;
  prey.chaseSpeed = rollPreySpeed(prey, rng);
  predator.chaseSpeed = prey.chaseSpeed * rollPredatorMultiplier(predator, rng);
}
```

- [ ] **Step 5: Remove `pairForceMultiplier`'s test only — leave the function itself in place**

`pairForceMultiplier` is superseded (role-based `chaseSpeed` replaces the mutual force-product model), but do **not** delete the function yet: `pairAcceleration` (only removed in Task 5) still calls it at `pairing.ts:159`, so deleting `pairForceMultiplier` now leaves a dangling reference — `npx tsc --noEmit -p .` would fail with "Cannot find name 'pairForceMultiplier'" even though `vitest` won't catch it (esbuild strips types, doesn't check them). `pairForceMultiplier` gets deleted in Task 5, at the same time `pairAcceleration` (its only caller) is deleted.

Delete only the corresponding test in `tests/lib/ink-ambient.test.ts`: `"scales pair force by the product of both attraction values, clamped"` (remove `pairForceMultiplier`, `PAIR_FORCE_MAX`, `PAIR_FORCE_MIN` from that test file's imports if this was their only use — check: `PAIR_FORCE_MIN`/`PAIR_FORCE_MAX` are only imported for that one test, so remove both from the `@/lib/ink-ambient/config` import line). It's fine for `pairForceMultiplier` to be temporarily untested — it's dead code walking, gone within two tasks.

- [ ] **Step 5b: Typecheck**

Run: `npx tsc --noEmit -p .`
Expected: no new errors (this task doesn't touch `InkAmbient.svelte`, so the pre-existing/expected errors there don't apply — this task's own changes should typecheck clean on their own).

- [ ] **Step 6: Thread `rng` through `formPair`'s same-file callers**

`formInitialPairs` and `reevaluatePartner` (both in `pairing.ts`) call `formPair` internally and must pass it an `rng`, or the new `rng.chance(0.5)` inside `formPair` throws at runtime the moment either function runs — including in the three pre-existing tests that exercise them. This is a mechanical signature change only (no new behavior, no `recalibratePair` yet — that's Task 3): both functions keep calling plain `formPair`, just with `rng` threaded through.

Replace `formInitialPairs`:

```ts
export function formInitialPairs(objects: InkObject[], rng: SeededRng): void {
  const sorted = [...objects].sort((a, b) => a.id - b.id);
  for (const object of sorted) {
    if (object.partnerId !== null) continue;
    const partner = findNearestAvailable(object, objects);
    if (partner) formPair(object, partner, rng);
  }
}
```

Replace `reevaluatePartner`:

```ts
export function reevaluatePartner(
  object: InkObject,
  objects: readonly InkObject[],
  rng: SeededRng,
): void {
  const nearest = findNearestAvailable(object, objects);
  const oldPartnerId = object.formerPartnerId;
  if (nearest) formPair(object, nearest, rng);
  if (oldPartnerId !== null && oldPartnerId !== nearest?.id) {
    const oldPartner = objects.find((candidate) => candidate.id === oldPartnerId) ?? null;
    if (oldPartner && oldPartner.partnerId === null) {
      const oldPartnerNearest = findNearestAvailable(oldPartner, objects);
      if (oldPartnerNearest) formPair(oldPartner, oldPartnerNearest, rng);
    }
  }
  object.formerPartnerId = null;
}
```

In `tests/lib/ink-ambient.test.ts`, update the three pre-existing tests that call these functions to pass an `rng` instance:
- `"pairs the nearest available objects into mutual bonds"`: `formInitialPairs(objects)` → `formInitialPairs(objects, new SeededRng(1))`
- `"leaves a lone object unpaired without throwing"`: `formInitialPairs(objects)` → `formInitialPairs(objects, new SeededRng(1))`
- `"re-forms the same pair after a detach and release with only two objects"`: both `formInitialPairs(objects)` → `formInitialPairs(objects, new SeededRng(1))` and `reevaluatePartner(objects[0], objects)` → `reevaluatePartner(objects[0], objects, new SeededRng(1))`

Note: `InkAmbient.svelte`'s two call sites (`spawnFreshBatch`, `releasePointer`) still call these functions without `rng` after this task — that's expected and gets fixed in Task 6. Nothing typechecks or runs `.svelte` files before then, so this is a safe intermediate state, not a bug to fix now.

- [ ] **Step 7: Run test to verify it passes**

Run: `npx vitest run tests/lib/ink-ambient.test.ts`
Expected: PASS for all tests, including the new one and the full existing suite (minus the removed `pairForceMultiplier` test).

- [ ] **Step 8: Commit**

```bash
git add src/lib/ink-ambient/pairing.ts tests/lib/ink-ambient.test.ts
git commit -m "feat(ink-ambient): assign predator/prey role and chaseSpeed in formPair"
```

---

### Task 3: `recalibratePair` — drag/throw recalibration

**Files:**
- Modify: `src/lib/ink-ambient/pairing.ts`
- Test: `tests/lib/ink-ambient.test.ts`

**Interfaces:**
- Consumes: `formPair(a, b, rng)`, `formInitialPairs(objects, rng)`, `reevaluatePartner(object, objects, rng)` (all Task 2 — already threaded with `rng`; `reevaluatePartner` currently still calls plain `formPair` for the `object` side, which this task swaps to `recalibratePair`), `rollPredatorMultiplier` (private helper, Task 2), `length` (from `./physics`, already exists — `length(v: Vec2): number`), `PREY_THROW_SPEED_MAX` (Task 1).
- Produces: private `recalibratePair(thrown: InkObject, partner: InkObject, rng: SeededRng): void`, wired into `reevaluatePartner`. No further signature changes — `formInitialPairs`/`reevaluatePartner`'s public signatures are already correct from Task 2.

Note on the tests below: after Task 2, `reevaluatePartner`'s `object`-side pairing already goes through plain `formPair`, which independently rolls both sides' `chaseSpeed` and *already* guarantees predator > prey by construction (that's Task 2's whole point). So a test that only asserts the predator > prey invariant would pass even before this task's `recalibratePair` exists — it wouldn't be RED in Step 2. The first test below is written to assert the *exact* value `recalibratePair` derives from the throw velocity, which plain `formPair`'s independent vigor-weighted roll will not produce — that's what makes it a real RED before this task and GREEN after.

- [ ] **Step 1: Write the failing tests**

Add to `tests/lib/ink-ambient.test.ts`:

```ts
  it("pins the thrown object's chaseSpeed to its throw velocity instead of rolling fresh", () => {
    const objects = [object(1, 0, 0), object(2, 10, 0)];
    const rng = new SeededRng(5);
    formInitialPairs(objects, rng);
    const thrown = objects[0];
    const partner = objects[1];
    detachPair(thrown, objects);
    thrown.velocity = { x: 20, y: 0 }; // throwSpeed = 20, well below every floor/ceiling below
    reevaluatePartner(thrown, objects, rng);
    expect(thrown.partnerId).toBe(partner.id);
    if (thrown.role === "predator") {
      // floored at PREY_SPEED_MIN * PREDATOR_SPEED_MULTIPLIER_MIN = 95 * 1.15
      expect(thrown.chaseSpeed).toBeCloseTo(95 * 1.15, 5);
    } else {
      // clamped up to PREY_SPEED_MIN = 95 (20 is below the floor)
      expect(thrown.chaseSpeed).toBeCloseTo(95, 5);
    }
  });

  it("recalibration never lets a gently-thrown predator end up slower than its prey", () => {
    for (let seed = 0; seed < 30; seed += 1) {
      const objects = [object(1, 0, 0), object(2, 10, 0)];
      const rng = new SeededRng(seed * 101 + 1);
      formInitialPairs(objects, rng);
      const thrown = objects[0];
      const partner = objects[1];
      detachPair(thrown, objects);
      thrown.velocity = { x: 1, y: 0 }; // near-zero throw, worst case
      reevaluatePartner(thrown, objects, rng);
      const predator = thrown.role === "predator" ? thrown : partner;
      const prey = thrown.role === "predator" ? partner : thrown;
      expect(predator.chaseSpeed).toBeGreaterThan(prey.chaseSpeed);
    }
  });
```

- [ ] **Step 2: Run tests to verify the first one fails**

Run: `npx vitest run tests/lib/ink-ambient.test.ts -t "pins the thrown object"`
Expected: FAIL — against Task 2's plain `formPair`, `thrown.chaseSpeed` is an independent vigor-weighted roll, essentially never exactly `95 * 1.15` or `95`.

Run: `npx vitest run tests/lib/ink-ambient.test.ts -t "recalibration never lets"`
Expected: this one may already PASS — `formPair`'s independent rolls already guarantee the invariant by construction. That's fine and expected (see the note above the tests); it becomes a real regression test for `recalibratePair`'s specific derivation once Step 3 wires it in, not a wasted test.

- [ ] **Step 3: Implement**

Add a private `recalibratePair` helper in `src/lib/ink-ambient/pairing.ts` (above `reevaluatePartner`):

```ts
function recalibratePair(thrown: InkObject, partner: InkObject, rng: SeededRng): void {
  thrown.partnerId = partner.id;
  partner.partnerId = thrown.id;
  thrown.formerPartnerId = null;
  partner.formerPartnerId = null;
  thrown.motionBlend = { from: { ...thrown.lastAcceleration }, elapsed: 0, duration: MOTION_BLEND_SECONDS };
  partner.motionBlend = { from: { ...partner.lastAcceleration }, elapsed: 0, duration: MOTION_BLEND_SECONDS };

  const thrownIsPredator = rng.chance(0.5);
  const throwSpeed = length(thrown.velocity);

  if (thrownIsPredator) {
    thrown.role = "predator";
    partner.role = "prey";
    const multiplier = rollPredatorMultiplier(thrown, rng);
    thrown.chaseSpeed = Math.max(throwSpeed, PREY_SPEED_MIN * PREDATOR_SPEED_MULTIPLIER_MIN);
    partner.chaseSpeed = clamp(thrown.chaseSpeed / multiplier, PREY_SPEED_MIN, PREY_SPEED_MAX);
  } else {
    thrown.role = "prey";
    partner.role = "predator";
    thrown.chaseSpeed = clamp(throwSpeed, PREY_SPEED_MIN, PREY_THROW_SPEED_MAX);
    partner.chaseSpeed = thrown.chaseSpeed * rollPredatorMultiplier(partner, rng);
  }
}
```

In `reevaluatePartner`, change only the first `formPair` call to `recalibratePair` — everything else in the function is unchanged from Task 2:

```ts
  if (nearest) recalibratePair(object, nearest, rng);
```

(The `oldPartner` branch's `formPair(oldPartner, oldPartnerNearest, rng)` call stays as `formPair` — that side wasn't thrown, so it gets a fresh independent roll, same as initial pairing.)

Add `length` to the `./physics` import at the top of the file.

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit -p .`
Expected: no errors.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run tests/lib/ink-ambient.test.ts`
Expected: PASS for the full suite.

- [ ] **Step 6: Commit**

```bash
git add src/lib/ink-ambient/pairing.ts tests/lib/ink-ambient.test.ts
git commit -m "feat(ink-ambient): recalibrate partner chaseSpeed on drag/throw"
```

---

### Task 4: `preyPanicRamp`

**Files:**
- Modify: `src/lib/ink-ambient/pairing.ts`
- Test: `tests/lib/ink-ambient.test.ts`

**Interfaces:**
- Consumes: `pairDistance` (private helper already in `pairing.ts`), `PANIC_RAMP_MAX` (Task 1).
- Produces: `preyPanicRamp(object: InkObject, partner: InkObject): number` — consumed by Task 5 (`preyAcceleration`).

- [ ] **Step 1: Write the failing test**

Add to `tests/lib/ink-ambient.test.ts` (mirrors the existing `pairApproachRamp` test):

```ts
  it("ramps prey panic-wobble amplitude up as the predator closes in", () => {
    const anchor = object(1, 0, 0);
    const far = object(2, 1000, 0);
    const near = object(3, 90, 0);
    const touching = object(4, 45, 0);

    const farRamp = preyPanicRamp(anchor, far);
    const nearRamp = preyPanicRamp(anchor, near);
    const touchingRamp = preyPanicRamp(anchor, touching);

    expect(farRamp).toBe(1);
    expect(nearRamp).toBeGreaterThan(farRamp);
    expect(touchingRamp).toBeGreaterThan(nearRamp);
    expect(touchingRamp).toBeLessThanOrEqual(2.2);
  });
```

Add `preyPanicRamp` to the `@/lib/ink-ambient/pairing` import.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/ink-ambient.test.ts -t "panic-wobble"`
Expected: FAIL — `preyPanicRamp` is not exported yet.

- [ ] **Step 3: Implement**

In `src/lib/ink-ambient/pairing.ts`, add after `pairApproachRamp` (mirrors its body, distinct constant, per spec §10 — kept as two small functions rather than one parameterized function):

```ts
export function preyPanicRamp(object: InkObject, partner: InkObject): number {
  const closeDistance = (object.radius + partner.radius) * 2;
  const rampStart = (object.radius + partner.radius) * ATTRACTION_RAMP_START_MULTIPLIER;
  const currentDistance = pairDistance(object, partner);
  const proximity = clamp(
    1 - (currentDistance - closeDistance) / (rampStart - closeDistance),
    0,
    1,
  );
  return 1 + proximity * proximity * (PANIC_RAMP_MAX - 1);
}
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit -p .`
Expected: no errors.

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/lib/ink-ambient.test.ts`
Expected: PASS for the full suite.

- [ ] **Step 6: Commit**

```bash
git add src/lib/ink-ambient/pairing.ts tests/lib/ink-ambient.test.ts
git commit -m "feat(ink-ambient): add preyPanicRamp for proximity-scaled panic wobble"
```

---

### Task 5: `predatorAcceleration` and `preyAcceleration`

**Files:**
- Modify: `src/lib/ink-ambient/pairing.ts`
- Test: `tests/lib/ink-ambient.test.ts`

**Interfaces:**
- Consumes: `pairApproachRamp` (existing), `preyPanicRamp` (Task 4), `ATTRACTION_BASE_ACCELERATION`, `PAIR_FORCE_MIN/MAX`, `PREDATOR_WOBBLE_FACTOR`, `PREY_WOBBLE_FACTOR` (Task 1/existing), `normalize`, `subtract`, `clamp` (from `./physics`, already imported).
- Produces: `predatorAcceleration(object: InkObject, prey: InkObject, maxAcceleration: number, now: number): Vec2`, `preyAcceleration(object: InkObject, predator: InkObject, maxAcceleration: number, now: number): Vec2`. Consumed by Task 6 (`InkAmbient.svelte`).

- [ ] **Step 1: Write the failing tests**

Add to `tests/lib/ink-ambient.test.ts`:

```ts
  it("steers the predator toward the prey", () => {
    const predator = object(1, 0, 0);
    predator.role = "predator";
    predator.chaseSpeed = 150;
    const prey = object(2, 100, 0);
    prey.role = "prey";
    prey.chaseSpeed = 110;
    const accel = predatorAcceleration(predator, prey, 400, 0);
    expect(accel.x).toBeGreaterThan(0);
  });

  it("steers the prey away from the predator", () => {
    const predator = object(1, 0, 0);
    predator.role = "predator";
    predator.chaseSpeed = 150;
    const prey = object(2, 100, 0);
    prey.role = "prey";
    prey.chaseSpeed = 110;
    // prey sits to the right of the predator, so fleeing means accelerating further right (+x)
    const accel = preyAcceleration(prey, predator, 400, 0);
    expect(accel.x).toBeGreaterThan(0);
  });
```

Add `predatorAcceleration`, `preyAcceleration` to the `@/lib/ink-ambient/pairing` import.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/lib/ink-ambient.test.ts -t "steers the"`
Expected: FAIL — neither function is exported yet.

- [ ] **Step 3: Implement**

In `src/lib/ink-ambient/pairing.ts`, remove the existing `pairAcceleration` function **and** the `pairForceMultiplier` function (Task 2 deliberately left `pairForceMultiplier` in place because `pairAcceleration` was still calling it — now that `pairAcceleration` is going too, delete both together). Replace with:

```ts
function driveMultiplier(object: InkObject): number {
  return clamp(object.attractionValue, PAIR_FORCE_MIN, PAIR_FORCE_MAX);
}

function lateralWobbleScalar(object: InkObject, magnitude: number, wobbleFactor: number, now: number): number {
  const t = now / 1000 + object.wobblePhase;
  return Math.sin(t * object.wobbleFrequency * 1.7) * magnitude * wobbleFactor;
}

export function predatorAcceleration(
  object: InkObject,
  prey: InkObject,
  maxAcceleration: number,
  now: number,
): Vec2 {
  const direction = normalize(subtract(prey.position, object.position));
  const ramp = pairApproachRamp(object, prey);
  const magnitude = clamp(ATTRACTION_BASE_ACCELERATION * driveMultiplier(object) * ramp, 0, maxAcceleration);
  const perpendicular = { x: -direction.y, y: direction.x };
  const wobble = lateralWobbleScalar(object, magnitude, PREDATOR_WOBBLE_FACTOR, now);
  return {
    x: direction.x * magnitude + perpendicular.x * wobble,
    y: direction.y * magnitude + perpendicular.y * wobble,
  };
}

export function preyAcceleration(
  object: InkObject,
  predator: InkObject,
  maxAcceleration: number,
  now: number,
): Vec2 {
  const direction = normalize(subtract(object.position, predator.position));
  const magnitude = clamp(ATTRACTION_BASE_ACCELERATION * driveMultiplier(object), 0, maxAcceleration);
  const perpendicular = { x: -direction.y, y: direction.x };
  const panicRamp = preyPanicRamp(object, predator);
  const wobble = lateralWobbleScalar(object, magnitude, PREY_WOBBLE_FACTOR * panicRamp, now);
  return {
    x: direction.x * magnitude + perpendicular.x * wobble,
    y: direction.y * magnitude + perpendicular.y * wobble,
  };
}
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit -p .`
Expected: no errors — this is the step that verifies `pairForceMultiplier` and `pairAcceleration` were both fully removed with no leftover references.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run tests/lib/ink-ambient.test.ts`
Expected: PASS for the full suite.

- [ ] **Step 6: Commit**

```bash
git add src/lib/ink-ambient/pairing.ts tests/lib/ink-ambient.test.ts
git commit -m "feat(ink-ambient): add directional predator/prey chase acceleration"
```

---

### Task 6: Wire chase behavior into `InkAmbient.svelte`

**Files:**
- Modify: `src/components/svelte/InkAmbient.svelte`

**Interfaces:**
- Consumes: `formInitialPairs(objects, rng)`, `reevaluatePartner(object, objects, rng)` (Task 3), `predatorAcceleration`, `preyAcceleration` (Task 5), `pairApproachRamp` (existing).
- Produces: nothing new consumed by later tasks — this is the integration point.

- [ ] **Step 1: Update the import list**

In `src/components/svelte/InkAmbient.svelte`, replace the `pairing` import block:

```ts
import {
  detachPair,
  formInitialPairs,
  idleAcceleration,
  pairApproachRamp,
  predatorAcceleration,
  preyAcceleration,
  reevaluatePartner,
} from "@/lib/ink-ambient/pairing";
```

- [ ] **Step 2: Initialize the new fields in `makeObject`**

Add `role: null` and `chaseSpeed: 0` to the object literal in `makeObject` (around line 133-137, right after `partnerId`/`formerPartnerId`):

```ts
    partnerId: null,
    formerPartnerId: null,
    role: null,
    chaseSpeed: 0,
    attractionValue: rng.range(ATTRACTION_VALUE_MIN, ATTRACTION_VALUE_MAX),
```

- [ ] **Step 3: Pass `rng` at the two call sites**

In `spawnFreshBatch`, change:
```ts
    formInitialPairs(objects);
```
to:
```ts
    formInitialPairs(objects, rng);
```

In `releasePointer`, change:
```ts
        reevaluatePartner(object, objects);
```
to:
```ts
        reevaluatePartner(object, objects, rng);
```

- [ ] **Step 4: Swap the acceleration and max-speed logic in `updateObject`**

Replace this block (currently around lines 359-362):

```ts
    let acceleration =
      partner && !settling
        ? pairAcceleration(object, partner, maxAccel, now)
        : idleAcceleration(object, activeAnchor, isUnsafe, now);
```

with:

```ts
    let acceleration =
      partner && !settling
        ? object.role === "predator"
          ? predatorAcceleration(object, partner, maxAccel, now)
          : preyAcceleration(object, partner, maxAccel, now)
        : idleAcceleration(object, activeAnchor, isUnsafe, now);
```

Replace this block (currently around lines 392-393):

```ts
    const approachRamp = partner && !settling ? pairApproachRamp(object, partner) : 1;
    const maxSpeed = (155 - (155 - 115) * massT) * approachRamp;
```

with:

```ts
    const maxSpeed =
      partner && !settling
        ? object.role === "predator"
          ? object.chaseSpeed * pairApproachRamp(object, partner)
          : object.chaseSpeed
        : 155 - (155 - 115) * massT;
```

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit -p .` (do not install any new dependency — see Task 1 Step 3's note; if this repo's tooling genuinely requires one to verify this step, stop and report NEEDS_CONTEXT instead)
Expected: no errors. Note this command does not typecheck `.svelte` files, so it cannot verify `InkAmbient.svelte`'s own correctness — Step 6 (test suite) and Task 7 (manual browser check) are the real verification for this file.

- [ ] **Step 6: Run the full test suite**

Run: `npm test`
Expected: PASS — all `tests/lib/ink-ambient.test.ts` cases green, no regressions elsewhere.

- [ ] **Step 7: Commit**

```bash
git add src/components/svelte/InkAmbient.svelte
git commit -m "feat(ink-ambient): wire predator/prey chase into the update loop"
```

---

### Task 7: Manual verification in browser

**Files:** none (verification only)

**Interfaces:** none

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`

- [ ] **Step 2: Visually confirm the chase**

Open the site in a browser (desktop viewport, so `pointer.fine` is true and up to 4 objects spawn — 2 pairs). Confirm:
- Each pair reads as one object actively chasing another (not both drifting toward a shared midpoint like before).
- The chasing object visibly moves faster than the one being chased.
- Both objects follow a curved/weaving path, not a straight line — the chaser's weave should look deliberate and mild, the fled-from object's weave should look larger and more erratic.
- On contact, the pair still pops (destroy + burst effect) exactly as before.

- [ ] **Step 3: Verify drag/throw recalibration**

Click-drag one of the paired objects away from its partner, then release with a flick (throw). Confirm:
- The thrown object keeps moving at roughly its throw speed.
- Its partner's speed visibly adjusts so the predator (whichever one that turns out to be) is still clearly faster than the prey — no case where the fleeing object outruns its chaser.

- [ ] **Step 4: Stop the dev server**

Ctrl+C in the terminal running `npm run dev`.

(No commit — this task produces no file changes.)
