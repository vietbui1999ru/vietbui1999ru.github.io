// Framework-free world state and actions for the ink ambient. No DOM: the
// component passes in geometry, time and the loaded snapshot.
import {
  AMBIENT_PREDATOR_COUNT,
  AMBIENT_PREY_COUNT,
  ATTRACTION_VALUE_MAX,
  ATTRACTION_VALUE_MIN,
  BURST_ALPHA,
  BURST_LIFETIME_MAX,
  BURST_LIFETIME_MIN,
  BURST_RADIUS_MULTIPLIER,
  MAX_OBJECTS_DESKTOP,
  MAX_OBJECTS_MOBILE,
  PLAYGROUND_SPAWN_ATTEMPTS,
  PLAYGROUND_SPAWN_BIAS_FRACTION,
  PREDATOR_SPAWN_TINT_COLOR,
  PREY_SPAWN_TINT_COLOR,
  SPAWN_RIPPLE_LIFETIME_SECONDS,
  POPULATION_TOPUP_MAX_DELAY_MS,
  POPULATION_TOPUP_MIN_DELAY_MS,
  PREDATOR_DRAG_HUNGER_PENALTY_SECONDS,
  PREDATOR_RADIUS_MAX,
  PREY_RADIUS_MAX,
} from "./config";
import { predatorsTargeting } from "./catches";
import { clamp } from "./physics";
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
import { DEFAULT_SIM_CONFIG, mergeConfig, type SimConfig } from "./sim-config";
import type { InkEffect, InkObject, InkSnapshot, Rect, RouteProfile, SpatialField, Vec2 } from "./types";

export type Role = "predator" | "prey";

export interface WorldOptions {
  /** True for a mouse-class pointer; selects the desktop object ceiling. */
  pointerFine: boolean;
  /** Tunable values (issue #22), merged over DEFAULT_SIM_CONFIG. */
  config?: Partial<SimConfig>;
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
  /** Tunable values read by the rules; change them with setConfig. */
  config: SimConfig;
  /** Crowding lifespan multiplier (lifecycle.ts lifespanMultiplier), set at the start of each step. */
  lifespanMultiplier: number;
  /** Playground only: spawns stay in the centred bias box until the first object dies. */
  spawnBiasActive: boolean;
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
    spawnBiasActive: true,
    lifespanMultiplier: 1,
    config: mergeConfig(DEFAULT_SIM_CONFIG, options.config),
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

/** Apply a partial config change. Live keys act on the next step; "new object" keys
 * (NEW_OBJECT_KEYS) act on objects spawned after the change. */
export function setConfig(world: World, patch: Partial<SimConfig>): void {
  world.config = mergeConfig(world.config, patch);
}

export function makeObject(
  id: number,
  position: Vec2,
  rng: SeededRng,
  now: number,
  role: Role,
  config: Readonly<SimConfig> = DEFAULT_SIM_CONFIG,
): InkObject {
  const attractionValue = rng.range(ATTRACTION_VALUE_MIN, ATTRACTION_VALUE_MAX);
  return {
    id,
    position: { ...position },
    velocity: { x: rng.range(-18, 18), y: rng.range(-12, 12) },
    radius: rollRadius(role, rng) * config.sizeScale,
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
    lives: config.predatorLives,
    hungerElapsed: 0,
    restRemaining: 0,
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

// The playground's objectCap, when set, replaces the device cap and the per-role cap.
function playgroundCap(world: World): number | null {
  return isPlayground(world) ? world.config.objectCap : null;
}

export function deviceCapMax(world: World): number {
  const cap = playgroundCap(world);
  if (cap !== null) return Math.max(1, cap);
  return world.pointerFine && world.width >= 720 ? MAX_OBJECTS_DESKTOP : MAX_OBJECTS_MOBILE;
}

export function perRoleCap(world: World): number {
  if (playgroundCap(world) !== null) return deviceCapMax(world);
  return Math.max(1, Math.floor(deviceCapMax(world) / 2));
}

function targetPopulation(world: World): number {
  if (!world.field) return world.pointerFine ? MAX_OBJECTS_DESKTOP : MAX_OBJECTS_MOBILE;
  const maximum = deviceCapMax(world);
  const capacity = availableCapacity(world.field, 24);
  return Math.min(maximum, Math.max(0, capacity));
}

// True when an object of this radius at point would touch no live object.
function isClearOfObjects(world: World, point: Vec2, radius: number): boolean {
  return world.objects.every(
    (other) =>
      other.vanishElapsed !== null ||
      Math.hypot(point.x - other.position.x, point.y - other.position.y) > radius + other.radius,
  );
}

// Uniform random point in the bias box (or the whole viewport once the bias is off)
// that is safe and clear of other objects. Null after PLAYGROUND_SPAWN_ATTEMPTS misses.
function findRandomSpawnPoint(world: World, radius: number): Vec2 | null {
  const { field, rng, width, height } = world;
  if (!field) return null;
  const fraction = world.spawnBiasActive ? PLAYGROUND_SPAWN_BIAS_FRACTION : 1;
  const left = (width * (1 - fraction)) / 2;
  const top = (height * (1 - fraction)) / 2;
  for (let attempt = 0; attempt < PLAYGROUND_SPAWN_ATTEMPTS; attempt += 1) {
    const point = {
      x: clamp(left + rng.next() * width * fraction, radius, width - radius),
      y: clamp(top + rng.next() * height * fraction, radius, height - radius),
    };
    if (isClearOfObjects(world, point, radius) && isSafePoint(field, point, radius)) return point;
  }
  return null;
}

function spawnOne(world: World, role: Role, now: number): boolean {
  if (!world.field) return false;
  const radius = (role === "predator" ? PREDATOR_RADIUS_MAX : PREY_RADIUS_MAX) * world.config.sizeScale;
  const avoid = world.objects.map((object) => object.position);
  const position =
    (isPlayground(world) ? findRandomSpawnPoint(world, radius) : null) ??
    findSafePointNearCorner(world.field, radius, world.rng, world.objects.length, avoid) ??
    findSafePoint(world.field, radius, world.rng, avoid);
  // No room left: the spawn stops, and objects never spawn overlapping.
  if (!position || !isClearOfObjects(world, position, radius)) return false;
  world.objects.push(makeObject(world.nextObjectId++, position, world.rng, now, role, world.config));
  return true;
}

function isPlayground(world: World): boolean {
  return world.field?.profile.name === "playground";
}

/** Start count for a role: the ambient count, times PLAYGROUND_INITIAL_MULTIPLIER on /playground. */
export function initialCount(world: World, role: Role): number {
  const base = role === "predator" ? AMBIENT_PREDATOR_COUNT : AMBIENT_PREY_COUNT;
  if (!isPlayground(world)) return base;
  return role === "predator" ? world.config.startPredators : world.config.startPrey;
}

/** Most objects of a role that automatic spawns (start, restore, top-up) fill to. */
export function autoRoleCap(world: World, role: Role): number {
  if (isPlayground(world)) return perRoleCap(world);
  return Math.min(perRoleCap(world), role === "predator" ? AMBIENT_PREDATOR_COUNT : AMBIENT_PREY_COUNT);
}

/** Fill each role up to its start count, on top of any restored objects. */
export function spawnInitialBatch(world: World, now: number): void {
  if (!world.field) return;
  const cap = targetPopulation(world);
  const missing = (role: Role) =>
    Math.max(0, Math.min(initialCount(world, role), autoRoleCap(world, role)) - countAlive(world, role));
  let prey = missing("prey");
  let predators = missing("predator");
  while (world.objects.length < cap && (prey > 0 || predators > 0)) {
    const role: Role =
      prey > 0 && predators > 0 ? (world.rng.chance(0.5) ? "predator" : "prey") : prey > 0 ? "prey" : "predator";
    if (!spawnOne(world, role, now)) break;
    if (role === "prey") prey -= 1;
    else predators -= 1;
  }
}

export function topUpPopulation(world: World, now: number): void {
  if (!world.field) return;
  const targets = mapToTargets(world.population);
  const preyTarget = Math.min(targets.preyTarget, autoRoleCap(world, "prey"));
  const predatorTarget = Math.min(targets.predatorTarget, autoRoleCap(world, "predator"));
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
  if (spawnOne(world, "predator", now)) addSpawnRipple(world, world.objects[world.objects.length - 1]);
}

/** The pencil button: one more prey, with the same caps. It also unlocks flocking. */
export function addPrey(world: World, now: number): void {
  world.preyButtonEverPressed = true;
  if (!world.field || world.objects.length >= deviceCapMax(world) || countAlive(world, "prey") >= perRoleCap(world)) return;
  if (spawnOne(world, "prey", now)) addSpawnRipple(world, world.objects[world.objects.length - 1]);
}

/** Back to page-load state: objects, population, spawn timers and flock state. */
export function resetWorld(world: World, now: number): void {
  if (!world.field) return;
  world.objects.length = 0;
  world.population = { prey: 1.5, predator: 0.7 };
  world.preyButtonEverPressed = false;
  world.spawnBiasActive = true;
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
    // Restore only up to each role's automatic cap, so a crowded snapshot (from
    // the playground or an older build) does not crowd an ambient page.
    const room = (candidate: Role) => autoRoleCap(world, candidate) - countAlive(world, candidate);
    if (room("predator") <= 0 && room("prey") <= 0) break;
    let role: Role = rng.chance(0.5) ? "predator" : "prey";
    if (room(role) <= 0) role = role === "predator" ? "prey" : "predator";
    const object = makeObject(saved.id, position, rng, now, role, world.config);
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

/** A ring that expands from a button-spawned object and fades, in its spawn tint. */
export function addSpawnRipple(world: World, object: InkObject): void {
  world.effects.push({
    x: object.position.x,
    y: object.position.y,
    radius: object.radius,
    alpha: 1,
    age: 0,
    lifetime: SPAWN_RIPPLE_LIFETIME_SECONDS,
    type: "ripple",
    rotation: 0,
    color: object.role === "predator" ? PREDATOR_SPAWN_TINT_COLOR : PREY_SPAWN_TINT_COLOR,
  });
}

export function addBurstEffect(world: World, x: number, y: number, radius: number): void {
  // Spawn ripples are short-lived and do not count against the burst cap.
  if (world.effects.filter((effect) => effect.type !== "ripple").length >= 4) return;
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
