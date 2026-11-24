// Framework-free world state and actions for the ink ambient. No DOM: the
// component passes in geometry, time and the loaded snapshot.
import {
  ATTRACTION_VALUE_MAX,
  ATTRACTION_VALUE_MIN,
  BURST_ALPHA,
  BURST_LIFETIME_MAX,
  BURST_LIFETIME_MIN,
  BURST_RADIUS_MULTIPLIER,
  MAX_OBJECTS_DESKTOP,
  MAX_OBJECTS_MOBILE,
  POPULATION_TOPUP_MAX_DELAY_MS,
  POPULATION_TOPUP_MIN_DELAY_MS,
  PREDATOR_DRAG_HUNGER_PENALTY_SECONDS,
  PREDATOR_LIVES_START,
  PREDATOR_RADIUS_MAX,
  PREY_RADIUS_MAX,
  SPAWN_COUNT_MAX,
  SPAWN_COUNT_MIN,
} from "./config";
import { predatorsTargeting } from "./catches";
import { mapToTargets, type PopulationState } from "./population";
import { rollChaseSpeed, rollRadius } from "./spawn";
import {
  availableCapacity,
  buildSpatialField,
  findSafePoint,
  findSafePointNearCorner,
  isSafePoint,
} from "./spatial-field";
import { SeededRng } from "./rng";
import type { InkEffect, InkObject, InkSnapshot, Rect, RouteProfile, SpatialField, Vec2 } from "./types";

export type Role = "predator" | "prey";

export interface WorldOptions {
  /** True for a mouse-class pointer; selects the desktop object ceiling. */
  pointerFine: boolean;
}

export interface World {
  seed: number;
  rng: SeededRng;
  pointerFine: boolean;
  objects: InkObject[];
  nextObjectId: number;
  effects: InkEffect[];
  width: number;
  height: number;
  obstacles: Rect[];
  field: SpatialField | null;
  activeAnchor: Vec2 | null;
  nextPreySpawnAt: number;
  nextPredatorSpawnAt: number;
  population: PopulationState;
  preyButtonEverPressed: boolean;
  flockTargetByMemberId: Map<number, InkObject>;
  flockByMemberId: Map<number, InkObject[]>;
  flockByTargetPredatorId: Map<number, InkObject[]>;
}

export function createWorld(options: WorldOptions, seed: number): World {
  return {
    seed,
    rng: new SeededRng(seed),
    pointerFine: options.pointerFine,
    objects: [],
    nextObjectId: 0,
    effects: [],
    width: 0,
    height: 0,
    obstacles: [],
    field: null,
    activeAnchor: null,
    nextPreySpawnAt: 0,
    nextPredatorSpawnAt: 0,
    population: { prey: 1.5, predator: 0.7 },
    preyButtonEverPressed: false,
    flockTargetByMemberId: new Map(),
    flockByMemberId: new Map(),
    flockByTargetPredatorId: new Map(),
  };
}

export function makeObject(id: number, position: Vec2, rng: SeededRng, now: number, role: Role): InkObject {
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
    chaseElapsed: 0,
    role,
    chaseSpeed: rollChaseSpeed(role, attractionValue, rng),
    attractionValue,
    motionBlend: null,
    lives: PREDATOR_LIVES_START,
    hungerElapsed: 0,
    vanishElapsed: null,
    huntingFlock: false,
    beingHunted: false,
  };
}

/** Viewport size, obstacles and route profile; rebuilds the spatial field and anchor. */
export function setGeometry(
  world: World,
  geometry: { width: number; height: number; obstacles: Rect[]; profile: RouteProfile },
): void {
  world.width = geometry.width;
  world.height = geometry.height;
  world.obstacles = geometry.obstacles;
  const representativeRadius = world.objects.length
    ? Math.max(...world.objects.map((object) => object.radius))
    : 18;
  world.field = buildSpatialField(
    world.width,
    world.height,
    world.obstacles,
    geometry.profile,
    representativeRadius,
  );
  world.activeAnchor = findSafePoint(
    world.field,
    representativeRadius,
    world.rng,
    world.objects.map((object) => object.position),
  );
}

export function countAlive(world: World, role: Role): number {
  return world.objects.filter((object) => object.role === role && object.vanishElapsed === null).length;
}

export function deviceCapMax(world: World): number {
  return world.pointerFine && world.width >= 720 ? MAX_OBJECTS_DESKTOP : MAX_OBJECTS_MOBILE;
}

export function perRoleCap(world: World): number {
  return Math.max(1, Math.floor(deviceCapMax(world) / 2));
}

function targetPopulation(world: World): number {
  if (!world.field) return world.pointerFine ? MAX_OBJECTS_DESKTOP : MAX_OBJECTS_MOBILE;
  const mobile = !world.pointerFine || world.width < 720;
  const maximum = mobile ? MAX_OBJECTS_MOBILE : MAX_OBJECTS_DESKTOP;
  const capacity = availableCapacity(world.field, 24);
  return Math.min(maximum, Math.max(0, capacity));
}

function spawnOne(world: World, role: Role, now: number): boolean {
  if (!world.field) return false;
  const radius = role === "predator" ? PREDATOR_RADIUS_MAX : PREY_RADIUS_MAX;
  const avoid = world.objects.map((object) => object.position);
  const position =
    findSafePointNearCorner(world.field, radius, world.rng, world.objects.length, avoid) ??
    findSafePoint(world.field, radius, world.rng, avoid);
  if (!position) return false;
  world.objects.push(makeObject(world.nextObjectId++, position, world.rng, now, role));
  return true;
}

export function spawnInitialBatch(world: World, now: number): void {
  if (!world.field) return;
  // Prey and predator counts at spawn/refresh are each independently
  // randomized rather than a single coin-flipped combined target, so a
  // fresh page load can start prey-heavy, predator-heavy, or balanced.
  const preyTarget = world.rng.int(SPAWN_COUNT_MIN, SPAWN_COUNT_MAX);
  const predatorTarget = world.rng.int(SPAWN_COUNT_MIN, SPAWN_COUNT_MAX);
  const cap = targetPopulation(world);
  let preySpawned = 0;
  let predatorSpawned = 0;
  while (world.objects.length < cap && (preySpawned < preyTarget || predatorSpawned < predatorTarget)) {
    let role: Role;
    if (preySpawned < preyTarget && predatorSpawned < predatorTarget) {
      role = world.rng.chance(0.5) ? "predator" : "prey";
    } else if (preySpawned < preyTarget) {
      role = "prey";
    } else {
      role = "predator";
    }
    if (!spawnOne(world, role, now)) break;
    if (role === "prey") preySpawned += 1;
    else predatorSpawned += 1;
  }
}

export function topUpPopulation(world: World, now: number): void {
  if (!world.field) return;
  const targets = mapToTargets(world.population);
  const preyTarget = Math.min(targets.preyTarget, perRoleCap(world));
  const predatorTarget = Math.min(targets.predatorTarget, perRoleCap(world));
  const { rng } = world;
  if (countAlive(world, "prey") < preyTarget && now >= world.nextPreySpawnAt) {
    if (spawnOne(world, "prey", now)) {
      world.nextPreySpawnAt = now + rng.range(POPULATION_TOPUP_MIN_DELAY_MS, POPULATION_TOPUP_MAX_DELAY_MS);
    }
  }
  if (countAlive(world, "predator") < predatorTarget && now >= world.nextPredatorSpawnAt) {
    if (spawnOne(world, "predator", now)) {
      world.nextPredatorSpawnAt = now + rng.range(POPULATION_TOPUP_MIN_DELAY_MS, POPULATION_TOPUP_MAX_DELAY_MS);
    }
  }
}

/** The pen button: one more predator, past the Lotka-Volterra target, within the
 * device ceiling and the per-role cap. */
export function addPredator(world: World, now: number): void {
  if (!world.field || world.objects.length >= deviceCapMax(world) || countAlive(world, "predator") >= perRoleCap(world)) return;
  spawnOne(world, "predator", now);
}

/** The pencil button: one more prey, with the same caps. It also unlocks flocking. */
export function addPrey(world: World, now: number): void {
  world.preyButtonEverPressed = true;
  if (!world.field || world.objects.length >= deviceCapMax(world) || countAlive(world, "prey") >= perRoleCap(world)) return;
  spawnOne(world, "prey", now);
}

/** Back to page-load state: objects, population, spawn timers and flock state. */
export function resetWorld(world: World, now: number): void {
  if (!world.field) return;
  world.objects.length = 0;
  world.population = { prey: 1.5, predator: 0.7 };
  world.preyButtonEverPressed = false;
  world.flockTargetByMemberId = new Map();
  world.flockByMemberId = new Map();
  world.flockByTargetPredatorId = new Map();
  world.nextPreySpawnAt = 0;
  world.nextPredatorSpawnAt = 0;
  spawnInitialBatch(world, now);
}

/** Rebuild objects from a saved snapshot; positions and velocities are viewport fractions. */
export function restoreWorld(world: World, snapshot: InkSnapshot | null, now: number): void {
  const { field, rng, width, height } = world;
  if (!snapshot || !field) return;
  for (const saved of snapshot.objects.slice(0, world.pointerFine ? MAX_OBJECTS_DESKTOP : MAX_OBJECTS_MOBILE)) {
    const savedPosition = { x: saved.position.x * width, y: saved.position.y * height };
    const position = isSafePoint(field, savedPosition, 24)
      ? savedPosition
      : findSafePoint(field, 24, rng, world.objects.map((object) => object.position));
    if (!position) continue;
    const role: Role = rng.chance(0.5) ? "predator" : "prey";
    const object = makeObject(saved.id, position, rng, now, role);
    world.nextObjectId = Math.max(world.nextObjectId, saved.id + 1);
    object.velocity = { x: saved.velocity.x * width, y: saved.velocity.y * height };
    object.attractionValue = saved.attractionValue;
    // Re-roll chaseSpeed from the restored attractionValue: makeObject already
    // rolled one from a freshly-generated attractionValue before we overwrote it.
    object.chaseSpeed = rollChaseSpeed(role, object.attractionValue, rng);
    object.rngState = saved.rngState;
    world.objects.push(object);
  }
}

/** A dragged predator, or every predator chasing a dragged prey, gets hungrier. */
export function applyDragPenalty(world: World, object: InkObject): void {
  if (object.role === "predator") {
    object.hungerElapsed += PREDATOR_DRAG_HUNGER_PENALTY_SECONDS;
  } else if (object.role === "prey") {
    for (const predator of predatorsTargeting(object.id, world.objects)) {
      predator.hungerElapsed += PREDATOR_DRAG_HUNGER_PENALTY_SECONDS;
    }
  }
}

export function addBurstEffect(world: World, x: number, y: number, radius: number): void {
  if (world.effects.length >= 4) return;
  world.effects.push({
    x,
    y,
    radius: radius * BURST_RADIUS_MULTIPLIER,
    alpha: BURST_ALPHA,
    age: 0,
    lifetime: world.rng.range(BURST_LIFETIME_MIN, BURST_LIFETIME_MAX),
    type: "burst",
    rotation: world.rng.range(-Math.PI, Math.PI),
  });
}
