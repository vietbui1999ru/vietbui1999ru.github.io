import { describe, expect, it } from "vitest";
import { FIXED_STEP, getRouteProfile } from "@/lib/ink-ambient/config";
import { DEFAULT_RULES, step, type Rule } from "@/lib/ink-ambient/step";
import {
  addPredator,
  addPrey,
  countAlive,
  createWorld,
  perRoleCap,
  resetWorld,
  restoreWorld,
  setGeometry,
  spawnInitialBatch,
  type World,
} from "@/lib/ink-ambient/world";
import type { InkSnapshot } from "@/lib/ink-ambient/types";

const STEP_MS = FIXED_STEP * 1000;

function makeWorld(seed: number): World {
  const world = createWorld({ pointerFine: true }, seed);
  setGeometry(world, { width: 1280, height: 800, obstacles: [], profile: getRouteProfile("/") });
  spawnInitialBatch(world, 0);
  return world;
}

function run(world: World, frames: number, startMs = 0): number {
  let now = startMs;
  for (let i = 0; i < frames; i += 1) {
    now += STEP_MS;
    step(world, FIXED_STEP, now);
  }
  return now;
}

// Everything that defines the simulation, without the shared rng object.
function fingerprint(world: World) {
  return JSON.stringify({
    rng: world.rng.state,
    population: world.population,
    objects: world.objects.map((o) => [o.id, o.role, o.position, o.velocity, o.lives, o.vanishElapsed]),
  });
}

describe("world", () => {
  it("creates an empty seeded world", () => {
    const world = createWorld({ pointerFine: true }, 42);
    expect(world.seed).toBe(42);
    expect(world.objects).toEqual([]);
    expect(world.field).toBeNull();
  });

  it("builds the spatial field from geometry and spawns an initial batch", () => {
    const world = makeWorld(7);
    expect(world.field).not.toBeNull();
    expect(world.objects.length).toBeGreaterThan(0);
  });

  it("restores objects from a snapshot as viewport fractions", () => {
    const world = createWorld({ pointerFine: true }, 3);
    setGeometry(world, { width: 1000, height: 500, obstacles: [], profile: getRouteProfile("/") });
    const snapshot: InkSnapshot = {
      version: 2,
      seed: 3,
      savedAt: 0,
      objects: [{ id: 9, position: { x: 0.5, y: 0.5 }, velocity: { x: 0.01, y: 0 }, attractionValue: 1, rngState: 5 }],
    };
    restoreWorld(world, snapshot, 0);
    expect(world.objects).toHaveLength(1);
    expect(world.objects[0].velocity).toEqual({ x: 10, y: 0 });
    expect(world.nextObjectId).toBe(10);
  });
});

describe("rules", () => {
  it("runs extra rules after the default rules, in order", () => {
    const world = makeWorld(1);
    const calls: string[] = [];
    const first: Rule = () => calls.push("first");
    const second: Rule = (_, frame) => calls.push(`second ${frame.dt}`);
    step(world, FIXED_STEP, STEP_MS, [first, second]);
    expect(calls).toEqual(["first", `second ${FIXED_STEP}`]);
  });

  it("lists the default rules in a fixed order", () => {
    expect(DEFAULT_RULES[0].name).toBe("assignFlocks");
    expect(DEFAULT_RULES.at(-1)?.name).toBe("populationFlow");
  });
});

describe("determinism", () => {
  it("ends in the same state for the same seed", () => {
    const a = makeWorld(1234);
    const b = makeWorld(1234);
    addPrey(a, 0);
    addPrey(b, 0);
    run(a, 1200);
    run(b, 1200);
    expect(fingerprint(a)).toBe(fingerprint(b));
  });

  it("ends in a different state for a different seed", () => {
    const a = makeWorld(1234);
    const b = makeWorld(4321);
    run(a, 1200);
    run(b, 1200);
    expect(fingerprint(a)).not.toBe(fingerprint(b));
  });
});

describe("invariants", () => {
  it("keeps positions finite and inside the viewport, and roles under their caps", () => {
    const world = makeWorld(99);
    addPrey(world, 0);
    let now = 0;
    for (let i = 0; i < 3600; i += 1) {
      now += STEP_MS;
      step(world, FIXED_STEP, now);
      for (const o of world.objects) {
        const values = [o.position.x, o.position.y, o.velocity.x, o.velocity.y];
        if (values.some((v) => !Number.isFinite(v))) throw new Error(`frame ${i}: object ${o.id} is not finite`);
        if (o.position.x < 0 || o.position.x > world.width || o.position.y < 0 || o.position.y > world.height) {
          throw new Error(`frame ${i}: object ${o.id} left the viewport`);
        }
      }
      expect(countAlive(world, "prey")).toBeLessThanOrEqual(perRoleCap(world));
      expect(countAlive(world, "predator")).toBeLessThanOrEqual(perRoleCap(world));
    }
  });
});

describe("actions", () => {
  it("adding prey unlocks flocking", () => {
    const world = makeWorld(5);
    expect(world.preyButtonEverPressed).toBe(false);
    addPrey(world, 0);
    expect(world.preyButtonEverPressed).toBe(true);
  });

  it("add actions stop at the per-role cap", () => {
    const world = makeWorld(5);
    for (let i = 0; i < 40; i += 1) {
      addPrey(world, 0);
      addPredator(world, 0);
    }
    expect(countAlive(world, "prey")).toBeLessThanOrEqual(perRoleCap(world));
    expect(countAlive(world, "predator")).toBeLessThanOrEqual(perRoleCap(world));
  });

  it("reset clears population, timers and flock state, then respawns", () => {
    const world = makeWorld(5);
    addPrey(world, 0);
    run(world, 600);
    world.flockByMemberId.set(1, []);
    resetWorld(world, 0);
    expect(world.preyButtonEverPressed).toBe(false);
    expect(world.population).toEqual({ prey: 1.5, predator: 0.7 });
    expect(world.nextPreySpawnAt).toBe(0);
    expect(world.nextPredatorSpawnAt).toBe(0);
    expect(world.flockByMemberId.size).toBe(0);
    expect(world.objects.length).toBeGreaterThan(0);
  });
});
