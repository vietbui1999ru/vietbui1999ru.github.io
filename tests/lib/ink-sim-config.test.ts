import { describe, expect, it } from "vitest";
import {
  FIXED_STEP,
  FLOCK_MIN_SIZE,
  FLOCK_RADIUS,
  FLOCK_TARGET_SWITCH_MARGIN,
  LIFESPAN_MAX_MULTIPLIER,
  PEN_TRAIL_MAX_AGE_SECONDS,
  PREDATOR_LIVES_START,
  PREDATOR_STARVE_SECONDS,
  PREY_RADIUS_MAX,
  PREY_RADIUS_MIN,
  getRouteProfile,
} from "@/lib/ink-ambient/config";
import { DEFAULT_SIM_CONFIG, usesSnapshot, type SimConfig } from "@/lib/ink-ambient/sim-config";
import { step } from "@/lib/ink-ambient/step";
import {
  addPredator,
  addPrey,
  createWorld,
  makeObject,
  setConfig,
  setGeometry,
  spawnInitialBatch,
  type World,
} from "@/lib/ink-ambient/world";
import type { InkObject } from "@/lib/ink-ambient/types";

const STEP_MS = FIXED_STEP * 1000;

function makeWorld(path: string, config: Partial<SimConfig> = {}, seed = 3): World {
  const world = createWorld({ pointerFine: true, config }, seed);
  setGeometry(world, { width: 1280, height: 800, obstacles: [], profile: getRouteProfile(path) });
  return world;
}

/** An empty world with hand-placed objects, so one rule can be checked at a time. */
function place(world: World, role: "predator" | "prey", x: number, y: number): InkObject {
  const object = makeObject(world.nextObjectId++, { x, y }, world.rng, 0, role, world.config);
  object.opacity = 1;
  object.lifecycle = "active";
  object.velocity = { x: 0, y: 0 };
  world.objects.push(object);
  return object;
}

function run(world: World, frames: number): void {
  for (let i = 1; i <= frames; i += 1) step(world, FIXED_STEP, i * STEP_MS);
}

describe("merge and apply", () => {
  it("defaults equal the config.ts constants", () => {
    expect(DEFAULT_SIM_CONFIG).toMatchObject({
      objectCap: null,
      predatorLives: PREDATOR_LIVES_START,
      starveSeconds: PREDATOR_STARVE_SECONDS,
      lifespanMaxMultiplier: LIFESPAN_MAX_MULTIPLIER,
      flockRadius: FLOCK_RADIUS,
      flockMinSize: FLOCK_MIN_SIZE,
      flockSwitchMargin: FLOCK_TARGET_SWITCH_MARGIN,
      trailSeconds: PEN_TRAIL_MAX_AGE_SECONDS,
      predatorSpeedScale: 1,
      preySpeedScale: 1,
      sizeScale: 1,
    });
  });

  it("createWorld merges a partial config over the defaults", () => {
    const world = makeWorld("/", { flockRadius: 120 });
    expect(world.config).toEqual({ ...DEFAULT_SIM_CONFIG, flockRadius: 120 });
  });

  it("setConfig applies live keys on the next step", () => {
    const world = makeWorld("/");
    const predator = place(world, "predator", 640, 400);
    predator.hungerElapsed = 9.999;
    setConfig(world, { starveSeconds: 10 });
    run(world, 1);
    expect(predator.vanishElapsed).not.toBeNull();
  });

  it("setConfig applies new-object keys only to objects spawned after the change", () => {
    const world = makeWorld("/");
    spawnInitialBatch(world, 0);
    const before = world.objects.map((o) => [o.radius, o.lives]);
    setConfig(world, { sizeScale: 2, predatorLives: 7 });
    expect(world.objects.map((o) => [o.radius, o.lives])).toEqual(before);
    world.objects.length = 0;
    addPredator(world, 0);
    expect(world.objects[0].lives).toBe(7);
  });
});

describe("each key", () => {
  // Speed scales cap each role's speed: same seed and state, so the capped speeds differ by the scale.
  function cappedSpeed(role: "predator" | "prey", config: Partial<SimConfig>): number {
    const world = makeWorld("/", config, 11);
    const object = place(world, role, 640, 400);
    object.velocity = { x: 5000, y: 0 };
    run(world, 1);
    return Math.hypot(object.velocity.x, object.velocity.y);
  }

  it("predator speed and prey speed scale separately", () => {
    expect(cappedSpeed("predator", { predatorSpeedScale: 0.5 })).toBeCloseTo(cappedSpeed("predator", {}) * 0.5);
    expect(cappedSpeed("prey", { preySpeedScale: 2 })).toBeCloseTo(cappedSpeed("prey", {}) * 2);
    expect(cappedSpeed("predator", { preySpeedScale: 2 })).toBeCloseTo(cappedSpeed("predator", {}));
    expect(cappedSpeed("prey", { predatorSpeedScale: 0.5 })).toBeCloseTo(cappedSpeed("prey", {}));
  });

  it("starveSeconds sets when a predator starves", () => {
    const world = makeWorld("/", { starveSeconds: 10 });
    const predator = place(world, "predator", 640, 400);
    predator.hungerElapsed = 9.999;
    run(world, 1);
    expect(predator.vanishElapsed).not.toBeNull();
    const control = makeWorld("/");
    const fed = place(control, "predator", 640, 400);
    fed.hungerElapsed = 9.999;
    run(control, 1);
    expect(fed.vanishElapsed).toBeNull();
  });

  it("lifespanMaxMultiplier caps the crowding multiplier", () => {
    const world = makeWorld("/", { lifespanMaxMultiplier: 2 });
    place(world, "predator", 200, 200);
    place(world, "prey", 900, 600);
    run(world, 1);
    expect(world.lifespanMultiplier).toBe(2);
  });

  // Three prey 120 px apart in a row, and a predator chasing the first one.
  function preyRow(config: Partial<SimConfig>, gap = 120): World {
    const world = makeWorld("/", config);
    world.preyButtonEverPressed = true;
    const [first] = [0, 1, 2].map((i) => place(world, "prey", 400 + i * gap, 400));
    const predator = place(world, "predator", 400, 700);
    predator.currentTargetId = first.id;
    return world;
  }
  const hunting = (world: World) => world.objects.filter((o) => o.huntingFlock).length;

  it("flockRadius sets the link distance", () => {
    expect(hunting(run1(preyRow({})))).toBe(0);
    expect(hunting(run1(preyRow({ flockRadius: 150 })))).toBe(3);
  });

  it("flockMinSize sets the smallest flock", () => {
    expect(hunting(run1(preyRow({}, 60)))).toBe(3);
    expect(hunting(run1(preyRow({ flockMinSize: 4 }, 60)))).toBe(0);
  });

  it("flockSwitchMargin sets when a flock switches to a closer predator", () => {
    function chosen(margin: number): number {
      const world = preyRow({ flockSwitchMargin: margin }, 60);
      const members = world.objects.filter((o) => o.role === "prey");
      const held = place(world, "predator", 460, 100); // 300 px from the flock centre
      const near = world.objects.find((o) => o.role === "predator" && o.id !== held.id)!;
      held.currentTargetId = members[0].id;
      near.position = { x: 460, y: 220 }; // 180 px: 0.6 of the held distance
      for (const member of members) world.flockTargetByMemberId.set(member.id, held);
      run(world, 1);
      return world.flockTargetByMemberId.get(members[0].id)!.id === held.id ? 0 : 1;
    }
    expect(chosen(0.5)).toBe(0);
    expect(chosen(0.3)).toBe(1);
  });

  it("sizeScale scales the radius of new objects", () => {
    const world = makeWorld("/", { sizeScale: 2 });
    for (let i = 0; i < 6; i += 1) addPrey(world, 0);
    for (const o of world.objects) {
      expect(o.radius).toBeGreaterThanOrEqual(PREY_RADIUS_MIN * 2);
      expect(o.radius).toBeLessThanOrEqual(PREY_RADIUS_MAX * 2);
    }
  });

  it("trailSeconds sets the trail length", () => {
    function trailPoints(config: Partial<SimConfig>): number {
      const world = makeWorld("/", config, 5);
      const pen = place(world, "predator", 300, 400);
      pen.variant = 1;
      pen.velocity = { x: 120, y: 0 };
      run(world, 60);
      return pen.trail.length;
    }
    const full = trailPoints({});
    expect(full).toBeGreaterThan(20);
    expect(trailPoints({ trailSeconds: 0.05 })).toBeLessThan(full / 5);
  });

  it("predatorLives sets the lives of new predators and the reset after a catch", () => {
    const world = makeWorld("/", { predatorLives: 6 });
    const predator = place(world, "predator", 640, 400);
    expect(predator.lives).toBe(6);
    predator.lives = 1;
    const prey = place(world, "prey", 640, 400);
    predator.currentTargetId = prey.id;
    run(world, 1);
    expect(world.objects.some((o) => o.id === prey.id)).toBe(false);
    expect(predator.lives).toBe(6);
  });
});

function run1(world: World): World {
  run(world, 1);
  return world;
}

describe("object cap", () => {
  it("objectCap 1 allows one object on the playground", () => {
    const world = makeWorld("/playground", { objectCap: 1 });
    spawnInitialBatch(world, 0);
    expect(world.objects).toHaveLength(1);
    addPrey(world, 0);
    addPredator(world, 0);
    expect(world.objects).toHaveLength(1);
  });

  it("Infinity fills the screen past 24, then a press adds nothing, with no overlap", () => {
    const world = makeWorld("/playground", { objectCap: Infinity });
    let misses = 0;
    for (let press = 0; misses < 20 && press < 2000; press += 1) {
      const before = world.objects.length;
      if (press % 2 === 0) addPrey(world, 0);
      else addPredator(world, 0);
      misses = world.objects.length === before ? misses + 1 : 0;
    }
    const full = world.objects.length;
    expect(full).toBeGreaterThan(24);
    addPrey(world, 0);
    addPredator(world, 0);
    expect(world.objects).toHaveLength(full);
    for (const [i, a] of world.objects.entries()) {
      for (const b of world.objects.slice(i + 1)) {
        expect(Math.hypot(a.position.x - b.position.x, a.position.y - b.position.y)).toBeGreaterThan(a.radius + b.radius);
      }
    }
  });

  it("null keeps today's playground caps", () => {
    const world = makeWorld("/playground");
    for (let i = 0; i < 40; i += 1) addPrey(world, 0);
    expect(world.objects.length).toBe(12);
  });
});

describe("snapshot isolation", () => {
  it("the playground never uses the shared snapshot; other pages do", () => {
    expect(usesSnapshot("/playground")).toBe(false);
    expect(usesSnapshot("/playground/")).toBe(false);
    for (const path of ["/", "/blog", "/about", "/projects/x"]) expect(usesSnapshot(path)).toBe(true);
  });
});
