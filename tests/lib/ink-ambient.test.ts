import { describe, expect, it, beforeEach } from "vitest";
import {
  PREDATOR_RADIUS_MAX,
  PREDATOR_RADIUS_MIN,
  PREDATOR_SPEED_MULTIPLIER_MIN,
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
import {
  detachPair,
  formInitialPairs,
  formPair,
  pairApproachRamp,
  predatorAcceleration,
  preyAcceleration,
  preyPanicRamp,
  reevaluatePartner,
} from "@/lib/ink-ambient/pairing";
import { loadSnapshot, saveSnapshot } from "@/lib/ink-ambient/persistence";
import { stepLotkaVolterra, mapToTargets } from "@/lib/ink-ambient/population";
import type { InkObject } from "@/lib/ink-ambient/types";

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
    partnerId: null,
    formerPartnerId: null,
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

  it("pairs the nearest available objects into mutual bonds", () => {
    const objects = [object(1, 0, 0), object(2, 10, 0), object(3, 500, 500), object(4, 510, 500)];
    formInitialPairs(objects, new SeededRng(1));
    expect(objects[0].partnerId).toBe(2);
    expect(objects[1].partnerId).toBe(1);
    expect(objects[2].partnerId).toBe(4);
    expect(objects[3].partnerId).toBe(3);
  });

  it("leaves a lone object unpaired without throwing", () => {
    const objects = [object(1, 0, 0)];
    expect(() => formInitialPairs(objects, new SeededRng(1))).not.toThrow();
    expect(objects[0].partnerId).toBeNull();
  });

  it("re-forms the same pair after a detach and release with only two objects", () => {
    const objects = [object(1, 0, 0), object(2, 10, 0)];
    formInitialPairs(objects, new SeededRng(1));
    detachPair(objects[0], objects);
    expect(objects[0].partnerId).toBeNull();
    expect(objects[1].partnerId).toBeNull();
    reevaluatePartner(objects[0], objects, new SeededRng(1));
    expect(objects[0].partnerId).toBe(2);
    expect(objects[1].partnerId).toBe(1);
  });

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
      expect(predator.radius).toBeGreaterThan(prey.radius);
    }
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
      // floored at PREY_SPEED_MIN * PREDATOR_SPEED_MULTIPLIER_MIN
      expect(thrown.chaseSpeed).toBeCloseTo(PREY_SPEED_MIN * PREDATOR_SPEED_MULTIPLIER_MIN, 5);
    } else {
      // clamped up to PREY_SPEED_MIN (20 is below the floor)
      expect(thrown.chaseSpeed).toBeCloseTo(PREY_SPEED_MIN, 5);
    }
  });

  it("keeps the thrown object's role sticky across a throw instead of re-flipping", () => {
    for (let seed = 0; seed < 20; seed += 1) {
      const objects = [object(1, 0, 0), object(2, 10, 0)];
      const rng = new SeededRng(seed * 37 + 3);
      formInitialPairs(objects, rng);
      const thrown = objects[0];
      const partner = objects[1];
      const roleBeforeThrow = thrown.role;
      detachPair(thrown, objects);
      thrown.velocity = { x: 15, y: 0 };
      reevaluatePartner(thrown, objects, rng);
      expect(thrown.role).toBe(roleBeforeThrow);
      expect(partner.role).toBe(roleBeforeThrow === "predator" ? "prey" : "predator");
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
      expect(predator.radius).toBeGreaterThan(prey.radius);
    }
  });

  it("reshuffles the old partner with a nearby lone object when a throw forms a new pair", () => {
    const objects = [
      object(1, 0, 0), // A
      object(2, 10, 0), // B — A's original partner
      object(3, 1000, 1000), // E — lone, closest to A after the throw
      object(4, 1500, 1500), // F — lone, closest to B once orphaned
    ];
    const rng = new SeededRng(9);
    formPair(objects[0], objects[1], rng); // A-B paired directly (no other objects to interfere)
    const a = objects[0];
    const b = objects[1];
    const e = objects[2];
    const f = objects[3];
    detachPair(a, objects);
    // Move A next to E (not back toward B) so the thrown object forms a NEW pair.
    a.position = { x: 990, y: 990 };
    a.velocity = { x: 5, y: 5 };
    reevaluatePartner(a, objects, rng);

    expect(a.partnerId).toBe(e.id);
    expect(e.partnerId).toBe(a.id);
    expect(b.partnerId).toBe(f.id);
    expect(f.partnerId).toBe(b.id);

    // predator > prey invariant holds for both freshly-formed pairs
    const [aRolePredator, aRolePrey] = a.role === "predator" ? [a, e] : [e, a];
    expect(aRolePredator.chaseSpeed).toBeGreaterThan(aRolePrey.chaseSpeed);
    const [bRolePredator, bRolePrey] = b.role === "predator" ? [b, f] : [f, b];
    expect(bRolePredator.chaseSpeed).toBeGreaterThan(bRolePrey.chaseSpeed);
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
