import { describe, expect, it, beforeEach } from "vitest";
import {
  PREDATOR_RADIUS_MAX,
  PREDATOR_RADIUS_MIN,
  PREY_RADIUS_MAX,
  PREY_RADIUS_MIN,
  PREY_SPEED_MAX,
  PREY_SPEED_MIN,
  SNAPSHOT_KEY,
} from "@/lib/ink-ambient/config";
import { rollRadius, rollChaseSpeed } from "@/lib/ink-ambient/spawn";
import {
  buildSpatialField,
  availableCapacity,
  findSafePoint,
  findSafePointNearCorner,
} from "@/lib/ink-ambient/spatial-field";
import { SeededRng } from "@/lib/ink-ambient/rng";
import {
  applyHeadingRotation,
  boundarySteeringForce,
  circlesOverlap,
  clampToViewport,
  fixedStepAccumulator,
  nearestPointOnRect,
  obstacleRepulsion,
  resolveCircleCollision,
  updateTurnSquash,
} from "@/lib/ink-ambient/physics";
import { loadSnapshot, saveSnapshot } from "@/lib/ink-ambient/persistence";
import { stepLotkaVolterra, mapToTargets } from "@/lib/ink-ambient/population";
import { resolveCatches } from "@/lib/ink-ambient/catches";
import {
  livesFadeStep,
  renderedOpacityMultiplier,
  updateVanish,
  applyPredatorSurvivalTick,
  predatorSpawnRampMultiplier,
} from "@/lib/ink-ambient/lifecycle";
import type { InkObject } from "@/lib/ink-ambient/types";
import {
  findNearestOpponent,
  updateTarget,
  nearbyPredatorCount,
  nearbyPredatorWobbleMultiplier,
  pairApproachRamp,
  preyPanicRamp,
  predatorAcceleration,
  preyAcceleration,
} from "@/lib/ink-ambient/targeting";

function object(id: number, x: number, y: number): InkObject {
  return {
    id,
    position: { x, y },
    velocity: { x: 0, y: 0 },
    radius: 20,
    mass: 1,
    rotation: 0,
    angularVelocity: 0,
    opacity: 1,
    scale: { x: 1, y: 1 },
    variant: 0,
    lifecycle: "active",
    rngState: 1,
    spawnAt: 0,
    effectCooldown: 0,
    squashCooldown: 0,
    grabbed: false,
    lastAcceleration: { x: 0, y: 0 },
    smoothedAngularVelocity: 0,
    unsafeElapsed: 0,
    wobbleFrequency: 1,
    wobblePhase: 0,
    trail: [],
    trailSampleTimer: 0,
    currentTargetId: null,
    lives: 3,
    hungerElapsed: 0,
    vanishElapsed: null,
    role: null,
    chaseSpeed: 0,
    attractionValue: 1,
    motionBlend: null,
  };
}

describe("Ink Ambient primitives", () => {
  beforeEach(() => sessionStorage.clear());

  it("produces deterministic seeded random choices", () => {
    const first = new SeededRng(42);
    const second = new SeededRng(42);
    expect(Array.from({ length: 6 }, () => first.next())).toEqual(
      Array.from({ length: 6 }, () => second.next()),
    );
  });

  it("resolves overlapping objects and separates their velocities", () => {
    const first = object(1, 100, 100);
    const second = object(2, 130, 100);
    second.velocity.x = -20;
    const result = resolveCircleCollision(first, second);
    expect(result.hit).toBe(true);
    expect(result.impulse).toBeGreaterThan(0);
    expect(
      Math.hypot(second.position.x - first.position.x, second.position.y - first.position.y),
    ).toBeGreaterThanOrEqual(40);
    expect(first.velocity.x).toBeLessThan(0);
    expect(second.velocity.x - first.velocity.x).toBeGreaterThan(0);
  });

  it("scales collision impulse with impact speed", () => {
    const soft = resolveCircleCollision(object(1, 100, 100), {
      ...object(2, 130, 100),
      velocity: { x: -5, y: 0 },
    });
    const hard = resolveCircleCollision(object(1, 100, 100), {
      ...object(2, 130, 100),
      velocity: { x: -80, y: 0 },
    });
    expect(hard.impulse).toBeGreaterThan(soft.impulse);
  });

  it("steers away from the boundary and hard-clamps at the edge", () => {
    const near = object(1, 5, 100);
    const force = boundarySteeringForce(near, 800, 600);
    expect(force.x).toBeGreaterThan(0);
    const outside = object(2, -50, 700);
    clampToViewport(outside, 800, 600);
    expect(outside.position.x).toBeGreaterThanOrEqual(outside.radius);
    expect(outside.position.y).toBeLessThanOrEqual(600 - outside.radius);
  });

  it("rotates toward the direction of travel", () => {
    const moving = object(1, 100, 100);
    moving.velocity = { x: 50, y: 0 };
    applyHeadingRotation(moving, 1);
    expect(moving.rotation).toBeCloseTo(0, 1);
  });

  it("caps fixed-step catch-up work", () => {
    let updates = 0;
    const remaining = fixedStepAccumulator(1, 0, 1 / 60, 3, () => updates++);
    expect(updates).toBe(3);
    expect(remaining).toBeLessThan(1 / 60);
  });

  it("finds safe points outside expanded obstacles", () => {
    const field = buildSpatialField(
      1000,
      700,
      [{ x: 0, y: 0, width: 700, height: 700 }],
      {
        name: "right",
        edgeBias: "right",
        regions: [{ x: 0.72, y: 0, width: 0.28, height: 1 }],
      },
      16,
    );
    const point = findSafePoint(field, 16, new SeededRng(3));
    expect(point).not.toBeNull();
    expect(point!.x).toBeGreaterThan(700);
  });

  it("biases spawn points toward the four corners for maximum spread", () => {
    const field = buildSpatialField(
      1000,
      800,
      [],
      { name: "open", edgeBias: "none", regions: [{ x: 0, y: 0, width: 1, height: 1 }] },
      16,
    );
    const rng = new SeededRng(11);
    const topLeft = findSafePointNearCorner(field, 16, rng, 0);
    const bottomRight = findSafePointNearCorner(field, 16, rng, 1);
    const topRight = findSafePointNearCorner(field, 16, rng, 2);
    const bottomLeft = findSafePointNearCorner(field, 16, rng, 3);

    expect(topLeft!.x).toBeLessThan(500);
    expect(topLeft!.y).toBeLessThan(400);
    expect(bottomRight!.x).toBeGreaterThan(500);
    expect(bottomRight!.y).toBeGreaterThan(400);
    expect(topRight!.x).toBeGreaterThan(500);
    expect(topRight!.y).toBeLessThan(400);
    expect(bottomLeft!.x).toBeLessThan(500);
    expect(bottomLeft!.y).toBeGreaterThan(400);
  });

  it("round-trips a bounded approximate snapshot", () => {
    const first = object(1, 80, 90);
    first.velocity.x = 12;
    first.attractionValue = 1.2;
    saveSnapshot(123, [first], { width: 160, height: 180 }, 1000);
    const snapshot = loadSnapshot(1001);
    expect(snapshot?.seed).toBe(123);
    expect(snapshot?.objects[0].position).toEqual({ x: 0.5, y: 0.5 });
    expect(snapshot?.objects[0].velocity.x).toBe(0.075);
    expect(snapshot?.objects[0].attractionValue).toBe(1.2);
  });

  it("rejects expired snapshots", () => {
    const first = object(1, 80, 90);
    saveSnapshot(123, [first], { width: 160, height: 180 }, 1000);
    expect(loadSnapshot(1000 + 1000 * 60 * 60 * 13)).toBeNull();
  });

  it("rejects duplicate object identifiers in a persisted snapshot", () => {
    const first = object(1, 80, 90);
    saveSnapshot(123, [first, first], { width: 160, height: 180 }, 1000);
    expect(loadSnapshot(1001)).toBeNull();
  });

  it("rejects snapshots from an older schema version", () => {
    sessionStorage.setItem(
      SNAPSHOT_KEY,
      JSON.stringify({ version: 1, seed: 1, savedAt: Date.now(), objects: [] }),
    );
    expect(loadSnapshot()).toBeNull();
  });

  it("does not count a narrow obstacle gap as capacity for a large object", () => {
    const field = buildSpatialField(
      400,
      300,
      [
        { x: 0, y: 0, width: 170, height: 300 },
        { x: 230, y: 0, width: 170, height: 300 },
      ],
      {
        name: "middle",
        edgeBias: "none",
        regions: [{ x: 0, y: 0, width: 1, height: 1 }],
      },
      12,
    );
    expect(availableCapacity(field, 32)).toBe(0);
  });

  it("finds the nearest point on a rectangle and repels an object approaching it", () => {
    const rect = { x: 100, y: 100, width: 50, height: 50 };
    expect(nearestPointOnRect({ x: 80, y: 120 }, rect)).toEqual({ x: 100, y: 120 });

    const near = object(1, 95, 120);
    const push = obstacleRepulsion(near, [rect], 18);
    expect(push.x).toBeLessThan(0);

    const far = object(2, 500, 500);
    const noPush = obstacleRepulsion(far, [rect], 18);
    expect(noPush).toEqual({ x: 0, y: 0 });
  });

  it("smooths turn-squash from angular velocity into a bounded factor", () => {
    const turning = object(1, 100, 100);
    const factor = updateTurnSquash(turning, Math.PI / 2, 1 / 60);
    expect(factor).toBeGreaterThan(0);
    expect(factor).toBeLessThanOrEqual(0.12);
    expect(turning.smoothedAngularVelocity).toBeGreaterThan(0);

    for (let i = 0; i < 500; i += 1) updateTurnSquash(turning, Math.PI / 2, 1 / 60);
    expect(turning.smoothedAngularVelocity).toBeLessThanOrEqual(8);
  });

  it("ramps the approach multiplier up as a pair closes in, capped near touching", () => {
    const anchor = object(1, 0, 0);
    const far = object(2, 1000, 0);
    const near = object(3, 90, 0);
    const touching = object(4, 45, 0);

    const farRamp = pairApproachRamp(anchor, far);
    const nearRamp = pairApproachRamp(anchor, near);
    const touchingRamp = pairApproachRamp(anchor, touching);

    expect(farRamp).toBe(1);
    expect(nearRamp).toBeGreaterThan(farRamp);
    expect(touchingRamp).toBeGreaterThan(nearRamp);
    expect(touchingRamp).toBeLessThanOrEqual(2.4);
  });

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

  it("detects circle overlap consistently with resolveCircleCollision's own check", () => {
    const overlappingA = object(1, 100, 100);
    const overlappingB = object(2, 130, 100);
    expect(circlesOverlap(overlappingA, overlappingB)).toBe(true);
    expect(resolveCircleCollision(overlappingA, overlappingB).hit).toBe(true);

    const farA = object(3, 100, 100);
    const farB = object(4, 300, 100);
    expect(circlesOverlap(farA, farB)).toBe(false);
    expect(resolveCircleCollision(farA, farB).hit).toBe(false);
  });
});

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
