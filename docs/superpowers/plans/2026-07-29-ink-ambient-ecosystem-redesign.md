# Ink Ambient Ecosystem Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace ink-ambient's fixed pairing model with a free-agent ecosystem: continuous nearest-opponent targeting, lives/hunger survival mechanics for predators, Lotka-Volterra-driven population targets, and a manual top-up button.

**Architecture:** Four new pure-logic modules (`population.ts`, `spawn.ts`, `catches.ts`, plus additions to `lifecycle.ts`) carry all newly-testable logic and can be built additively without breaking the existing pairing system. `pairing.ts` is then deleted and replaced by `targeting.ts` in one atomic cutover task that also rewires `InkAmbient.svelte`, `renderer.ts`, and `PaperNav.svelte` together, since these are too interdependent to split into independently-green intermediate states. Full spec: `docs/superpowers/specs/2026-07-29-ink-ambient-ecosystem-redesign-design.md`.

**Tech Stack:** TypeScript, Svelte 5 (runes), Vitest, existing `src/lib/ink-ambient/*` fixed-step simulation.

## Global Constraints

- Every new/changed `.ts` file must pass `npx astro check` (project's typecheck) with zero new errors.
- Every task that touches `.ts` logic must pass `npx vitest run` with zero failures before commit.
- Any Svelte file (`InkAmbient.svelte`, `PaperNav.svelte`) MUST be run through the Svelte MCP `svelte-autofixer` (or CLI equivalent `npx -y @sveltejs/mcp svelte-autofixer`) before being considered done, repeated until no issues remain — this is a hard project requirement from `CLAUDE.md`.
- No visible score/HUD element (non-goal from spec §3) — lives/hunger stay internal bookkeeping only.
- Population's Lotka-Volterra model is a stylistic rhythm generator, not scientifically faithful — tune for a pleasant ~20-40s bounded cycle, not biological accuracy (spec §3).
- Prey has no lives/hunger/vanish mechanic — only predators do. Prey still only dies by being caught.
- Persistence (`persistence.ts`) does not need modification — it already only serializes `id`/`position`/`velocity`/`attractionValue`/`rngState`, never `partnerId`/`formerPartnerId`, so removing those type fields is a non-issue there (confirmed by reading the file; spec §10 flagged this as needing confirmation).

## Architecture note: role assignment (resolves a spec ambiguity)

Spec §4.2 says role is "a coin flip... rolled once at spawn instead, in `makeObject`." Spec §8.2 says population top-up "spawns toward `preyTarget`/`predatorTarget`" as independent per-role counters. These two statements are in tension: a coin-flip inside `makeObject` cannot deterministically satisfy two independent target counts.

**Resolution used throughout this plan:** `makeObject` takes an explicit required `role: "predator" | "prey"` parameter and rolls only role-*dependent* traits (radius, chaseSpeed) — it does not itself flip a coin. The coin flip described in §4.2 happens at the two call sites that don't have a population target to satisfy:
- The one-time initial batch spawned in `onMount` before the simulation loop starts (`spawnInitialBatch`), and
- Restoring a snapshot's saved objects (`restoreObjects`), which doesn't persist role either.

The population-driven continuous top-up (`topUpPopulation`, spec §8) passes an explicit `role` computed from which target (`preyTarget`/`predatorTarget`) is currently under-filled. This keeps `makeObject` a pure "given a role, roll everything else" constructor and lets both spec sections apply exactly where they're relevant.

---

### Task 1: Population dynamics module (Lotka-Volterra)

**Files:**
- Create: `src/lib/ink-ambient/population.ts`
- Modify: `src/lib/ink-ambient/config.ts` (append new constants, do not touch existing ones)
- Test: `tests/lib/ink-ambient.test.ts` (append new `describe` block)

**Interfaces:**
- Consumes: nothing from other ink-ambient modules.
- Produces: `PopulationState { prey: number; predator: number }`, `stepLotkaVolterra(state, dt): PopulationState`, `PopulationTargets { preyTarget: number; predatorTarget: number }`, `mapToTargets(state): PopulationTargets`. Task 5 imports all four names from `./population`.

- [ ] **Step 1: Append new config constants**

Add to the end of `src/lib/ink-ambient/config.ts` (after the existing `BURST_LIFETIME_MAX` line):

```ts
// Lotka-Volterra population rhythm (spec §8) — tuned for a ~20-40s bounded
// boom/bust cycle at equilibrium x*=y*=1, not biological accuracy.
export const LV_ALPHA = 0.2;
export const LV_BETA = 0.2;
export const LV_GAMMA = 0.2;
export const LV_DELTA = 0.2;
export const LV_SCALE = 2;
export const PREY_TARGET_MAX = 2;
export const PREDATOR_TARGET_MAX = 2;
```

- [ ] **Step 2: Write the failing test**

Append to `tests/lib/ink-ambient.test.ts` (new imports at the top alongside the existing ones):

```ts
import { stepLotkaVolterra, mapToTargets } from "@/lib/ink-ambient/population";
```

New `describe` block at the end of the file, before the final closing `});` of the outer `describe("Ink Ambient primitives", ...)` — add it as a new top-level block after that closing brace:

```ts
describe("Population dynamics", () => {
  it("keeps prey/predator state bounded and non-NaN over many steps", () => {
    let state = { prey: 1.5, predator: 0.7 };
    let sawIncrease = false;
    let previousPrey = state.prey;
    for (let i = 0; i < 3000; i += 1) {
      state = stepLotkaVolterra(state, 1 / 60);
      expect(Number.isFinite(state.prey)).toBe(true);
      expect(Number.isFinite(state.predator)).toBe(true);
      expect(state.prey).toBeGreaterThanOrEqual(0.05);
      expect(state.predator).toBeGreaterThanOrEqual(0.05);
      expect(state.prey).toBeLessThan(50);
      expect(state.predator).toBeLessThan(50);
      if (state.prey > previousPrey) sawIncrease = true;
      previousPrey = state.prey;
    }
    // A genuine oscillation must include at least one increasing step, not a
    // monotonic decay to the floor.
    expect(sawIncrease).toBe(true);
  });

  it("maps population state to integer targets within configured maximums", () => {
    const low = mapToTargets({ prey: 0.01, predator: 0.01 });
    expect(low.preyTarget).toBe(1);
    expect(low.predatorTarget).toBe(1);

    const high = mapToTargets({ prey: 100, predator: 100 });
    expect(high.preyTarget).toBeLessThanOrEqual(2);
    expect(high.predatorTarget).toBeLessThanOrEqual(2);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run tests/lib/ink-ambient.test.ts`
Expected: FAIL — `Cannot find module '@/lib/ink-ambient/population'`.

- [ ] **Step 4: Implement `population.ts`**

```ts
import { LV_ALPHA, LV_BETA, LV_DELTA, LV_GAMMA, LV_SCALE, PREDATOR_TARGET_MAX, PREY_TARGET_MAX } from "./config";

export interface PopulationState {
  prey: number;
  predator: number;
}

export function stepLotkaVolterra(state: PopulationState, dt: number): PopulationState {
  const { prey: x, predator: y } = state;
  const dx = LV_ALPHA * x - LV_BETA * x * y;
  const dy = -LV_GAMMA * y + LV_DELTA * x * y;
  return {
    prey: Math.max(0.05, x + dx * dt),
    predator: Math.max(0.05, y + dy * dt),
  };
}

export interface PopulationTargets {
  preyTarget: number;
  predatorTarget: number;
}

function clampRoundedInt(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)));
}

export function mapToTargets(state: PopulationState): PopulationTargets {
  return {
    preyTarget: clampRoundedInt(state.prey * LV_SCALE, 1, PREY_TARGET_MAX),
    predatorTarget: clampRoundedInt(state.predator * LV_SCALE, 1, PREDATOR_TARGET_MAX),
  };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/lib/ink-ambient.test.ts`
Expected: PASS (all tests, including the two new ones).

- [ ] **Step 6: Typecheck**

Run: `npx astro check`
Expected: no new errors.

- [ ] **Step 7: Commit**

```bash
git add src/lib/ink-ambient/population.ts src/lib/ink-ambient/config.ts tests/lib/ink-ambient.test.ts
git commit -m "feat(ink-ambient): add Lotka-Volterra population dynamics module"
```

---

### Task 2: Spawn-time trait rolls (role-independent radius/chaseSpeed)

**Files:**
- Create: `src/lib/ink-ambient/spawn.ts`
- Test: `tests/lib/ink-ambient.test.ts` (append new `describe` block)

**Interfaces:**
- Consumes: `PREY_SPEED_MIN/MAX`, `PREDATOR_SPEED_MULTIPLIER_MIN/MAX`, `PREY_RADIUS_MIN/MAX`, `PREDATOR_RADIUS_MIN/MAX`, `ATTRACTION_VALUE_MIN/MAX`, `CHASE_VIGOR_JITTER` (all already exist in `config.ts` — no new constants needed), `clamp` from `./physics`, `SeededRng` from `./rng`.
- Produces: `rollRadius(role, rng): number`, `rollChaseSpeed(role, attractionValue, rng): number`. Task 5 imports both from `./spawn`.

- [ ] **Step 1: Write the failing test**

Add import at the top of `tests/lib/ink-ambient.test.ts`:

```ts
import { rollRadius, rollChaseSpeed } from "@/lib/ink-ambient/spawn";
import {
  PREDATOR_RADIUS_MAX,
  PREDATOR_RADIUS_MIN,
  PREY_RADIUS_MAX,
  PREY_RADIUS_MIN,
} from "@/lib/ink-ambient/config";
```

(`PREDATOR_RADIUS_MIN/MAX` and `PREY_RADIUS_MIN/MAX` are not yet imported in the test file — add them to the existing `@/lib/ink-ambient/config` import block rather than a second import line.)

New `describe` block, appended after the `"Population dynamics"` block from Task 1:

```ts
describe("Spawn-time trait rolls", () => {
  it("rolls radius within the role-specific range", () => {
    const rng = new SeededRng(21);
    for (let i = 0; i < 100; i += 1) {
      const preyRadius = rollRadius("prey", rng);
      expect(preyRadius).toBeGreaterThanOrEqual(PREY_RADIUS_MIN);
      expect(preyRadius).toBeLessThanOrEqual(PREY_RADIUS_MAX);
      const predatorRadius = rollRadius("predator", rng);
      expect(predatorRadius).toBeGreaterThanOrEqual(PREDATOR_RADIUS_MIN);
      expect(predatorRadius).toBeLessThanOrEqual(PREDATOR_RADIUS_MAX);
    }
  });

  it("rolls predators statistically faster than prey at the same vigor, without guaranteeing every instance", () => {
    // No paired-derivation guarantee exists anymore (spec §4.2: "statistically
    // faster... without requiring a specific paired prey to derive from") —
    // assert the population-level tendency via averages, not a per-pair invariant.
    const rng = new SeededRng(55);
    let preySum = 0;
    let predatorSum = 0;
    const trials = 500;
    for (let i = 0; i < trials; i += 1) {
      preySum += rollChaseSpeed("prey", 1.0, rng);
      predatorSum += rollChaseSpeed("predator", 1.0, rng);
    }
    expect(predatorSum / trials).toBeGreaterThan(preySum / trials);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/ink-ambient.test.ts`
Expected: FAIL — `Cannot find module '@/lib/ink-ambient/spawn'`.

- [ ] **Step 3: Implement `spawn.ts`**

```ts
import {
  ATTRACTION_VALUE_MAX,
  ATTRACTION_VALUE_MIN,
  CHASE_VIGOR_JITTER,
  PREDATOR_RADIUS_MAX,
  PREDATOR_RADIUS_MIN,
  PREDATOR_SPEED_MULTIPLIER_MAX,
  PREDATOR_SPEED_MULTIPLIER_MIN,
  PREY_RADIUS_MAX,
  PREY_RADIUS_MIN,
  PREY_SPEED_MAX,
  PREY_SPEED_MIN,
} from "./config";
import { clamp } from "./physics";
import type { SeededRng } from "./rng";
import type { InkObject } from "./types";

type Role = NonNullable<InkObject["role"]>;

function vigorT(attractionValue: number, rng: SeededRng): number {
  const raw = (attractionValue - ATTRACTION_VALUE_MIN) / (ATTRACTION_VALUE_MAX - ATTRACTION_VALUE_MIN);
  return clamp(raw + rng.range(-CHASE_VIGOR_JITTER, CHASE_VIGOR_JITTER), 0, 1);
}

export function rollRadius(role: Role, rng: SeededRng): number {
  return role === "predator"
    ? rng.range(PREDATOR_RADIUS_MIN, PREDATOR_RADIUS_MAX)
    : rng.range(PREY_RADIUS_MIN, PREY_RADIUS_MAX);
}

export function rollChaseSpeed(role: Role, attractionValue: number, rng: SeededRng): number {
  const t = vigorT(attractionValue, rng);
  if (role === "prey") return PREY_SPEED_MIN + (PREY_SPEED_MAX - PREY_SPEED_MIN) * t;
  const min = PREY_SPEED_MIN * PREDATOR_SPEED_MULTIPLIER_MIN;
  const max = PREY_SPEED_MAX * PREDATOR_SPEED_MULTIPLIER_MAX;
  return min + (max - min) * t;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/lib/ink-ambient.test.ts`
Expected: PASS.

- [ ] **Step 5: Typecheck**

Run: `npx astro check`
Expected: no new errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/ink-ambient/spawn.ts tests/lib/ink-ambient.test.ts
git commit -m "feat(ink-ambient): add spawn-time role/radius/chaseSpeed rolls"
```

---

### Task 3: Lives/hunger/vanish fields, catch resolution, and vanish rendering helpers

This task is **additive only** to `types.ts` and `pairing.ts` — `partnerId`/`formerPartnerId` stay in place for now so the existing pairing system keeps compiling and passing until Task 5's cutover. `catches.ts` and the `lifecycle.ts` additions are new, unused-by-production-code-yet modules exercised directly by their own unit tests.

**Files:**
- Modify: `src/lib/ink-ambient/types.ts` (add fields, do not remove any yet)
- Modify: `src/lib/ink-ambient/config.ts` (append new constants)
- Modify: `src/lib/ink-ambient/lifecycle.ts` (append new functions)
- Create: `src/lib/ink-ambient/catches.ts`
- Test: `tests/lib/ink-ambient.test.ts` (append new `describe` blocks; also add the four new fields to the shared `object()` test helper so every existing test that builds an `InkObject` still type-checks)

**Interfaces:**
- Consumes: `InkObject` (extended), config constants below.
- Produces: `resolveCatches(objects): CatchResolution` where `CatchResolution = { destroyedPreyIds: Set<number>; winnerIds: Set<number>; loserIds: Set<number>; bursts: Array<{x:number;y:number;radius:number}> }`; `livesFadeStep(lives): number`; `renderedOpacityMultiplier(object): number`; `updateVanish(object, dt): boolean`; `applyPredatorSurvivalTick(object, dt): void` (increments hunger, triggers vanish on lives/hunger threshold); `predatorSpawnRampMultiplier(object, now): number`. Task 5 imports `resolveCatches` from `./catches` and all five lifecycle functions from `./lifecycle`.

- [ ] **Step 1: Extend `InkObject` in `types.ts`**

In `src/lib/ink-ambient/types.ts`, add four fields to the `InkObject` type (after the existing `trailSampleTimer: number;` line, before `partnerId`, so `partnerId`/`formerPartnerId` remain untouched for this task):

```ts
  currentTargetId: number | null;
  lives: number;
  hungerElapsed: number;
  vanishElapsed: number | null;
```

- [ ] **Step 2: Update the shared test helper**

In `tests/lib/ink-ambient.test.ts`, the `object(id, x, y): InkObject` helper currently ends with `partnerId: null, formerPartnerId: null, role: null, chaseSpeed: 0, attractionValue: 1, motionBlend: null,`. Add the four new fields (keep the existing ones — they're only removed in Task 5):

```ts
    currentTargetId: null,
    lives: 3,
    hungerElapsed: 0,
    vanishElapsed: null,
```

- [ ] **Step 3: Append new config constants**

Add to the end of `src/lib/ink-ambient/config.ts` (after the Task 1 additions):

```ts
// Predator survival mechanics (spec §5-§7).
export const PREDATOR_LIVES_START = 3;
export const PREDATOR_STARVE_SECONDS = 16;
export const VANISH_DURATION_SECONDS = 0.5;
export const PREDATOR_PREY_CATCH_RADIUS_FRACTION = 0.65;
// Predator spawn ramp (spec §6.1) — lives here rather than in Task 5 because
// predatorSpawnRampMultiplier (added below) needs it and is built/tested in
// this task, before the cutover.
export const PREDATOR_SPAWN_RAMP_SECONDS = 3;
export const PREDATOR_SPAWN_RAMP_START_FRACTION = 0.5;
```

- [ ] **Step 4: Write the failing tests**

Add imports at the top of `tests/lib/ink-ambient.test.ts`:

```ts
import { resolveCatches } from "@/lib/ink-ambient/catches";
import {
  livesFadeStep,
  renderedOpacityMultiplier,
  updateVanish,
  applyPredatorSurvivalTick,
  predatorSpawnRampMultiplier,
} from "@/lib/ink-ambient/lifecycle";
```

New `describe` blocks, appended after the `"Spawn-time trait rolls"` block from Task 2:

```ts
describe("Catch resolution", () => {
  it("resolves the closest predator as winner and costs every other targeting predator a life", () => {
    const prey = object(1, 100, 100);
    prey.role = "prey";
    const closeWinner = object(2, 105, 100); // distance 5, well inside catch radius
    closeWinner.role = "predator";
    closeWinner.currentTargetId = 1;
    const farLoser = object(3, 108, 100); // distance 8, also inside catch radius, but farther
    farLoser.role = "predator";
    farLoser.currentTargetId = 1;
    const uninvolved = object(4, 500, 500);
    uninvolved.role = "predator";
    uninvolved.currentTargetId = null; // not targeting prey 1 — unaffected even though it's a predator

    const result = resolveCatches([prey, closeWinner, farLoser, uninvolved]);

    expect(result.destroyedPreyIds.has(1)).toBe(true);
    expect(result.winnerIds.has(2)).toBe(true);
    expect(result.loserIds.has(3)).toBe(true);
    expect(result.loserIds.has(4)).toBe(false);
    expect(result.bursts).toHaveLength(1);
  });

  it("does not catch a prey outside the tighter catch radius even if within full physics radius", () => {
    const prey = object(1, 0, 0);
    prey.role = "prey";
    prey.radius = 15;
    const predator = object(2, 30, 0); // sum of radii = 15+20=35 (full-radius overlap), but
    predator.role = "predator"; // catch radius is (15+20)*0.65=22.75 < 30, so no catch
    predator.radius = 20;
    predator.currentTargetId = 1;

    const result = resolveCatches([prey, predator]);
    expect(result.destroyedPreyIds.size).toBe(0);
    expect(result.winnerIds.size).toBe(0);
  });

  it("ignores a predator whose currentTargetId points at a different prey", () => {
    const preyA = object(1, 0, 0);
    preyA.role = "prey";
    const preyB = object(2, 500, 500);
    preyB.role = "prey";
    const predator = object(3, 3, 0); // catches preyA
    predator.role = "predator";
    predator.currentTargetId = 2; // was targeting preyB, unaffected by catching preyA

    const result = resolveCatches([preyA, preyB, predator]);
    expect(result.destroyedPreyIds.has(1)).toBe(true);
    expect(result.winnerIds.has(3)).toBe(true);
    expect(result.loserIds.size).toBe(0);
  });

  it("excludes a mid-vanish predator from winning a catch", () => {
    const prey = object(1, 0, 0);
    prey.role = "prey";
    const vanishing = object(2, 3, 0);
    vanishing.role = "predator";
    vanishing.vanishElapsed = 0.1;

    const result = resolveCatches([prey, vanishing]);
    expect(result.destroyedPreyIds.size).toBe(0);
  });
});

describe("Lives/hunger vanish rendering", () => {
  it("maps lives to stepped opacity fractions", () => {
    expect(livesFadeStep(3)).toBe(1.0);
    expect(livesFadeStep(2)).toBeCloseTo(0.7, 5);
    expect(livesFadeStep(1)).toBeCloseTo(0.4, 5);
    expect(livesFadeStep(0)).toBeCloseTo(0.4, 5);
  });

  it("only fades predators, and only while not vanishing", () => {
    const prey = object(1, 0, 0);
    prey.role = "prey";
    prey.lives = 1;
    expect(renderedOpacityMultiplier(prey)).toBe(1);

    const predator = object(2, 0, 0);
    predator.role = "predator";
    predator.lives = 2;
    predator.hungerElapsed = 0;
    expect(renderedOpacityMultiplier(predator)).toBeCloseTo(0.7, 5);

    predator.vanishElapsed = 0.1;
    expect(renderedOpacityMultiplier(predator)).toBe(1);
  });

  it("combines lives and hunger fades multiplicatively", () => {
    const predator = object(1, 0, 0);
    predator.role = "predator";
    predator.lives = 3;
    predator.hungerElapsed = 8; // half of PREDATOR_STARVE_SECONDS (16)
    expect(renderedOpacityMultiplier(predator)).toBeCloseTo(0.5, 5);
  });

  it("steps vanish animation toward zero scale/opacity and reports completion", () => {
    const predator = object(1, 0, 0);
    predator.vanishElapsed = 0;
    expect(updateVanish(predator, 0.25)).toBe(false);
    expect(predator.scale.x).toBeCloseTo(0.5, 5);
    expect(predator.opacity).toBeCloseTo(0.5, 5);
    expect(updateVanish(predator, 0.25)).toBe(true);
    expect(predator.scale.x).toBeCloseTo(0, 5);
  });

  it("is a no-op on an object that is not vanishing", () => {
    const predator = object(1, 0, 0);
    predator.vanishElapsed = null;
    expect(updateVanish(predator, 1)).toBe(false);
  });
});

describe("Predator survival tick and spawn ramp", () => {
  it("triggers vanish when lives reaches 0, even before the hunger threshold", () => {
    const predator = object(1, 0, 0);
    predator.role = "predator";
    predator.lives = 0;
    predator.hungerElapsed = 0;
    applyPredatorSurvivalTick(predator, 1);
    expect(predator.vanishElapsed).toBe(0);
  });

  it("triggers vanish when hunger reaches the starve threshold", () => {
    const predator = object(1, 0, 0);
    predator.role = "predator";
    predator.lives = 3;
    predator.hungerElapsed = 15.5; // one tick under PREDATOR_STARVE_SECONDS (16)
    applyPredatorSurvivalTick(predator, 1);
    expect(predator.vanishElapsed).toBe(0);
  });

  it("does not trigger vanish while lives and hunger are both within bounds", () => {
    const predator = object(1, 0, 0);
    predator.role = "predator";
    predator.lives = 3;
    predator.hungerElapsed = 0;
    applyPredatorSurvivalTick(predator, 1);
    expect(predator.vanishElapsed).toBeNull();
    expect(predator.hungerElapsed).toBeCloseTo(1, 5);
  });

  it("is a no-op for non-predators and for objects already vanishing", () => {
    const prey = object(1, 0, 0);
    prey.role = "prey";
    applyPredatorSurvivalTick(prey, 5);
    expect(prey.hungerElapsed).toBe(0);

    const vanishing = object(2, 0, 0);
    vanishing.role = "predator";
    vanishing.vanishElapsed = 0.2;
    applyPredatorSurvivalTick(vanishing, 5);
    expect(vanishing.hungerElapsed).toBe(0);
  });

  it("ramps a freshly-spawned predator's speed multiplier from the start fraction up to 1", () => {
    const freshlySpawned = { spawnAt: 1000 };
    expect(predatorSpawnRampMultiplier(freshlySpawned, 1000)).toBeCloseTo(0.5, 5);
    expect(predatorSpawnRampMultiplier(freshlySpawned, 1000 + 1500)).toBeCloseTo(0.75, 5);
    expect(predatorSpawnRampMultiplier(freshlySpawned, 1000 + 3000)).toBeCloseTo(1, 5);
    // Stays at 1 well past the ramp window — no re-ramping for a long-lived predator.
    expect(predatorSpawnRampMultiplier(freshlySpawned, 1000 + 3_600_000)).toBeCloseTo(1, 5);
  });
});
```

- [ ] **Step 5: Run tests to verify they fail**

Run: `npx vitest run tests/lib/ink-ambient.test.ts`
Expected: FAIL — `Cannot find module '@/lib/ink-ambient/catches'` and missing exports from `lifecycle`.

- [ ] **Step 6: Implement `catches.ts`**

```ts
import { PREDATOR_PREY_CATCH_RADIUS_FRACTION } from "./config";
import type { InkObject } from "./types";

export interface CatchResolution {
  destroyedPreyIds: Set<number>;
  winnerIds: Set<number>;
  loserIds: Set<number>;
  bursts: Array<{ x: number; y: number; radius: number }>;
}

export function resolveCatches(objects: readonly InkObject[]): CatchResolution {
  const predators = objects.filter((o) => o.role === "predator" && o.vanishElapsed === null);
  const preyList = objects.filter((o) => o.role === "prey");
  const destroyedPreyIds = new Set<number>();
  const winnerIds = new Set<number>();
  const loserIds = new Set<number>();
  const bursts: Array<{ x: number; y: number; radius: number }> = [];

  for (const prey of preyList) {
    let winner: InkObject | null = null;
    let winnerDistanceSquared = Number.POSITIVE_INFINITY;
    for (const predator of predators) {
      const threshold = (predator.radius + prey.radius) * PREDATOR_PREY_CATCH_RADIUS_FRACTION;
      const dx = predator.position.x - prey.position.x;
      const dy = predator.position.y - prey.position.y;
      const distanceSquared = dx * dx + dy * dy;
      if (distanceSquared >= threshold * threshold) continue;
      if (
        winner === null ||
        distanceSquared < winnerDistanceSquared ||
        (distanceSquared === winnerDistanceSquared && predator.id < winner.id)
      ) {
        winner = predator;
        winnerDistanceSquared = distanceSquared;
      }
    }
    if (!winner) continue;
    destroyedPreyIds.add(prey.id);
    winnerIds.add(winner.id);
    bursts.push({ x: prey.position.x, y: prey.position.y, radius: prey.radius });
    for (const predator of predators) {
      if (predator.id === winner.id) continue;
      if (predator.currentTargetId === prey.id) loserIds.add(predator.id);
    }
  }

  return { destroyedPreyIds, winnerIds, loserIds, bursts };
}
```

- [ ] **Step 7: Append vanish/fade helpers to `lifecycle.ts`**

Add to the end of `src/lib/ink-ambient/lifecycle.ts` (new imports merge into the existing `import { SPAWN_SETTLE_SECONDS } from "./config";` line and add a new one for `clamp`):

```ts
import {
  PREDATOR_SPAWN_RAMP_SECONDS,
  PREDATOR_SPAWN_RAMP_START_FRACTION,
  PREDATOR_STARVE_SECONDS,
  SPAWN_SETTLE_SECONDS,
  VANISH_DURATION_SECONDS,
} from "./config";
import { clamp } from "./physics";
```

(Replace the existing single-constant import line with the three-constant one above, and add the `clamp` import as a new line.)

```ts
export function livesFadeStep(lives: number): number {
  if (lives >= 3) return 1.0;
  if (lives === 2) return 0.7;
  return 0.4;
}

export function renderedOpacityMultiplier(
  object: Pick<InkObject, "role" | "lives" | "hungerElapsed" | "vanishElapsed">,
): number {
  if (object.role !== "predator" || object.vanishElapsed !== null) return 1;
  const hungerFade = clamp(1 - object.hungerElapsed / PREDATOR_STARVE_SECONDS, 0, 1);
  return livesFadeStep(object.lives) * hungerFade;
}

export function updateVanish(object: InkObject, dt: number): boolean {
  if (object.vanishElapsed === null) return false;
  object.vanishElapsed += dt;
  const remaining = clamp(1 - object.vanishElapsed / VANISH_DURATION_SECONDS, 0, 1);
  object.scale.x = remaining;
  object.scale.y = remaining;
  object.opacity = remaining;
  return object.vanishElapsed >= VANISH_DURATION_SECONDS;
}

export function applyPredatorSurvivalTick(object: InkObject, dt: number): void {
  if (object.role !== "predator" || object.vanishElapsed !== null) return;
  object.hungerElapsed += dt;
  if (object.lives <= 0 || object.hungerElapsed >= PREDATOR_STARVE_SECONDS) {
    object.vanishElapsed = 0;
  }
}

export function predatorSpawnRampMultiplier(object: Pick<InkObject, "spawnAt">, now: number): number {
  const elapsedSeconds = (now - object.spawnAt) / 1000;
  return (
    PREDATOR_SPAWN_RAMP_START_FRACTION +
    (1 - PREDATOR_SPAWN_RAMP_START_FRACTION) *
      clamp(elapsedSeconds / PREDATOR_SPAWN_RAMP_SECONDS, 0, 1)
  );
}
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `npx vitest run tests/lib/ink-ambient.test.ts`
Expected: PASS (all tests, old and new).

- [ ] **Step 9: Typecheck**

Run: `npx astro check`
Expected: no new errors.

- [ ] **Step 10: Commit**

```bash
git add src/lib/ink-ambient/types.ts src/lib/ink-ambient/config.ts src/lib/ink-ambient/lifecycle.ts src/lib/ink-ambient/catches.ts tests/lib/ink-ambient.test.ts
git commit -m "feat(ink-ambient): add lives/hunger/vanish fields, catch resolution, vanish rendering"
```

---

### Task 4: Continuous targeting module (`targeting.ts`, additive alongside `pairing.ts`)

`pairing.ts` is untouched by this task — it still exists, is still imported by `InkAmbient.svelte`, and its tests still pass. `targeting.ts` is a new, parallel module built and tested in isolation; nothing wires it into production code until Task 5.

**Files:**
- Create: `src/lib/ink-ambient/targeting.ts`
- Modify: `src/lib/ink-ambient/config.ts` (append new constants)
- Test: `tests/lib/ink-ambient.test.ts` (append new `describe` block)

**Interfaces:**
- Consumes: `InkObject` (with `currentTargetId`/`vanishElapsed` from Task 3), `clamp`/`distance`/`normalize`/`subtract` from `./physics`.
- Produces: `findNearestOpponent(object, objects): InkObject | null`, `updateTarget(object, objects): InkObject | null` (mutates `object.currentTargetId` and `object.motionBlend`), `nearbyPredatorCount(prey, objects): number`, `nearbyPredatorWobbleMultiplier(prey, objects): number`, `pairApproachRamp(object, target): number`, `preyPanicRamp(object, target): number`, `predatorAcceleration(object, target, maxAcceleration, now): Vec2`, `preyAcceleration(object, target, maxAcceleration, now, nearbyMultiplier?): Vec2`, `idleAcceleration(object, activeAnchor, isUnsafe, now): Vec2`. Task 5 imports all of these from `./targeting` (replacing its current imports from `./pairing`).

- [ ] **Step 1: Append new config constants**

Add to the end of `src/lib/ink-ambient/config.ts` (after the Task 3 additions):

```ts
// Continuous per-tick targeting (spec §4.3-§4.4).
export const ANTI_FLICKER_SWITCH_THRESHOLD = 0.1;
export const NEARBY_PREDATOR_WOBBLE_STEP = 0.25;
export const NEARBY_PREDATOR_WOBBLE_MAX = 2;
```

- [ ] **Step 2: Write the failing test**

Add import at the top of `tests/lib/ink-ambient.test.ts`:

```ts
import {
  findNearestOpponent,
  updateTarget,
  nearbyPredatorCount,
  nearbyPredatorWobbleMultiplier,
} from "@/lib/ink-ambient/targeting";
```

New `describe` block, appended after the `"Lives/hunger vanish rendering"` block from Task 3:

```ts
describe("Continuous targeting", () => {
  it("finds the nearest opposite-role candidate, including a grabbed one", () => {
    const predator = object(1, 0, 0);
    predator.role = "predator";
    const farPrey = object(2, 1000, 0);
    farPrey.role = "prey";
    const nearGrabbedPrey = object(3, 10, 0);
    nearGrabbedPrey.role = "prey";
    nearGrabbedPrey.grabbed = true;
    const samePredator = object(4, 1, 0);
    samePredator.role = "predator";

    const nearest = findNearestOpponent(predator, [predator, farPrey, nearGrabbedPrey, samePredator]);
    expect(nearest?.id).toBe(3);
  });

  it("excludes a mid-vanish candidate", () => {
    const predator = object(1, 0, 0);
    predator.role = "predator";
    const vanishingPrey = object(2, 10, 0);
    vanishingPrey.role = "prey";
    vanishingPrey.vanishElapsed = 0.1;
    const fartherAlivePrey = object(3, 50, 0);
    fartherAlivePrey.role = "prey";

    const nearest = findNearestOpponent(predator, [predator, vanishingPrey, fartherAlivePrey]);
    expect(nearest?.id).toBe(3);
  });

  it("does not switch tracked target when the new candidate is only marginally closer", () => {
    const predator = object(1, 0, 0);
    predator.role = "predator";
    const trackedPrey = object(2, 100, 0);
    trackedPrey.role = "prey";
    const slightlyCloserPrey = object(3, 95, 0); // 5% closer, under the 10% threshold
    slightlyCloserPrey.role = "prey";
    predator.currentTargetId = 2;

    const target = updateTarget(predator, [predator, trackedPrey, slightlyCloserPrey]);
    expect(target?.id).toBe(2);
    expect(predator.currentTargetId).toBe(2);
  });

  it("switches tracked target when the new candidate is clearly closer", () => {
    const predator = object(1, 0, 0);
    predator.role = "predator";
    const trackedPrey = object(2, 100, 0);
    trackedPrey.role = "prey";
    const muchCloserPrey = object(3, 20, 0); // 80% closer, over the 10% threshold
    muchCloserPrey.role = "prey";
    predator.currentTargetId = 2;
    predator.lastAcceleration = { x: 5, y: 5 };

    const target = updateTarget(predator, [predator, trackedPrey, muchCloserPrey]);
    expect(target?.id).toBe(3);
    expect(predator.currentTargetId).toBe(3);
    expect(predator.motionBlend).not.toBeNull();
    expect(predator.motionBlend?.from).toEqual({ x: 5, y: 5 });
  });

  it("switches tracked target when the previously tracked target no longer exists", () => {
    const predator = object(1, 0, 0);
    predator.role = "predator";
    const newPrey = object(2, 50, 0);
    newPrey.role = "prey";
    predator.currentTargetId = 999; // stale id, no longer in the array

    const target = updateTarget(predator, [predator, newPrey]);
    expect(target?.id).toBe(2);
    expect(predator.currentTargetId).toBe(2);
  });

  it("counts nearby predators within the ramp-start distance and scales prey wobble", () => {
    const prey = object(1, 0, 0);
    prey.radius = 15;
    const near1 = object(2, 30, 0);
    near1.role = "predator";
    near1.radius = 20;
    const near2 = object(3, -30, 0);
    near2.role = "predator";
    near2.radius = 20;
    const far = object(4, 5000, 0);
    far.role = "predator";
    far.radius = 20;

    expect(nearbyPredatorCount(prey, [prey, near1, near2, far])).toBe(2);
    const soloMultiplier = nearbyPredatorWobbleMultiplier(prey, [prey, near1, far]);
    const duoMultiplier = nearbyPredatorWobbleMultiplier(prey, [prey, near1, near2, far]);
    expect(soloMultiplier).toBe(1);
    expect(duoMultiplier).toBeGreaterThan(soloMultiplier);
    expect(duoMultiplier).toBeLessThanOrEqual(2);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run tests/lib/ink-ambient.test.ts`
Expected: FAIL — `Cannot find module '@/lib/ink-ambient/targeting'`.

- [ ] **Step 4: Implement `targeting.ts`**

```ts
import {
  ANTI_FLICKER_SWITCH_THRESHOLD,
  ATTRACTION_BASE_ACCELERATION,
  ATTRACTION_RAMP_MAX,
  ATTRACTION_RAMP_START_MULTIPLIER,
  MOTION_BLEND_SECONDS,
  NEARBY_PREDATOR_WOBBLE_MAX,
  NEARBY_PREDATOR_WOBBLE_STEP,
  PAIR_FORCE_MAX,
  PAIR_FORCE_MIN,
  PANIC_RAMP_MAX,
  PREDATOR_WOBBLE_FACTOR,
  PREY_WOBBLE_FACTOR,
} from "./config";
import { clamp, distance, normalize, subtract } from "./physics";
import type { InkObject, Vec2 } from "./types";

function isValidOpponent(object: InkObject, candidate: InkObject): boolean {
  return candidate.id !== object.id && candidate.role !== object.role && candidate.vanishElapsed === null;
}

export function findNearestOpponent(object: InkObject, objects: readonly InkObject[]): InkObject | null {
  let best: InkObject | null = null;
  let bestDistanceSquared = Number.POSITIVE_INFINITY;
  for (const candidate of objects) {
    if (!isValidOpponent(object, candidate)) continue;
    const dx = candidate.position.x - object.position.x;
    const dy = candidate.position.y - object.position.y;
    const distanceSquared = dx * dx + dy * dy;
    if (
      best === null ||
      distanceSquared < bestDistanceSquared ||
      (distanceSquared === bestDistanceSquared && candidate.id < best.id)
    ) {
      best = candidate;
      bestDistanceSquared = distanceSquared;
    }
  }
  return best;
}

function triggerTargetMotionBlend(object: InkObject): void {
  object.motionBlend = { from: { ...object.lastAcceleration }, elapsed: 0, duration: MOTION_BLEND_SECONDS };
}

export function updateTarget(object: InkObject, objects: readonly InkObject[]): InkObject | null {
  const nearest = findNearestOpponent(object, objects);
  const current =
    object.currentTargetId !== null
      ? (objects.find((c) => c.id === object.currentTargetId && isValidOpponent(object, c)) ?? null)
      : null;

  if (!nearest) {
    object.currentTargetId = null;
    return null;
  }
  if (!current) {
    triggerTargetMotionBlend(object);
    object.currentTargetId = nearest.id;
    return nearest;
  }
  if (current.id === nearest.id) return current;

  const currentDistance = distance(object.position, current.position);
  const nearestDistance = distance(object.position, nearest.position);
  if (nearestDistance < currentDistance * (1 - ANTI_FLICKER_SWITCH_THRESHOLD)) {
    triggerTargetMotionBlend(object);
    object.currentTargetId = nearest.id;
    return nearest;
  }
  return current;
}

export function nearbyPredatorCount(prey: InkObject, objects: readonly InkObject[]): number {
  let count = 0;
  for (const candidate of objects) {
    if (candidate.role !== "predator" || candidate.vanishElapsed !== null) continue;
    const threshold = (prey.radius + candidate.radius) * ATTRACTION_RAMP_START_MULTIPLIER;
    if (distance(prey.position, candidate.position) < threshold) count += 1;
  }
  return count;
}

export function nearbyPredatorWobbleMultiplier(prey: InkObject, objects: readonly InkObject[]): number {
  const count = nearbyPredatorCount(prey, objects);
  if (count <= 1) return 1;
  return clamp(1 + NEARBY_PREDATOR_WOBBLE_STEP * (count - 1), 1, NEARBY_PREDATOR_WOBBLE_MAX);
}

export function pairApproachRamp(object: InkObject, target: InkObject): number {
  const closeDistance = (object.radius + target.radius) * 2;
  const rampStart = (object.radius + target.radius) * ATTRACTION_RAMP_START_MULTIPLIER;
  const currentDistance = distance(object.position, target.position);
  const proximity = clamp(1 - (currentDistance - closeDistance) / (rampStart - closeDistance), 0, 1);
  return 1 + proximity * proximity * (ATTRACTION_RAMP_MAX - 1);
}

export function preyPanicRamp(object: InkObject, target: InkObject): number {
  const closeDistance = (object.radius + target.radius) * 2;
  const rampStart = (object.radius + target.radius) * ATTRACTION_RAMP_START_MULTIPLIER;
  const currentDistance = distance(object.position, target.position);
  const proximity = clamp(1 - (currentDistance - closeDistance) / (rampStart - closeDistance), 0, 1);
  return 1 + proximity * proximity * (PANIC_RAMP_MAX - 1);
}

function driveMultiplier(object: InkObject): number {
  return clamp(object.attractionValue, PAIR_FORCE_MIN, PAIR_FORCE_MAX);
}

function lateralWobbleScalar(object: InkObject, magnitude: number, wobbleFactor: number, now: number): number {
  const t = now / 1000 + object.wobblePhase;
  return Math.sin(t * object.wobbleFrequency * 1.7) * magnitude * wobbleFactor;
}

export function predatorAcceleration(object: InkObject, prey: InkObject, maxAcceleration: number, now: number): Vec2 {
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
  nearbyMultiplier = 1,
): Vec2 {
  const direction = normalize(subtract(object.position, predator.position));
  const magnitude = clamp(ATTRACTION_BASE_ACCELERATION * driveMultiplier(object), 0, maxAcceleration);
  const perpendicular = { x: -direction.y, y: direction.x };
  const panicRamp = preyPanicRamp(object, predator);
  const wobble = lateralWobbleScalar(object, magnitude, PREY_WOBBLE_FACTOR * panicRamp * nearbyMultiplier, now);
  return {
    x: direction.x * magnitude + perpendicular.x * wobble,
    y: direction.y * magnitude + perpendicular.y * wobble,
  };
}

export function idleAcceleration(
  object: InkObject,
  activeAnchor: Vec2 | null,
  isUnsafe: boolean,
  now: number,
): Vec2 {
  let x = 0;
  let y = 0;
  if (activeAnchor && isUnsafe) {
    const dx = activeAnchor.x - object.position.x;
    const dy = activeAnchor.y - object.position.y;
    x += clamp(dx * 0.05, -22, 22);
    y += clamp(dy * 0.05, -22, 22);
  }
  const t = now / 1000 + object.wobblePhase;
  const wobbleMagnitude = 10;
  x += Math.sin(t * object.wobbleFrequency * 1.7) * wobbleMagnitude;
  y += Math.cos(t * object.wobbleFrequency * 1.3) * wobbleMagnitude;
  return { x, y };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/lib/ink-ambient.test.ts`
Expected: PASS.

- [ ] **Step 6: Typecheck**

Run: `npx astro check`
Expected: no new errors (both `pairing.ts` and `targeting.ts` coexist and compile).

- [ ] **Step 7: Commit**

```bash
git add src/lib/ink-ambient/targeting.ts src/lib/ink-ambient/config.ts tests/lib/ink-ambient.test.ts
git commit -m "feat(ink-ambient): add continuous per-tick opponent targeting module"
```

---

### Task 5: The cutover — delete `pairing.ts`, wire everything into `InkAmbient.svelte`

This is the atomic removal-and-rebuild the spec calls for (§10: "expect the plan to restructure that file substantially rather than patch it incrementally"). `pairing.ts`'s public surface, `InkAmbient.svelte`'s simulation loop, `renderer.ts`'s draw call, and `PaperNav.svelte` are all interdependent on the same cutover — there is no meaningful intermediate state where splitting this further leaves the build green, so it is one task with many sequential steps rather than several reviewer-gated tasks.

**Files:**
- Modify: `src/lib/ink-ambient/types.ts` (remove `partnerId`/`formerPartnerId`)
- Delete: `src/lib/ink-ambient/pairing.ts`
- Modify: `src/lib/ink-ambient/config.ts` (append new constants)
- Modify: `src/lib/ink-ambient/renderer.ts`
- Modify: `src/components/svelte/InkAmbient.svelte`
- Modify: `src/components/svelte/PaperNav.svelte`
- Modify: `tests/lib/ink-ambient.test.ts` (remove all pairing-specific tests and the now-unused fields from the `object()` helper; fix remaining imports)

**Interfaces:**
- Consumes: everything produced by Tasks 1-4 (`population.ts`, `spawn.ts`, `catches.ts`, `lifecycle.ts` additions, `targeting.ts`).
- Produces: a working `InkAmbient.svelte` with no references to `pairing.ts`, `partnerId`, or `formerPartnerId` anywhere in the codebase.

- [ ] **Step 1: Append final config constants**

Add to the end of `src/lib/ink-ambient/config.ts`:

```ts
// Population top-up pacing (spec §8.3). PREDATOR_SPAWN_RAMP_SECONDS and
// PREDATOR_SPAWN_RAMP_START_FRACTION were already added in Task 3, alongside
// predatorSpawnRampMultiplier which consumes them.
export const POPULATION_TOPUP_MIN_DELAY_MS = 1500;
export const POPULATION_TOPUP_MAX_DELAY_MS = 3500;
```

- [ ] **Step 2: Remove `partnerId`/`formerPartnerId` from `types.ts`**

In `src/lib/ink-ambient/types.ts`, delete these two lines from the `InkObject` type:

```ts
  partnerId: number | null;
  formerPartnerId: number | null;
```

- [ ] **Step 3: Delete `pairing.ts`**

```bash
git rm src/lib/ink-ambient/pairing.ts
```

- [ ] **Step 4: Clean up `tests/lib/ink-ambient.test.ts`**

Remove the `formPair`, `formInitialPairs`, `detachPair`, `reevaluatePartner` import line from `@/lib/ink-ambient/pairing` (targeting/catches/population/lifecycle imports from Tasks 1-4 already cover the replacements — `pairApproachRamp`, `preyPanicRamp`, `predatorAcceleration`, `preyAcceleration` now come from `@/lib/ink-ambient/targeting` instead, so update that import's source path).

Remove `partnerId: null,` and `formerPartnerId: null,` from the `object()` helper (the four Task-3 fields — `currentTargetId`, `lives`, `hungerElapsed`, `vanishElapsed` — stay).

Delete these `it(...)` blocks entirely (all exercised deleted `pairing.ts` functions with no replacement — their behaviors are superseded by Task 4's `targeting.ts` tests):
- `"pairs the nearest available objects into mutual bonds"`
- `"leaves a lone object unpaired without throwing"`
- `"re-forms the same pair after a detach and release with only two objects"`
- `"assigns one predator and one prey with predator always faster"`
- `"pins the thrown object's chaseSpeed to its throw velocity instead of rolling fresh"`
- `"keeps the thrown object's role sticky across a throw instead of re-flipping"`
- `"recalibration never lets a gently-thrown predator end up slower than its prey"`
- `"reshuffles the old partner with a nearby lone object when a throw forms a new pair"`

Keep `"ramps the approach multiplier up as a pair closes in, capped near touching"`, `"ramps prey panic-wobble amplitude up as the predator closes in"`, `"steers the predator toward the prey"`, and `"steers the prey away from the predator"` — they still test valid behavior, just against `targeting.ts` now instead of `pairing.ts`.

- [ ] **Step 5: Run the test suite to confirm the remaining tests pass**

Run: `npx vitest run tests/lib/ink-ambient.test.ts`
Expected: PASS — every remaining test (Tasks 1-4's new tests plus the surviving pre-existing ones).

- [ ] **Step 6: Rewrite `makeObject` in `InkAmbient.svelte`**

Add imports at the top of `InkAmbient.svelte`'s `<script>` block:

```ts
import { rollRadius, rollChaseSpeed } from "@/lib/ink-ambient/spawn";
import {
  updateTarget,
  nearbyPredatorWobbleMultiplier,
  pairApproachRamp,
  predatorAcceleration,
  preyAcceleration,
  idleAcceleration,
} from "@/lib/ink-ambient/targeting";
import { resolveCatches } from "@/lib/ink-ambient/catches";
import { stepLotkaVolterra, mapToTargets, type PopulationState } from "@/lib/ink-ambient/population";
import {
  updateSpawnFade,
  updateVanish,
  applyPredatorSurvivalTick,
  predatorSpawnRampMultiplier,
} from "@/lib/ink-ambient/lifecycle";
```

`InkAmbient.svelte` only calls `updateTarget` (which internally calls `findNearestOpponent` from `targeting.ts`) — it never needs to import `findNearestOpponent` directly.

Delete the old `import { detachPair, formInitialPairs, idleAcceleration, pairApproachRamp, predatorAcceleration, preyAcceleration, reevaluatePartner } from "@/lib/ink-ambient/pairing";` block entirely.

Add to the existing `import { ... } from "@/lib/ink-ambient/config"` block: `PREDATOR_LIVES_START`, `PREDATOR_RADIUS_MAX`, `PREY_RADIUS_MAX`, `POPULATION_TOPUP_MIN_DELAY_MS`, `POPULATION_TOPUP_MAX_DELAY_MS`, `VANISH_DURATION_SECONDS`. (`PREDATOR_STARVE_SECONDS`, `PREDATOR_SPAWN_RAMP_SECONDS`, and `PREDATOR_SPAWN_RAMP_START_FRACTION` are consumed inside `lifecycle.ts`'s new pure functions from Task 3, not directly in this file.)

Replace the whole `makeObject` function with:

```ts
function makeObject(
  id: number,
  position: Vec2,
  rng: SeededRng,
  now: number,
  role: "predator" | "prey",
): InkObject {
  const attractionValue = rng.range(ATTRACTION_VALUE_MIN, ATTRACTION_VALUE_MAX);
  return {
    id,
    position: { ...position },
    velocity: { x: rng.range(-18, 18), y: rng.range(-12, 12) },
    radius: rollRadius(role, rng),
    mass: rng.range(0.7, 1.5),
    rotation: rng.range(-Math.PI, Math.PI),
    angularVelocity: rng.range(-0.25, 0.25),
    opacity: 0.01,
    scale: { x: rng.range(0.86, 1.14), y: rng.range(0.86, 1.14) },
    variant: rng.int(0, 1),
    lifecycle: "spawning",
    rngState: rng.state,
    spawnAt: now,
    effectCooldown: 0,
    squashCooldown: 0,
    grabbed: false,
    lastAcceleration: { x: 0, y: 0 },
    smoothedAngularVelocity: 0,
    unsafeElapsed: 0,
    wobbleFrequency: rng.range(0.8, 1.6),
    wobblePhase: rng.range(0, Math.PI * 2),
    trail: [],
    trailSampleTimer: 0,
    currentTargetId: null,
    role,
    chaseSpeed: rollChaseSpeed(role, attractionValue, rng),
    attractionValue,
    motionBlend: null,
    lives: PREDATOR_LIVES_START,
    hungerElapsed: 0,
    vanishElapsed: null,
  };
}
```

- [ ] **Step 7: Run the test suite and typecheck after Step 6**

Run: `npx vitest run` then `npx astro check`.
Expected: vitest still PASS (component changes aren't unit-tested); astro check will show errors from the now-stale `spawnFreshBatch`/`restoreObjects`/`updateObject`/`updateSimulation`/`pointerMove`/`releasePointer` call sites that still reference the old `makeObject` signature and deleted pairing functions — that's expected and gets fixed in the remaining steps of this task before the final commit.

- [ ] **Step 8: Replace `spawnFreshBatch` with `spawnInitialBatch`, and add the top-up helpers**

Replace the whole `spawnFreshBatch` function with:

```ts
function spawnInitialBatch(now: number): void {
  if (!field) return;
  const target = targetPopulation();
  while (objects.length < target) {
    const role: "predator" | "prey" = rng.chance(0.5) ? "predator" : "prey";
    const radius = role === "predator" ? PREDATOR_RADIUS_MAX : PREY_RADIUS_MAX;
    const avoid = objects.map((object) => object.position);
    const position =
      findSafePointNearCorner(field, radius, rng, objects.length, avoid) ??
      findSafePoint(field, radius, rng, avoid);
    if (!position) break;
    objects.push(makeObject(nextObjectId++, position, rng, now, role));
  }
}

function countAlive(role: "predator" | "prey"): number {
  return objects.filter((object) => object.role === role && object.vanishElapsed === null).length;
}

function spawnOne(role: "predator" | "prey", now: number): boolean {
  if (!field) return false;
  const radius = role === "predator" ? PREDATOR_RADIUS_MAX : PREY_RADIUS_MAX;
  const avoid = objects.map((object) => object.position);
  const position =
    findSafePointNearCorner(field, radius, rng, objects.length, avoid) ??
    findSafePoint(field, radius, rng, avoid);
  if (!position) return false;
  objects.push(makeObject(nextObjectId++, position, rng, now, role));
  return true;
}

function deviceCapMax(): number {
  return pointer.fine && width >= 720 ? MAX_OBJECTS_DESKTOP : MAX_OBJECTS_MOBILE;
}

function topUpPopulation(now: number, forceImmediate = false): void {
  if (!field) return;
  const targets = mapToTargets(population);
  const perRoleCap = Math.max(1, Math.floor(deviceCapMax() / 2));
  const preyTarget = Math.min(targets.preyTarget, perRoleCap);
  const predatorTarget = Math.min(targets.predatorTarget, perRoleCap);

  while (countAlive("prey") < preyTarget && (forceImmediate || now >= nextPreySpawnAt)) {
    if (!spawnOne("prey", now)) break;
    nextPreySpawnAt = now + rng.range(POPULATION_TOPUP_MIN_DELAY_MS, POPULATION_TOPUP_MAX_DELAY_MS);
    if (!forceImmediate) break;
  }
  while (countAlive("predator") < predatorTarget && (forceImmediate || now >= nextPredatorSpawnAt)) {
    if (!spawnOne("predator", now)) break;
    nextPredatorSpawnAt = now + rng.range(POPULATION_TOPUP_MIN_DELAY_MS, POPULATION_TOPUP_MAX_DELAY_MS);
    if (!forceImmediate) break;
  }
}
```

Add two new module-level `let` declarations alongside the existing `let activeAnchor: Vec2 | null = null;` line: `let nextPreySpawnAt = 0;`, `let nextPredatorSpawnAt = 0;`, and `let population: PopulationState = { prey: 1.5, predator: 0.7 };` (a starting state displaced from the `prey*=predator*=1` equilibrium so the cycle actually oscillates instead of sitting still — see Task 1's config comment).

- [ ] **Step 9: Update `restoreObjects` for the new `makeObject` signature**

Replace the body of `restoreObjects` with:

```ts
function restoreObjects(): void {
  if (!snapshot || !field) return;
  for (const saved of snapshot.objects.slice(
    0,
    pointer.fine ? MAX_OBJECTS_DESKTOP : MAX_OBJECTS_MOBILE,
  )) {
    const savedPosition = {
      x: saved.position.x * width,
      y: saved.position.y * height,
    };
    const position = isSafePoint(field, savedPosition, 24)
      ? savedPosition
      : findSafePoint(
          field,
          24,
          rng,
          objects.map((object) => object.position),
        );
    if (!position) continue;
    const role: "predator" | "prey" = rng.chance(0.5) ? "predator" : "prey";
    const object = makeObject(saved.id, position, rng, performance.now(), role);
    nextObjectId = Math.max(nextObjectId, saved.id + 1);
    object.velocity = {
      x: saved.velocity.x * width,
      y: saved.velocity.y * height,
    };
    object.attractionValue = saved.attractionValue;
    // Re-roll chaseSpeed from the restored attractionValue — makeObject already
    // rolled one from a freshly-generated attractionValue before we overwrote it.
    object.chaseSpeed = rollChaseSpeed(role, object.attractionValue, rng);
    object.rngState = saved.rngState;
    objects.push(object);
  }
}
```

- [ ] **Step 10: Rewrite `updateObject`**

Replace the whole `updateObject` function with:

```ts
function updateObject(object: InkObject, dt: number, now: number): void {
  object.effectCooldown = Math.max(0, object.effectCooldown - dt);
  object.squashCooldown = Math.max(0, object.squashCooldown - dt);
  updateSpawnFade(object, now, dt);
  applyPredatorSurvivalTick(object, dt);

  if (object.vanishElapsed !== null) {
    updateVanish(object, dt);
    return;
  }

  if (object.grabbed) {
    // Still track the trail while dragged: object.position is synced to the
    // pointer in pointerMove, so this samples the real cursor trajectory
    // instead of freezing until release.
    updateTrail(object, dt);
    return;
  }

  const settling = object.lifecycle === "spawning";
  const massT = massFraction(object.mass);
  const maxAccel =
    ATTRACTION_MAX_ACCELERATION_LIGHT +
    (ATTRACTION_MAX_ACCELERATION_HEAVY - ATTRACTION_MAX_ACCELERATION_LIGHT) * massT;

  const target = updateTarget(object, objects);

  const isUnsafe = Boolean(field) && !isSafePoint(field!, object.position, object.radius);
  object.unsafeElapsed = isUnsafe ? object.unsafeElapsed + dt : 0;

  let acceleration =
    target && !settling
      ? object.role === "predator"
        ? predatorAcceleration(object, target, maxAccel, now)
        : preyAcceleration(object, target, maxAccel, now, nearbyPredatorWobbleMultiplier(object, objects))
      : idleAcceleration(object, activeAnchor, isUnsafe, now);

  if (object.motionBlend) {
    object.motionBlend.elapsed += dt;
    const t = clamp(object.motionBlend.elapsed / object.motionBlend.duration, 0, 1);
    acceleration = {
      x: object.motionBlend.from.x + (acceleration.x - object.motionBlend.from.x) * t,
      y: object.motionBlend.from.y + (acceleration.y - object.motionBlend.from.y) * t,
    };
    if (t >= 1) object.motionBlend = null;
  }

  const boundary = boundarySteeringForce(object, width, height);
  acceleration.x += boundary.x;
  acceleration.y += boundary.y;
  const repulsion = obstacleRepulsion(object, obstacles, SAFE_CLEARANCE);
  acceleration.x += repulsion.x;
  acceleration.y += repulsion.y;

  if (activeAnchor && object.unsafeElapsed > TRAPPED_ESCAPE_SECONDS) {
    acceleration = scaleVector(
      normalize(subtract(activeAnchor, object.position)),
      TRAPPED_ESCAPE_ACCELERATION,
    );
  }

  object.lastAcceleration = { x: acceleration.x, y: acceleration.y };
  applyDrag(object, 0.06, dt);
  integrate(object, acceleration, dt);
  const rotationDelta = applyHeadingRotation(object, dt);
  const spawnRamp = object.role === "predator" ? predatorSpawnRampMultiplier(object, now) : 1;
  const maxSpeed =
    target && !settling
      ? object.role === "predator"
        ? Math.min(object.chaseSpeed * pairApproachRamp(object, target) * spawnRamp, PREDATOR_MAX_RAMPED_SPEED)
        : object.chaseSpeed
      : 155 - (155 - 115) * massT;
  object.velocity = limit(object.velocity, maxSpeed);
  object.scale.x += (1 - object.scale.x) * Math.min(1, dt * 5);
  object.scale.y += (1 - object.scale.y) * Math.min(1, dt * 5);
  if (object.squashCooldown <= 0) {
    const turnFactor = updateTurnSquash(object, rotationDelta, dt);
    object.scale.x += (1 - turnFactor - object.scale.x) * Math.min(1, dt * 8);
    object.scale.y += (1 + turnFactor - object.scale.y) * Math.min(1, dt * 8);
  }
  clampToViewport(object, width, height);
  updateTrail(object, dt);
}
```

Note the spawn-ramp multiplier only ever grows toward 1 as `now - object.spawnAt` increases — since `spawnAt` is set once at creation and never reset for a surviving predator, this naturally satisfies spec §6.1's "a predator that's been alive and hunting for hours doesn't re-ramp" without any extra bookkeeping field.

- [ ] **Step 11: Rewrite `updateSimulation`**

Replace the whole `updateSimulation` function with:

```ts
function updateSimulation(dt: number, now: number): void {
  if (geometryDirty) refreshGeometry();
  pausedByModal = hasOpenModal();
  if (pausedByModal) return;

  for (const object of objects) updateObject(object, dt, now);

  const catchResult = resolveCatches(objects);
  for (const id of catchResult.winnerIds) {
    const winner = objects.find((object) => object.id === id);
    if (winner) winner.hungerElapsed = 0;
  }
  for (const id of catchResult.loserIds) {
    const loser = objects.find((object) => object.id === id);
    if (loser && loser.vanishElapsed === null) {
      loser.lives -= 1;
      if (loser.lives <= 0) loser.vanishElapsed = 0;
    }
  }
  for (const burst of catchResult.bursts) addBurstEffect(burst.x, burst.y, burst.radius);

  for (let first = 0; first < objects.length; first += 1) {
    for (let second = first + 1; second < objects.length; second += 1) {
      const a = objects[first];
      const b = objects[second];
      if (catchResult.destroyedPreyIds.has(a.id) || catchResult.destroyedPreyIds.has(b.id)) continue;
      const collision = resolveCircleCollision(a, b, rng.range(-0.08, 0.08));
      if (collision.hit) {
        const squash = clamp(collision.impulse / 90, 0.02, 0.22);
        if (a.squashCooldown <= 0) {
          a.scale.x = 1 + squash;
          a.scale.y = 1 - squash;
          a.squashCooldown = 0.18;
        }
        if (b.squashCooldown <= 0) {
          b.scale.x = 1 + squash;
          b.scale.y = 1 - squash;
          b.squashCooldown = 0.18;
        }
        addCollisionEffect(a);
        addCollisionEffect(b);
      }
    }
  }

  const readyForRemoval = new Set<number>(catchResult.destroyedPreyIds);
  for (const object of objects) {
    if (object.vanishElapsed !== null && object.vanishElapsed >= VANISH_DURATION_SECONDS) {
      readyForRemoval.add(object.id);
    }
  }
  if (readyForRemoval.size > 0) {
    for (let index = objects.length - 1; index >= 0; index -= 1) {
      if (readyForRemoval.has(objects[index].id)) objects.splice(index, 1);
    }
  }

  updateEffects(dt);

  population = stepLotkaVolterra(population, dt);
  topUpPopulation(now);
}
```

This drops the old `mutuallyPaired` branch entirely (there is no pairing left to be mutual about) — every surviving overlapping pair, predator-prey included, now always gets the generic squash/collision-effect treatment unless one side was just destroyed by a catch this same tick. It also drops the old `if (objects.length === 0) spawnFreshBatch(now);` tail — population is now topped up continuously every tick via `topUpPopulation`, never waiting for a full die-off.

- [ ] **Step 12: Simplify the pointer handlers**

In `pointerMove`, inside the `if (!pointer.dragStarted) { ... }` block, delete the `detachPair(object, objects);` line — dragging no longer detaches anything (there's nothing to detach). The block becomes:

```ts
    if (!pointer.dragStarted) {
      const moved = Math.hypot(
        pointer.x - pointer.downX,
        pointer.y - pointer.downY,
      );
      if (moved < 5) return;
      pointer.dragStarted = true;
      object.grabbed = true;
    }
```

Replace the whole `releasePointer` function with:

```ts
function releasePointer(throwObject: boolean): void {
  if (pointer.grabbedId === null) return;
  const object = objects.find(
    (candidate) => candidate.id === pointer.grabbedId,
  );
  if (object) {
    object.grabbed = false;
    if (pointer.dragStarted && throwObject) {
      object.velocity.x = clamp(pointer.velocityX, -260, 260);
      object.velocity.y = clamp(pointer.velocityY, -260, 260);
    }
  }
  pointer.id = null;
  pointer.grabbedId = null;
  pointer.dragStarted = false;
}
```

This drops the old `reevaluatePartner(object, objects, rng);` call — the very next simulation tick after release calls `updateTarget` for this object anyway (since `object.grabbed` is now `false`), so no explicit re-evaluation step is needed. This matches spec §4.2's "a drag/throw no longer recalibrates anything — it only changes position/velocity."

- [ ] **Step 13: Fix the two remaining call sites in `onMount`'s setup sequence**

Change `spawnFreshBatch(performance.now());` to `spawnInitialBatch(performance.now());` in the `onMount` setup sequence (the block right before `const sectionObserver = ...`).

- [ ] **Step 14: Add the manual top-up event listener**

Alongside the existing `const onInkAmbientChange = (event: Event) => { ... };` declaration, add:

```ts
  const onInkAmbientTopup = () => {
    topUpPopulation(performance.now(), true);
  };
```

Alongside `window.addEventListener("ink-ambient-change", onInkAmbientChange);`, add:

```ts
  window.addEventListener("ink-ambient-topup", onInkAmbientTopup);
```

Alongside `window.removeEventListener("ink-ambient-change", onInkAmbientChange);` in the `onMount` cleanup return function, add:

```ts
    window.removeEventListener("ink-ambient-topup", onInkAmbientTopup);
```

- [ ] **Step 15: Multiply lives/hunger fade into `renderer.ts`'s draw opacity**

In `src/lib/ink-ambient/renderer.ts`, change the import line `import { isPenLike, tipPosition, trailMaxAge } from "./physics";` to also pull in the new lifecycle helper:

```ts
import { isPenLike, tipPosition, trailMaxAge } from "./physics";
import { renderedOpacityMultiplier } from "./lifecycle";
```

In the `draw()` method, the existing block:

```ts
      const opacity = obstacleOpacity(
        { position: object.position, radius: renderedRadius },
        obstacles,
      );
      if (opacity <= 0) continue;
```

becomes:

```ts
      const opacity = obstacleOpacity(
        { position: object.position, radius: renderedRadius },
        obstacles,
      );
      const fadeMultiplier = renderedOpacityMultiplier(object);
      if (opacity <= 0 || fadeMultiplier <= 0) continue;
```

And the line `this.context.globalAlpha = object.opacity * opacity;` becomes:

```ts
      this.context.globalAlpha = object.opacity * opacity * fadeMultiplier;
```

- [ ] **Step 16: Add the top-up button to `PaperNav.svelte`**

In `src/components/svelte/PaperNav.svelte`, inside the `<div class="flex items-center gap-2">` block, add a new button between the existing ink-ambient toggle button and the theme toggle button (visually identical styling, per spec §8.3):

```svelte
        <button
          onclick={() => window.dispatchEvent(new CustomEvent("ink-ambient-topup"))}
          aria-label="Top up ink ambient population"
          class="lift grid h-8 w-8 cursor-pointer place-items-center border-[1.5px] border-ink bg-paper-raised text-sm text-ink shadow-hard-sm"
        >
          ⟳
        </button>
```

No local state needed — this mirrors how the existing `ink-ambient-change` dispatch in `toggleInkAmbient` is fire-and-forget.

- [ ] **Step 17: Run the Svelte autofixer**

Per this project's `CLAUDE.md`, any Svelte code must be run through the Svelte MCP `svelte-autofixer` before being considered done. Run it against both changed files:

```
svelte-autofixer on src/components/svelte/InkAmbient.svelte
svelte-autofixer on src/components/svelte/PaperNav.svelte
```

(Or the CLI equivalent: `npx -y @sveltejs/mcp svelte-autofixer <path>` if the MCP server isn't connected in this environment.) Repeat until no issues or suggestions remain, applying any fixes it proposes.

- [ ] **Step 18: Full typecheck and test run**

Run: `npx astro check`
Expected: zero errors — confirms no leftover references to `pairing.ts`, `partnerId`, or `formerPartnerId` anywhere in the codebase.

Run: `npx vitest run`
Expected: all tests PASS.

Run (repo-wide grep, should return nothing):
```bash
grep -rn "partnerId\|formerPartnerId\|from \"@/lib/ink-ambient/pairing\"\|from \"./pairing\"" src/ tests/
```

- [ ] **Step 19: Commit**

```bash
git add -A src/lib/ink-ambient/ src/components/svelte/InkAmbient.svelte src/components/svelte/PaperNav.svelte tests/lib/ink-ambient.test.ts
git commit -m "feat(ink-ambient): cut over to continuous targeting, lives/hunger, and LV population dynamics"
```

---

### Task 6: Whole-plan review and manual visual verification

None of `InkAmbient.svelte`'s runtime behavior (chase feel, catch resolution, vanish fade, population breathing, top-up button) is covered by the automated test suite — the existing repo convention only unit-tests the pure `src/lib/ink-ambient/*.ts` logic, never the Svelte component itself. This task is the manual gate that the original chase-feature build also used (final whole-plan review + fix wave), and it's where the Lotka-Volterra constants (`LV_ALPHA/BETA/GAMMA/DELTA`, `LV_SCALE`) and top-up pacing (`POPULATION_TOPUP_MIN/MAX_DELAY_MS`) from Task 1/5 get tuned by feel, per spec §8.1's explicit allowance ("tuned... iterating in the browser").

**Files:** none new — this task only touches `config.ts` constant values if tuning is needed, based on what's observed.

- [ ] **Step 1: Full regression pass**

Run: `npx vitest run` and `npx astro check`.
Expected: both clean, zero failures/errors.

- [ ] **Step 2: Start the dev server and observe the ecosystem**

Run: `npm run dev` (or use the `run` skill if available), then open the home page in a browser (or via the Claude-in-Chrome / Playwright tools) and observe for at least 60 seconds:

- Predators (pen) continuously retarget whichever prey (pencil) is nearest, including switching targets when a closer one appears — not just chasing one fixed partner.
- A caught prey vanishes with the existing ink-blot burst; the catching predator survives and keeps moving.
- Dragging a predator near a different prey (even one another predator is chasing) makes it immediately steer toward the new nearest prey.
- A predator that goes a long time without a catch visibly dims (opacity fade) before vanishing (shrink+fade) after ~16s of no catches — trigger this deliberately by dragging all prey far from one predator and waiting.
- Multiple predators converging on one prey visibly increases that prey's wobble/panic amplitude.
- Population count breathes over time (roughly a 20-40s cycle) rather than staying pinned at a constant number — watch for a period where prey or predator count visibly grows and shrinks.
- Clicking the new nav top-up button (⟳, next to the theme toggle) immediately restores population toward the current target without waiting for the normal spawn delay.

- [ ] **Step 3: Tune constants based on what's observed**

If the population cycle feels too fast/slow, adjust `LV_ALPHA`/`LV_BETA`/`LV_GAMMA`/`LV_DELTA` in `config.ts` (increasing all four proportionally shortens the cycle; decreasing lengthens it) and re-observe. If top-up feels too eager/sluggish, adjust `POPULATION_TOPUP_MIN_DELAY_MS`/`POPULATION_TOPUP_MAX_DELAY_MS`. If the starve fade-to-vanish timing feels off, adjust `PREDATOR_STARVE_SECONDS`. Re-run Step 1 after any constant change.

- [ ] **Step 4: Fix wave**

If Step 2's manual pass surfaces any bug (e.g., a predator never vanishing, targets flickering despite the anti-flicker threshold, population never growing back after a die-off), fix it directly in the relevant module from Tasks 1-5, add a regression test to `tests/lib/ink-ambient.test.ts` if the bug was in a pure-logic module, and re-run Step 1.

- [ ] **Step 5: Final commit (only if Steps 3-4 changed anything)**

```bash
git add -A src/lib/ink-ambient/
git commit -m "fix(ink-ambient): tune population/starve constants from manual verification"
```

- [ ] **Step 6: Report back**

Summarize what was verified and any constants that were tuned. This closes out the ecosystem redesign build — the only remaining item from the broader session goal is the still-open branch-finishing decision (merge/PR/keep), which should be raised separately once this plan is fully executed.
