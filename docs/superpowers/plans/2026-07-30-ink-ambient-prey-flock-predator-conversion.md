# Prey Flock Predator Conversion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a scarcity-driven role-reversal mechanic: hunted prey flocks (3+, boids steering) turn on their hunter and convert it to prey if caught within the flock's own cohesion radius.

**Architecture:** A new pure, unit-tested module `src/lib/ink-ambient/flocking.ts` holds clustering, target-selection, and boids steering math — following the same pattern as `targeting.ts`/`catches.ts`. Wired into `InkAmbient.svelte`'s `updateSimulation`/`updateObject` and `renderer.ts`'s draw loop in one final cutover task, since that Svelte-component wiring isn't independently reviewable in smaller pieces (same reasoning as the base ecosystem redesign's Task 5).

**Tech Stack:** TypeScript, Svelte 5 (runes), Vitest, existing `src/lib/ink-ambient/*` fixed-step simulation.

## Global Constraints

- Full spec: `docs/superpowers/specs/2026-07-30-ink-ambient-prey-flock-predator-conversion-design.md` — read for complete rationale on every decision below.
- Every new/changed `.ts` file must pass `npx astro check` with zero new errors.
- Every task that touches `.ts` logic must pass `npx vitest run` with zero failures before commit.
- Any Svelte file touched (`InkAmbient.svelte`, `PaperNav.svelte` if applicable) MUST be run through the Svelte MCP `svelte-autofixer` (or CLI `npx -y @sveltejs/mcp svelte-autofixer <path>`) before being considered done, repeated until clean.
- The mechanic is reactive, not ambient: a qualifying flock (3+) only reverses behavior if a predator is *currently* targeting one of its members (spec §5.2) — never just because 3+ prey happen to be near each other.
- `FLOCK_HUNT_BRIGHT_RED_COLOR` is the only genuinely new color constant needed — the "pastel red" half of the blink reuses the existing `PREDATOR_SPAWN_TINT_COLOR` (`#f2a6a6`), and the targeted-predator's steady green reuses the existing `PREY_SPAWN_TINT_COLOR` (`#a8d8b0`). Both already exist in `config.ts` from the spawn-tint feature — do not redeclare them under new names.
- No new visual effect type for the conversion moment — it reuses the existing burst `InkEffect`/`addBurstEffect` exactly as normal catches do.

---

### Task 1: Flock detection and target selection

**Files:**
- Modify: `src/lib/ink-ambient/types.ts` (add `huntingFlock: boolean`, `beingHunted: boolean` fields)
- Modify: `src/lib/ink-ambient/config.ts` (append `FLOCK_RADIUS`, `FLOCK_MIN_SIZE`)
- Create: `src/lib/ink-ambient/flocking.ts`
- Test: `tests/lib/ink-ambient.test.ts` (append; also add `huntingFlock: false, beingHunted: false,` to the shared `object()` helper)

**Interfaces:**
- Consumes: `InkObject`, `distance` from `./physics`.
- Produces: `detectFlocks(objects): InkObject[][]`, `selectFlockTarget(members, objects): InkObject | null`, `computeFlockAssignments(objects): FlockAssignment` where `FlockAssignment = { huntingFlockIds: Set<number>; beingHuntedIds: Set<number>; targetByMemberId: Map<number, InkObject>; flockByMemberId: Map<number, InkObject[]>; flockByTargetPredatorId: Map<number, InkObject[]> }`. Task 3 imports `computeFlockAssignments` and reads all five `FlockAssignment` fields.

- [ ] **Step 1: Extend `InkObject` in `types.ts`**

Add two fields (after the existing `motionBlend: MotionBlend | null;` line):

```ts
  huntingFlock: boolean;
  beingHunted: boolean;
```

- [ ] **Step 2: Update the shared test helper**

In `tests/lib/ink-ambient.test.ts`, add to the `object()` helper's returned literal (alongside the existing `motionBlend: null,` line):

```ts
    huntingFlock: false,
    beingHunted: false,
```

- [ ] **Step 3: Append config constants**

Add to the end of `src/lib/ink-ambient/config.ts`:

```ts
// Prey flock predator conversion (spec 2026-07-30). FLOCK_RADIUS doubles as
// both the flock-cohesion sensing radius and the kill-trigger radius — the
// same value, per the design's explicit constraint (not a separate tighter
// kill threshold like the normal catch mechanic uses).
export const FLOCK_RADIUS = 90;
export const FLOCK_MIN_SIZE = 3;
```

- [ ] **Step 4: Write the failing test**

Add import at the top of `tests/lib/ink-ambient.test.ts`:

```ts
import { detectFlocks, selectFlockTarget, computeFlockAssignments } from "@/lib/ink-ambient/flocking";
```

New `describe` block, appended at the end of the file:

```ts
describe("Flock detection and target selection", () => {
  it("finds connected components of 3+ prey within FLOCK_RADIUS, excluding smaller groups", () => {
    const a = object(1, 0, 0);
    a.role = "prey";
    const b = object(2, 40, 0); // within 90 of a
    b.role = "prey";
    const c = object(3, 80, 0); // within 90 of b, chains the component to 3
    c.role = "prey";
    const lone = object(4, 1000, 1000); // isolated, alone
    lone.role = "prey";
    const pair = object(5, 2000, 0);
    pair.role = "prey";
    const pairMate = object(6, 2040, 0); // pair of 2, under FLOCK_MIN_SIZE
    pairMate.role = "prey";

    const flocks = detectFlocks([a, b, c, lone, pair, pairMate]);
    expect(flocks).toHaveLength(1);
    expect(flocks[0].map((m) => m.id).sort()).toEqual([1, 2, 3]);
  });

  it("excludes grabbed and mid-vanish prey from flocking", () => {
    const a = object(1, 0, 0);
    a.role = "prey";
    const b = object(2, 40, 0);
    b.role = "prey";
    b.grabbed = true;
    const c = object(3, 80, 0);
    c.role = "prey";
    c.vanishElapsed = 0.1;
    const d = object(4, 20, 0);
    d.role = "prey";

    // Only a and d remain eligible — 2 members, under FLOCK_MIN_SIZE.
    const flocks = detectFlocks([a, b, c, d]);
    expect(flocks).toHaveLength(0);
  });

  it("selects the predator targeting a flock member, closest to the flock's centroid", () => {
    const m1 = object(1, 0, 0);
    m1.role = "prey";
    const m2 = object(2, 40, 0);
    m2.role = "prey";
    const m3 = object(3, 80, 0);
    m3.role = "prey";
    const members = [m1, m2, m3];

    const targetingM1 = object(4, 100, 100);
    targetingM1.role = "predator";
    targetingM1.currentTargetId = 1; // targets m1
    const notTargetingFlock = object(5, 5, 5);
    notTargetingFlock.role = "predator";
    notTargetingFlock.currentTargetId = 999; // targets something outside the flock

    expect(selectFlockTarget(members, [...members, targetingM1, notTargetingFlock])?.id).toBe(4);
  });

  it("returns null when no predator targets any flock member", () => {
    const m1 = object(1, 0, 0);
    m1.role = "prey";
    const m2 = object(2, 40, 0);
    m2.role = "prey";
    const m3 = object(3, 80, 0);
    m3.role = "prey";
    const members = [m1, m2, m3];
    const uninvolvedPredator = object(4, 500, 500);
    uninvolvedPredator.role = "predator";
    uninvolvedPredator.currentTargetId = null;

    expect(selectFlockTarget(members, [...members, uninvolvedPredator])).toBeNull();
  });

  it("tie-breaks by centroid distance then lowest id when multiple predators target different members", () => {
    const m1 = object(1, 0, 0);
    m1.role = "prey";
    const m2 = object(2, 40, 0);
    m2.role = "prey";
    const m3 = object(3, 80, 0);
    m3.role = "prey";
    const members = [m1, m2, m3]; // centroid at (40, 0)

    const closer = object(4, 45, 0); // distance 5 from centroid
    closer.role = "predator";
    closer.currentTargetId = 1;
    const farther = object(5, 500, 0); // distance 460 from centroid
    farther.role = "predator";
    farther.currentTargetId = 2;

    expect(selectFlockTarget(members, [...members, closer, farther])?.id).toBe(4);
  });

  it("computeFlockAssignments produces consistent hunting/beingHunted sets and lookup maps", () => {
    const m1 = object(1, 0, 0);
    m1.role = "prey";
    const m2 = object(2, 40, 0);
    m2.role = "prey";
    const m3 = object(3, 80, 0);
    m3.role = "prey";
    const predator = object(4, 100, 100);
    predator.role = "predator";
    predator.currentTargetId = 1;
    const objects = [m1, m2, m3, predator];

    const assignment = computeFlockAssignments(objects);
    expect(assignment.huntingFlockIds).toEqual(new Set([1, 2, 3]));
    expect(assignment.beingHuntedIds).toEqual(new Set([4]));
    expect(assignment.targetByMemberId.get(1)?.id).toBe(4);
    expect(assignment.flockByMemberId.get(1)?.map((m) => m.id).sort()).toEqual([1, 2, 3]);
    expect(assignment.flockByTargetPredatorId.get(4)?.map((m) => m.id).sort()).toEqual([1, 2, 3]);
  });
});
```

- [ ] **Step 5: Run test to verify it fails**

Run: `npx vitest run tests/lib/ink-ambient.test.ts`
Expected: FAIL — `Cannot find module '@/lib/ink-ambient/flocking'`.

- [ ] **Step 6: Implement `flocking.ts`**

```ts
import { FLOCK_MIN_SIZE, FLOCK_RADIUS } from "./config";
import { distance } from "./physics";
import type { InkObject, Vec2 } from "./types";

function isAlive(object: InkObject): boolean {
  return object.vanishElapsed === null;
}

export function detectFlocks(objects: readonly InkObject[]): InkObject[][] {
  const prey = objects.filter((o) => o.role === "prey" && isAlive(o) && !o.grabbed);
  const visited = new Set<number>();
  const flocks: InkObject[][] = [];

  for (const start of prey) {
    if (visited.has(start.id)) continue;
    const component: InkObject[] = [];
    const stack = [start];
    visited.add(start.id);
    while (stack.length > 0) {
      const current = stack.pop()!;
      component.push(current);
      for (const candidate of prey) {
        if (visited.has(candidate.id)) continue;
        if (distance(current.position, candidate.position) < FLOCK_RADIUS) {
          visited.add(candidate.id);
          stack.push(candidate);
        }
      }
    }
    if (component.length >= FLOCK_MIN_SIZE) flocks.push(component);
  }

  return flocks;
}

function centroid(members: readonly InkObject[]): Vec2 {
  const sum = members.reduce(
    (acc, member) => ({ x: acc.x + member.position.x, y: acc.y + member.position.y }),
    { x: 0, y: 0 },
  );
  return { x: sum.x / members.length, y: sum.y / members.length };
}

export function selectFlockTarget(
  members: readonly InkObject[],
  objects: readonly InkObject[],
): InkObject | null {
  const memberIds = new Set(members.map((member) => member.id));
  const candidates = objects.filter(
    (object) =>
      object.role === "predator" &&
      isAlive(object) &&
      object.currentTargetId !== null &&
      memberIds.has(object.currentTargetId),
  );
  if (candidates.length === 0) return null;

  const center = centroid(members);
  let best: InkObject | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const candidate of candidates) {
    const d = distance(center, candidate.position);
    if (best === null || d < bestDistance || (d === bestDistance && candidate.id < best.id)) {
      best = candidate;
      bestDistance = d;
    }
  }
  return best;
}

export interface FlockAssignment {
  huntingFlockIds: Set<number>;
  beingHuntedIds: Set<number>;
  targetByMemberId: Map<number, InkObject>;
  flockByMemberId: Map<number, InkObject[]>;
  flockByTargetPredatorId: Map<number, InkObject[]>;
}

export function computeFlockAssignments(objects: readonly InkObject[]): FlockAssignment {
  const huntingFlockIds = new Set<number>();
  const beingHuntedIds = new Set<number>();
  const targetByMemberId = new Map<number, InkObject>();
  const flockByMemberId = new Map<number, InkObject[]>();
  const flockByTargetPredatorId = new Map<number, InkObject[]>();

  for (const members of detectFlocks(objects)) {
    const target = selectFlockTarget(members, objects);
    if (!target) continue;
    beingHuntedIds.add(target.id);
    flockByTargetPredatorId.set(target.id, members);
    for (const member of members) {
      huntingFlockIds.add(member.id);
      targetByMemberId.set(member.id, target);
      flockByMemberId.set(member.id, members);
    }
  }

  return { huntingFlockIds, beingHuntedIds, targetByMemberId, flockByMemberId, flockByTargetPredatorId };
}
```

- [ ] **Step 7: Run test to verify it passes**

Run: `npx vitest run tests/lib/ink-ambient.test.ts`
Expected: PASS.

- [ ] **Step 8: Typecheck**

Run: `npx astro check`
Expected: no new errors.

- [ ] **Step 9: Commit**

```bash
git add src/lib/ink-ambient/types.ts src/lib/ink-ambient/config.ts src/lib/ink-ambient/flocking.ts tests/lib/ink-ambient.test.ts
git commit -m "feat(ink-ambient): add flock detection and hunt-target selection"
```

---

### Task 2: Boids steering and kill-trigger check

**Files:**
- Modify: `src/lib/ink-ambient/config.ts` (append weight constants + `FLOCK_SEPARATION_DISTANCE` + `FLOCK_HUNT_BRIGHT_RED_COLOR` + `FLOCK_BLINK_FREQUENCY`)
- Modify: `src/lib/ink-ambient/flocking.ts` (append boids functions + kill-trigger check)
- Test: `tests/lib/ink-ambient.test.ts` (append)

**Interfaces:**
- Consumes: `clamp, distance, normalize, subtract` from `./physics`; `ATTRACTION_BASE_ACCELERATION, PAIR_FORCE_MIN, PAIR_FORCE_MAX` from `./config` (all already exist).
- Produces: `cohesionDirection(object, flockMembers): Vec2`, `separationDirection(object, flockMembers): Vec2`, `alignmentDirection(object, flockMembers): Vec2`, `flockHuntAcceleration(object, targetPredator, flockMembers, maxAcceleration): Vec2`, `isFlockKillTriggered(predator, flockMembers): boolean`. Task 3 imports `flockHuntAcceleration` and `isFlockKillTriggered` from `./flocking`.

- [ ] **Step 1: Append config constants**

Add to the end of `src/lib/ink-ambient/config.ts`:

```ts
// Boids weights for flock-hunt steering (spec §6) — hunt dominant, boids
// rules add clustering texture. Starting values, tune live in the browser.
export const FLOCK_SEPARATION_DISTANCE = 30;
export const FLOCK_HUNT_WEIGHT = 1.0;
export const FLOCK_COHESION_WEIGHT = 0.4;
export const FLOCK_SEPARATION_WEIGHT = 0.6;
export const FLOCK_ALIGNMENT_WEIGHT = 0.3;
// The "pastel red" half of the blink reuses PREDATOR_SPAWN_TINT_COLOR; the
// targeted predator's steady tint reuses PREY_SPAWN_TINT_COLOR (both
// already defined above) — only the bright-red half is new.
export const FLOCK_HUNT_BRIGHT_RED_COLOR = "#ff3b3b";
export const FLOCK_BLINK_FREQUENCY = 4;
```

- [ ] **Step 2: Write the failing test**

Add import at the top of `tests/lib/ink-ambient.test.ts`:

```ts
import { cohesionDirection, separationDirection, alignmentDirection, flockHuntAcceleration, isFlockKillTriggered } from "@/lib/ink-ambient/flocking";
```

(Merge into the existing `@/lib/ink-ambient/flocking` import from Task 1 rather than a second import line.)

New `describe` block, appended after the "Flock detection and target selection" block from Task 1:

```ts
describe("Boids steering and kill-trigger", () => {
  it("cohesion pulls toward the centroid of nearby flock members, zero with none nearby", () => {
    const self = object(1, 0, 0);
    const near = object(2, 40, 0);
    const far = object(3, 5000, 0);
    expect(cohesionDirection(self, [self, near, far])).toEqual({ x: 1, y: 0 });
    expect(cohesionDirection(self, [self])).toEqual({ x: 0, y: 0 });
  });

  it("separation pushes away from members closer than FLOCK_SEPARATION_DISTANCE", () => {
    const self = object(1, 0, 0);
    const tooClose = object(2, 10, 0); // within 30
    const notTooClose = object(3, 50, 0); // outside 30, inside FLOCK_RADIUS
    const result = separationDirection(self, [self, tooClose, notTooClose]);
    expect(result.x).toBeLessThan(0); // pushed away from tooClose, which is at +x
    expect(separationDirection(self, [self])).toEqual({ x: 0, y: 0 });
  });

  it("alignment steers toward the average velocity of nearby members", () => {
    const self = object(1, 0, 0);
    const neighbor = object(2, 40, 0);
    neighbor.velocity = { x: 0, y: 50 };
    const result = alignmentDirection(self, [self, neighbor]);
    expect(result).toEqual({ x: 0, y: 1 });
  });

  it("flockHuntAcceleration combines all four terms and respects the acceleration cap", () => {
    const self = object(1, 0, 0);
    self.attractionValue = 1.5;
    const target = object(2, 1000, 0);
    target.role = "predator";
    const neighbor = object(3, 40, 0);
    const accel = flockHuntAcceleration(self, target, [self, neighbor], 50);
    expect(Math.hypot(accel.x, accel.y)).toBeLessThanOrEqual(50 + 1e-6);
    expect(accel.x).toBeGreaterThan(0); // net direction toward target at +x
  });

  it("isFlockKillTriggered fires only when the predator is within FLOCK_RADIUS of a current flock member", () => {
    const predator = object(1, 0, 0);
    const closeMember = object(2, 50, 0); // within 90
    const farMember = object(3, 5000, 0);
    expect(isFlockKillTriggered(predator, [farMember])).toBe(false);
    expect(isFlockKillTriggered(predator, [closeMember])).toBe(true);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run tests/lib/ink-ambient.test.ts`
Expected: FAIL — missing exports from `@/lib/ink-ambient/flocking`.

- [ ] **Step 4: Append boids functions and kill-trigger check to `flocking.ts`**

Update the top-of-file imports to:

```ts
import {
  ATTRACTION_BASE_ACCELERATION,
  FLOCK_ALIGNMENT_WEIGHT,
  FLOCK_COHESION_WEIGHT,
  FLOCK_HUNT_WEIGHT,
  FLOCK_MIN_SIZE,
  FLOCK_RADIUS,
  FLOCK_SEPARATION_DISTANCE,
  FLOCK_SEPARATION_WEIGHT,
  PAIR_FORCE_MAX,
  PAIR_FORCE_MIN,
} from "./config";
import { clamp, distance, normalize, subtract } from "./physics";
import type { InkObject, Vec2 } from "./types";
```

Append to the end of the file:

```ts
function localNeighbors(
  object: InkObject,
  flockMembers: readonly InkObject[],
  radius: number,
): InkObject[] {
  return flockMembers.filter(
    (member) => member.id !== object.id && distance(object.position, member.position) < radius,
  );
}

export function cohesionDirection(object: InkObject, flockMembers: readonly InkObject[]): Vec2 {
  const neighbors = localNeighbors(object, flockMembers, FLOCK_RADIUS);
  if (neighbors.length === 0) return { x: 0, y: 0 };
  return normalize(subtract(centroid(neighbors), object.position));
}

export function separationDirection(object: InkObject, flockMembers: readonly InkObject[]): Vec2 {
  const tooClose = localNeighbors(object, flockMembers, FLOCK_SEPARATION_DISTANCE);
  if (tooClose.length === 0) return { x: 0, y: 0 };
  let x = 0;
  let y = 0;
  for (const neighbor of tooClose) {
    const away = normalize(subtract(object.position, neighbor.position));
    x += away.x;
    y += away.y;
  }
  return normalize({ x, y });
}

export function alignmentDirection(object: InkObject, flockMembers: readonly InkObject[]): Vec2 {
  const neighbors = localNeighbors(object, flockMembers, FLOCK_RADIUS);
  if (neighbors.length === 0) return { x: 0, y: 0 };
  const sum = neighbors.reduce(
    (acc, neighbor) => ({ x: acc.x + neighbor.velocity.x, y: acc.y + neighbor.velocity.y }),
    { x: 0, y: 0 },
  );
  return normalize(sum);
}

export function flockHuntAcceleration(
  object: InkObject,
  targetPredator: InkObject,
  flockMembers: readonly InkObject[],
  maxAcceleration: number,
): Vec2 {
  const hunt = normalize(subtract(targetPredator.position, object.position));
  const cohesion = cohesionDirection(object, flockMembers);
  const separation = separationDirection(object, flockMembers);
  const alignment = alignmentDirection(object, flockMembers);

  const combined: Vec2 = {
    x:
      FLOCK_HUNT_WEIGHT * hunt.x +
      FLOCK_COHESION_WEIGHT * cohesion.x +
      FLOCK_SEPARATION_WEIGHT * separation.x +
      FLOCK_ALIGNMENT_WEIGHT * alignment.x,
    y:
      FLOCK_HUNT_WEIGHT * hunt.y +
      FLOCK_COHESION_WEIGHT * cohesion.y +
      FLOCK_SEPARATION_WEIGHT * separation.y +
      FLOCK_ALIGNMENT_WEIGHT * alignment.y,
  };
  const direction = normalize(combined);
  const driveMultiplier = clamp(object.attractionValue, PAIR_FORCE_MIN, PAIR_FORCE_MAX);
  const magnitude = clamp(ATTRACTION_BASE_ACCELERATION * driveMultiplier, 0, maxAcceleration);
  return { x: direction.x * magnitude, y: direction.y * magnitude };
}

export function isFlockKillTriggered(predator: InkObject, flockMembers: readonly InkObject[]): boolean {
  return flockMembers.some((member) => distance(predator.position, member.position) < FLOCK_RADIUS);
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/lib/ink-ambient.test.ts`
Expected: PASS.

- [ ] **Step 6: Typecheck**

Run: `npx astro check`
Expected: no new errors.

- [ ] **Step 7: Commit**

```bash
git add src/lib/ink-ambient/config.ts src/lib/ink-ambient/flocking.ts tests/lib/ink-ambient.test.ts
git commit -m "feat(ink-ambient): add boids flock-hunt steering and kill-trigger check"
```

---

### Task 3: The cutover — wire flocking into `InkAmbient.svelte` and `renderer.ts`

This is the atomic wiring task — `InkAmbient.svelte`'s simulation loop and `renderer.ts`'s draw loop are not independently reviewable in smaller pieces, same reasoning as the base ecosystem redesign's Task 5.

**Files:**
- Modify: `src/components/svelte/InkAmbient.svelte`
- Modify: `src/lib/ink-ambient/renderer.ts`

**Interfaces:**
- Consumes: `computeFlockAssignments`, `flockHuntAcceleration`, `isFlockKillTriggered` from `./flocking` (Tasks 1-2); `rollRadius`, `rollChaseSpeed` from `./spawn` (already imported); `FLOCK_HUNT_BRIGHT_RED_COLOR`, `FLOCK_BLINK_FREQUENCY`, `PREDATOR_SPAWN_TINT_COLOR`, `PREY_SPAWN_TINT_COLOR` from `./config`.
- Produces: a working prey-flock-predator-conversion mechanic with no automated test coverage of the wiring itself (consistent with how the rest of this ecosystem's Svelte-component wiring has been handled — verified manually in Task 4).

- [ ] **Step 1: Add the module-level unlock flag and flock-assignment state**

In `src/components/svelte/InkAmbient.svelte`'s `onMount` closure, alongside the existing `let population: PopulationState = { prey: 1.5, predator: 0.7 };` line, add:

```ts
  let preyButtonEverPressed = false;
  let flockTargetByMemberId = new Map<number, InkObject>();
  let flockByMemberId = new Map<number, InkObject[]>();
  let flockByTargetPredatorId = new Map<number, InkObject[]>();
```

- [ ] **Step 2: Add `huntingFlock`/`beingHunted` defaults to `makeObject`**

In the `makeObject` function, add two fields to the returned object literal (alongside the existing `motionBlend: null,` line):

```ts
    huntingFlock: false,
    beingHunted: false,
```

- [ ] **Step 3: Set `preyButtonEverPressed` when the pencil button fires**

Find the existing `onInkAmbientAddPrey` handler:

```ts
  const onInkAmbientAddPrey = () => {
    forceAddPrey(performance.now());
  };
```

Change it to:

```ts
  const onInkAmbientAddPrey = () => {
    preyButtonEverPressed = true;
    forceAddPrey(performance.now());
  };
```

- [ ] **Step 4: Compute flock assignments at the start of `updateSimulation`**

In `updateSimulation`, right after the existing `const wasVanishing = new Set(...)` block and before the `for (const object of objects) updateObject(object, dt, now);` loop, add:

```ts
    if (preyButtonEverPressed && countAlive("prey") > countAlive("predator")) {
      const assignment = computeFlockAssignments(objects);
      for (const object of objects) {
        object.huntingFlock = assignment.huntingFlockIds.has(object.id);
        object.beingHunted = assignment.beingHuntedIds.has(object.id);
      }
      flockTargetByMemberId = assignment.targetByMemberId;
      flockByMemberId = assignment.flockByMemberId;
      flockByTargetPredatorId = assignment.flockByTargetPredatorId;
    } else {
      for (const object of objects) {
        object.huntingFlock = false;
        object.beingHunted = false;
      }
      flockTargetByMemberId = new Map();
      flockByMemberId = new Map();
      flockByTargetPredatorId = new Map();
    }
```

- [ ] **Step 5: Override acceleration and max speed for hunting-flock prey in `updateObject`**

Replace the acceleration block:

```ts
    let acceleration =
      target && !settling
        ? object.role === "predator"
          ? predatorAcceleration(object, target, maxAccel, now)
          : preyAcceleration(object, target, maxAccel, now, nearbyPredatorWobbleMultiplier(object, objects))
        : idleAcceleration(object, activeAnchor, isUnsafe, now);
```

with:

```ts
    let acceleration =
      object.huntingFlock && flockTargetByMemberId.has(object.id)
        ? flockHuntAcceleration(
            object,
            flockTargetByMemberId.get(object.id)!,
            flockByMemberId.get(object.id)!,
            maxAccel,
          )
        : target && !settling
          ? object.role === "predator"
            ? predatorAcceleration(object, target, maxAccel, now)
            : preyAcceleration(object, target, maxAccel, now, nearbyPredatorWobbleMultiplier(object, objects))
          : idleAcceleration(object, activeAnchor, isUnsafe, now);
```

Replace the max-speed block:

```ts
    const maxSpeed =
      target && !settling
        ? object.role === "predator"
          ? Math.min(
              object.chaseSpeed *
                pairApproachRamp(object, target) *
                spawnRamp *
                chaseAccelerationMultiplier(object.chaseElapsed),
              PREDATOR_MAX_RAMPED_SPEED,
            )
          : object.chaseSpeed
        : 155 - (155 - 115) * massT;
```

with:

```ts
    const maxSpeed = object.huntingFlock
      ? object.chaseSpeed
      : target && !settling
        ? object.role === "predator"
          ? Math.min(
              object.chaseSpeed *
                pairApproachRamp(object, target) *
                spawnRamp *
                chaseAccelerationMultiplier(object.chaseElapsed),
              PREDATOR_MAX_RAMPED_SPEED,
            )
          : object.chaseSpeed
        : 155 - (155 - 115) * massT;
```

`updateTarget` still runs unconditionally every tick for every object (unchanged) — for hunting-flock prey its result is simply unused this tick, keeping `currentTargetId` "warm" for whenever the flock disbands or its target escapes/converts.

- [ ] **Step 6: Add the kill-trigger and conversion pass**

In `updateSimulation`, right after the existing `for (const id of catchResult.loserIds) { ... }` block (which ends with the `if (loser.lives <= 0) loser.vanishElapsed = 0;` line and its closing braces) and before the scarcity-penalty block, add:

```ts
    for (const predator of objects) {
      if (!predator.beingHunted || predator.vanishElapsed !== null) continue;
      const hunters = flockByTargetPredatorId.get(predator.id);
      if (!hunters || !isFlockKillTriggered(predator, hunters)) continue;
      predator.role = "prey";
      predator.radius = rollRadius("prey", rng);
      predator.chaseSpeed = rollChaseSpeed("prey", predator.attractionValue, rng);
      predator.currentTargetId = null;
      predator.chaseElapsed = 0;
      predator.huntingFlock = false;
      predator.beingHunted = false;
      addBurstEffect(predator.position.x, predator.position.y, predator.radius);
    }
```

- [ ] **Step 7: Update imports**

Add to the existing `@/lib/ink-ambient/flocking` — this is a new import block, add it alongside the other `@/lib/ink-ambient/*` imports:

```ts
import {
  computeFlockAssignments,
  flockHuntAcceleration,
  isFlockKillTriggered,
} from "@/lib/ink-ambient/flocking";
```

No new config imports are needed in `InkAmbient.svelte` itself — `FLOCK_RADIUS`/weights/colors are only consumed inside `flocking.ts`/`renderer.ts`.

- [ ] **Step 8: Render the hunting-flock blink and targeted-predator tint in `renderer.ts`**

Add to the top-of-file config import:

```ts
import {
  FLOCK_BLINK_FREQUENCY,
  FLOCK_HUNT_BRIGHT_RED_COLOR,
  OBJECT_TIP_OFFSET_FRACTION,
  PREDATOR_SPAWN_TINT_COLOR,
  PREY_SPAWN_TINT_COLOR,
  SPAWN_TINT_DURATION_SECONDS,
} from "./config";
```

(Merge alphabetically into the existing import block from that file rather than adding a duplicate import line — the existing block already has `OBJECT_TIP_OFFSET_FRACTION`, `PREDATOR_SPAWN_TINT_COLOR`, `PREY_SPAWN_TINT_COLOR`, `SPAWN_TINT_DURATION_SECONDS`; just add the two new names into it.)

Find the existing spawn-tint block:

```ts
      this.context.drawImage(sprite, -SPRITE_SIZE / 2, -SPRITE_SIZE / 2);
      const tintAlpha = clamp(1 - (now - object.spawnAt) / 1000 / SPAWN_TINT_DURATION_SECONDS, 0, 1);
      if (tintAlpha > 0) {
        this.context.globalCompositeOperation = "source-atop";
        this.context.globalAlpha = object.opacity * opacity * fadeMultiplier * tintAlpha;
        this.context.fillStyle = isPenLike(object) ? PREDATOR_SPAWN_TINT_COLOR : PREY_SPAWN_TINT_COLOR;
        this.context.fillRect(-SPRITE_SIZE / 2, -SPRITE_SIZE / 2, SPRITE_SIZE, SPRITE_SIZE);
      }
      this.context.restore();
    }
```

Replace it with:

```ts
      this.context.drawImage(sprite, -SPRITE_SIZE / 2, -SPRITE_SIZE / 2);
      const baseAlpha = object.opacity * opacity * fadeMultiplier;
      if (object.huntingFlock) {
        const blink = (Math.sin((now / 1000) * FLOCK_BLINK_FREQUENCY) + 1) / 2;
        this.context.globalCompositeOperation = "source-atop";
        this.context.globalAlpha = baseAlpha * (1 - blink);
        this.context.fillStyle = PREDATOR_SPAWN_TINT_COLOR;
        this.context.fillRect(-SPRITE_SIZE / 2, -SPRITE_SIZE / 2, SPRITE_SIZE, SPRITE_SIZE);
        this.context.globalAlpha = baseAlpha * blink;
        this.context.fillStyle = FLOCK_HUNT_BRIGHT_RED_COLOR;
        this.context.fillRect(-SPRITE_SIZE / 2, -SPRITE_SIZE / 2, SPRITE_SIZE, SPRITE_SIZE);
      } else if (object.beingHunted) {
        this.context.globalCompositeOperation = "source-atop";
        this.context.globalAlpha = baseAlpha;
        this.context.fillStyle = PREY_SPAWN_TINT_COLOR;
        this.context.fillRect(-SPRITE_SIZE / 2, -SPRITE_SIZE / 2, SPRITE_SIZE, SPRITE_SIZE);
      } else {
        const tintAlpha = clamp(1 - (now - object.spawnAt) / 1000 / SPAWN_TINT_DURATION_SECONDS, 0, 1);
        if (tintAlpha > 0) {
          this.context.globalCompositeOperation = "source-atop";
          this.context.globalAlpha = baseAlpha * tintAlpha;
          this.context.fillStyle = isPenLike(object) ? PREDATOR_SPAWN_TINT_COLOR : PREY_SPAWN_TINT_COLOR;
          this.context.fillRect(-SPRITE_SIZE / 2, -SPRITE_SIZE / 2, SPRITE_SIZE, SPRITE_SIZE);
        }
      }
      this.context.restore();
    }
```

Note: reusing `PREDATOR_SPAWN_TINT_COLOR` for the blink's "pastel red" half and `PREY_SPAWN_TINT_COLOR` for the targeted-predator's steady green is intentional (per Global Constraints) — both colors already exist from the spawn-tint feature and happen to match "pastel red"/"pastel green" exactly.

- [ ] **Step 9: Run the Svelte autofixer**

Run on both changed Svelte files (only `InkAmbient.svelte` has Svelte-specific markup changed here; `renderer.ts` is plain TypeScript, not a Svelte file, so it doesn't need the autofixer):

```
svelte-autofixer on src/components/svelte/InkAmbient.svelte
```

(Or the CLI equivalent `npx -y @sveltejs/mcp svelte-autofixer src/components/svelte/InkAmbient.svelte` if the MCP tool isn't connected.) Repeat until clean, applying any real fixes it proposes (the pre-existing `SvelteSet` suggestion for `readyForRemoval` is already adjudicated — declined, non-reactive local temporary, consistent with plain-`Set`-typed helpers elsewhere).

- [ ] **Step 10: Full typecheck and test run**

Run: `npx astro check`
Expected: no new errors (same pre-existing, unrelated `Button.test.ts` errors only).

Run: `npx vitest run`
Expected: all tests PASS.

- [ ] **Step 11: Commit**

```bash
git add src/components/svelte/InkAmbient.svelte src/lib/ink-ambient/renderer.ts
git commit -m "feat(ink-ambient): wire prey-flock predator conversion into the simulation and renderer"
```

---

### Task 4: Manual visual verification

None of Task 3's wiring is covered by automated tests — consistent with every other Svelte-component-wiring task in this ecosystem, this is the manual correctness gate.

**Files:** none new — this task only touches `config.ts` constant values if tuning is needed.

- [ ] **Step 1: Full regression pass**

Run: `npx vitest run` and `npx astro check`. Expected: both clean.

- [ ] **Step 2: Trigger the mechanic in the browser**

Start the dev server, open the home page. To reach the trigger condition quickly: click the pencil ("Add a prey") button at least once, then use the pen/pencil buttons (or just let the population run) until live prey outnumber live predators. Then watch for a predator to start chasing a prey that's near 2+ other prey:

- Confirm a qualifying cluster (3+ prey, one of them targeted by a predator) starts blinking between bright red and a pastel red, and visibly reverses direction to close in on the predator instead of fleeing it.
- Confirm the targeted predator renders with a steady pastel-green tint while being hunted.
- Confirm that when the flock catches up to the predator (within the same radius the flock is clustering at), an ink-blot burst appears at its position and it immediately becomes an ordinary-looking prey (pencil sprite, prey-appropriate size) that resumes fleeing normally — not destroyed, not a predator anymore.
- Confirm prey that are NOT part of a qualifying/targeted flock keep behaving exactly as before (normal fleeing, no tint).
- Confirm dragging any object in this state still works normally (verifies no regression from the new fields/branches).

- [ ] **Step 3: Tune constants based on what's observed**

If flocks feel too easy/hard to form, adjust `FLOCK_RADIUS`/`FLOCK_MIN_SIZE`. If the hunting steering looks too chaotic or too rigid, adjust the `FLOCK_*_WEIGHT` constants. If the blink is too fast/slow, adjust `FLOCK_BLINK_FREQUENCY`. Re-run Step 1 after any change.

- [ ] **Step 4: Fix wave**

If Step 2 surfaces a genuine bug (e.g., a flock never disbanding after its target converts, a converted predator immediately being re-targeted incorrectly), fix it in the relevant module, add a regression test to `tests/lib/ink-ambient.test.ts` if the bug was in `flocking.ts`, and re-run Step 1.

- [ ] **Step 5: Final commit (only if Steps 3-4 changed anything)**

```bash
git add -A src/lib/ink-ambient/ src/components/svelte/
git commit -m "fix(ink-ambient): tune flocking constants from manual verification"
```

- [ ] **Step 6: Report back**

Summarize what was verified and any constants tuned.
