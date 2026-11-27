// One fixed simulation step, as an ordered list of rules over the world.
// Each rule is a plain function, so a new behaviour is an added rule.
import {
  ATTRACTION_MAX_ACCELERATION_HEAVY,
  ATTRACTION_MAX_ACCELERATION_LIGHT,
  LV_CATCH_PREDATOR_BOOST,
  LV_CATCH_PREY_DECAY,
  LV_PREDATOR_DEATH_DECAY,
  PREDATOR_MAX_RAMPED_SPEED,
  PREDATOR_REST_SECONDS_PER_MULTIPLIER,
  PREDATOR_SCARCITY_HUNGER_PENALTY_SECONDS,
  SAFE_CLEARANCE,
  TRAIL_MIN_SPEED,
  TRAIL_SAMPLE_INTERVAL_SECONDS,
  TRAPPED_ESCAPE_ACCELERATION,
  TRAPPED_ESCAPE_SECONDS,
  VANISH_DURATION_SECONDS,
} from "./config";
import { resolveCatches, type CatchResolution } from "./catches";
import { trailScale } from "./sim-config";
import {
  computeFlockAssignments,
  flockHuntAcceleration,
  isFlockKillTriggered,
  predatorFleeAcceleration,
} from "./flocking";
import {
  applyPredatorSurvivalTick,
  lifespanMultiplier,
  predatorSpawnRampMultiplier,
  updateSpawnFade,
  updateVanish,
} from "./lifecycle";
import {
  applyDrag,
  applyHeadingRotation,
  boundarySteeringForce,
  clamp,
  clampToViewport,
  integrate,
  length,
  limit,
  normalize,
  obstacleRepulsion,
  resolveCircleCollision,
  scale as scaleVector,
  subtract,
  tipPosition,
  trailMaxAge,
  trailMaxPoints,
  updateTurnSquash,
} from "./physics";
import { stepLotkaVolterra } from "./population";
import { isSafePoint } from "./spatial-field";
import {
  chaseAccelerationMultiplier,
  idleAcceleration,
  nearbyPredatorWobbleMultiplier,
  pairApproachRamp,
  predatorAcceleration,
  preyAcceleration,
  updateTarget,
} from "./targeting";
import type { InkObject } from "./types";
import { addBurstEffect, countAlive, topUpPopulation, type World } from "./world";

/** Per-step scratch data that later rules read from earlier ones. */
export interface StepFrame {
  dt: number;
  now: number;
  /** Ids already vanishing when the step began. */
  wasVanishing: Set<number>;
  catches: CatchResolution;
}

export type Rule = (world: World, frame: StepFrame) => void;

function massFraction(mass: number): number {
  return clamp((mass - 0.7) / (1.5 - 0.7), 0, 1);
}

function updateTrail(object: InkObject, dt: number, scale = 1): void {
  // Age and prune every frame regardless of motion, so a trail fades out on
  // its own instead of freezing in place when the object slows down.
  // Pen (predator) and pencil (prey) keep independent trail lengths.
  const maxAge = trailMaxAge(object, scale);
  const maxPoints = trailMaxPoints(object, scale);
  for (let index = object.trail.length - 1; index >= 0; index -= 1) {
    object.trail[index].age += dt;
    if (object.trail[index].age >= maxAge) object.trail.splice(index, 1);
  }
  object.trailSampleTimer += dt;
  if (
    object.opacity > 0.4 &&
    length(object.velocity) > TRAIL_MIN_SPEED &&
    object.trailSampleTimer >= TRAIL_SAMPLE_INTERVAL_SECONDS
  ) {
    object.trailSampleTimer = 0;
    const tip = tipPosition(object);
    object.trail.push({ x: tip.x, y: tip.y, age: 0 });
    if (object.trail.length > maxPoints) object.trail.shift();
  }
}

function updateObject(world: World, object: InkObject, dt: number, now: number): void {
  const { objects, field, width, height } = world;
  object.effectCooldown = Math.max(0, object.effectCooldown - dt);
  object.squashCooldown = Math.max(0, object.squashCooldown - dt);
  updateSpawnFade(object, now, dt);
  // Hunger runs at 1/m speed, so a predator lives m times longer on a quiet screen.
  applyPredatorSurvivalTick(object, dt / world.lifespanMultiplier, world.config.starveSeconds);
  object.restRemaining = Math.max(0, object.restRemaining - dt);

  if (object.vanishElapsed !== null) {
    updateVanish(object, dt);
    return;
  }

  if (object.grabbed) {
    // Still track the trail while dragged: the component syncs position to
    // the pointer, so this samples the real cursor trajectory.
    updateTrail(object, dt, trailScale(world.config));
    return;
  }

  const settling = object.lifecycle === "spawning";
  const massT = massFraction(object.mass);
  const maxAccel =
    ATTRACTION_MAX_ACCELERATION_LIGHT +
    (ATTRACTION_MAX_ACCELERATION_HEAVY - ATTRACTION_MAX_ACCELERATION_LIGHT) * massT;

  const previousTargetId = object.currentTargetId;
  const resting = object.role === "predator" && object.restRemaining > 0;
  if (resting) object.currentTargetId = null;
  const target = resting ? null : updateTarget(object, objects);
  object.chaseElapsed = object.currentTargetId === previousTargetId ? object.chaseElapsed + dt : 0;

  const isUnsafe = Boolean(field) && !isSafePoint(field!, object.position, object.radius);
  object.unsafeElapsed = isUnsafe ? object.unsafeElapsed + dt : 0;

  let acceleration =
    object.huntingFlock && !settling && world.flockTargetByMemberId.has(object.id)
      ? flockHuntAcceleration(
          object,
          world.flockTargetByMemberId.get(object.id)!,
          world.flockByMemberId.get(object.id)!,
          maxAccel,
          world.config.flockRadius,
        )
      : object.beingHunted && !settling && world.flockByTargetPredatorId.has(object.id)
        ? predatorFleeAcceleration(object, world.flockByTargetPredatorId.get(object.id)!, maxAccel, now)
        : target && !settling
          ? object.role === "predator"
            ? predatorAcceleration(object, target, maxAccel, now)
            : preyAcceleration(object, target, maxAccel, now, nearbyPredatorWobbleMultiplier(object, objects))
          : idleAcceleration(object, world.activeAnchor, isUnsafe, now);

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
  const repulsion = obstacleRepulsion(object, world.obstacles, SAFE_CLEARANCE);
  acceleration.x += repulsion.x;
  acceleration.y += repulsion.y;

  if (world.activeAnchor && object.unsafeElapsed > TRAPPED_ESCAPE_SECONDS) {
    acceleration = scaleVector(normalize(subtract(world.activeAnchor, object.position)), TRAPPED_ESCAPE_ACCELERATION);
  }

  object.lastAcceleration = { x: acceleration.x, y: acceleration.y };
  applyDrag(object, 0.06, dt);
  integrate(object, acceleration, dt);
  const rotationDelta = applyHeadingRotation(object, dt);
  const spawnRamp = object.role === "predator" ? predatorSpawnRampMultiplier(object, now) : 1;
  const maxSpeed =
    (object.huntingFlock || object.beingHunted) && !settling
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
  const speedScale = object.role === "predator" ? world.config.predatorSpeedScale : world.config.preySpeedScale;
  object.velocity = limit(object.velocity, maxSpeed * speedScale);
  object.scale.x += (1 - object.scale.x) * Math.min(1, dt * 5);
  object.scale.y += (1 - object.scale.y) * Math.min(1, dt * 5);
  if (object.squashCooldown <= 0) {
    const turnFactor = updateTurnSquash(object, rotationDelta, dt);
    object.scale.x += (1 - turnFactor - object.scale.x) * Math.min(1, dt * 8);
    object.scale.y += (1 + turnFactor - object.scale.y) * Math.min(1, dt * 8);
  }
  clampToViewport(object, width, height);
  updateTrail(object, dt, trailScale(world.config));
}

export const assignFlocks: Rule = (world) => {
  if (world.preyButtonEverPressed && countAlive(world, "prey") > countAlive(world, "predator")) {
    const assignment = computeFlockAssignments(world.objects, world.flockTargetByMemberId, {
      radius: world.config.flockRadius,
      minSize: world.config.flockMinSize,
      switchMargin: world.config.flockSwitchMargin,
    });
    for (const object of world.objects) {
      object.huntingFlock = assignment.huntingFlockIds.has(object.id);
      object.beingHunted = assignment.beingHuntedIds.has(object.id);
    }
    world.flockTargetByMemberId = assignment.targetByMemberId;
    world.flockByMemberId = assignment.flockByMemberId;
    world.flockByTargetPredatorId = assignment.flockByTargetPredatorId;
  } else {
    for (const object of world.objects) {
      object.huntingFlock = false;
      object.beingHunted = false;
    }
    world.flockTargetByMemberId = new Map();
    world.flockByMemberId = new Map();
    world.flockByTargetPredatorId = new Map();
  }
};

export const moveObjects: Rule = (world, frame) => {
  const alive = world.objects.filter((object) => object.vanishElapsed === null).length;
  world.lifespanMultiplier = lifespanMultiplier(alive, world.config.lifespanMaxMultiplier);
  for (const object of world.objects) updateObject(world, object, frame.dt, frame.now);
};

export const resolveCatchRule: Rule = (world, frame) => {
  frame.catches = resolveCatches(world.objects);
  for (const id of frame.catches.winnerIds) {
    const winner = world.objects.find((object) => object.id === id);
    if (winner) {
      winner.hungerElapsed = 0;
      // A successful catch is a full reprieve: lives lost to earlier
      // rival losses are forgiven too, not just the starvation clock.
      winner.lives = world.config.predatorLives;
      // A fed predator rests before it hunts again; zero at the reference crowding.
      winner.restRemaining = PREDATOR_REST_SECONDS_PER_MULTIPLIER * (world.lifespanMultiplier - 1);
    }
  }
  for (const id of frame.catches.loserIds) {
    const loser = world.objects.find((object) => object.id === id);
    if (loser && loser.vanishElapsed === null) {
      loser.lives -= 1;
      if (loser.lives <= 0) loser.vanishElapsed = 0;
    }
  }
};

// Being hunted only changes a predator's behaviour (it flees like prey); its
// role never flips. A flock that closes the kill distance destroys it.
export const flockKills: Rule = (world) => {
  for (const predator of world.objects) {
    if (!predator.beingHunted || predator.vanishElapsed !== null) continue;
    const hunters = world.flockByTargetPredatorId.get(predator.id);
    if (!hunters || !isFlockKillTriggered(predator, hunters, world.config.flockKillReach)) continue;
    predator.beingHunted = false;
    predator.vanishElapsed = 0;
    addBurstEffect(world, predator.position.x, predator.position.y, predator.radius);
  }
};

// Tie the Lotka-Volterra state to real events: eating drives predator births,
// dying drives the predator population down.
export const populationEvents: Rule = (world, frame) => {
  const { catches } = frame;
  if (catches.winnerIds.size > 0) {
    world.population.predator += LV_CATCH_PREDATOR_BOOST * catches.winnerIds.size;
  }
  if (catches.destroyedPreyIds.size > 0) {
    world.population.prey = Math.max(0.05, world.population.prey - LV_CATCH_PREY_DECAY * catches.destroyedPreyIds.size);
  }
  for (const object of world.objects) {
    if (object.role === "predator" && object.vanishElapsed !== null && !frame.wasVanishing.has(object.id)) {
      world.population.predator = Math.max(0.05, world.population.predator - LV_PREDATOR_DEATH_DECAY);
    }
  }
};

export const scarcityPenalty: Rule = (world, frame) => {
  const { catches } = frame;
  if (catches.winnerIds.size === 0) return;
  const preyRemaining = countAlive(world, "prey") - catches.destroyedPreyIds.size;
  if (countAlive(world, "predator") < preyRemaining) return;
  for (const object of world.objects) {
    if (object.role === "predator" && object.vanishElapsed === null && !catches.winnerIds.has(object.id)) {
      object.hungerElapsed += PREDATOR_SCARCITY_HUNGER_PENALTY_SECONDS;
    }
  }
};

export const catchBursts: Rule = (world, frame) => {
  for (const burst of frame.catches.bursts) addBurstEffect(world, burst.x, burst.y, burst.radius);
};

// Same-role pairs bump; predator-prey pairs never bounce, or catches could not register.
export const collisions: Rule = (world, frame) => {
  const { objects } = world;
  const destroyed = frame.catches.destroyedPreyIds;
  for (let first = 0; first < objects.length; first += 1) {
    for (let second = first + 1; second < objects.length; second += 1) {
      const a = objects[first];
      const b = objects[second];
      if (destroyed.has(a.id) || destroyed.has(b.id)) continue;
      if (a.role === b.role) resolveCircleCollision(a, b, world.rng.range(-0.08, 0.08));
    }
  }
};

export const removeFinished: Rule = (world, frame) => {
  const ready = new Set<number>(frame.catches.destroyedPreyIds);
  for (const object of world.objects) {
    if (object.vanishElapsed !== null && object.vanishElapsed >= VANISH_DURATION_SECONDS) ready.add(object.id);
  }
  if (ready.size === 0) return;
  // The first death ends the playground's centred spawn bias.
  world.spawnBiasActive = false;
  for (let index = world.objects.length - 1; index >= 0; index -= 1) {
    if (ready.has(world.objects[index].id)) world.objects.splice(index, 1);
  }
};

export const ageEffects: Rule = (world, frame) => {
  const { effects } = world;
  for (let index = effects.length - 1; index >= 0; index -= 1) {
    const effect = effects[index];
    effect.age += frame.dt;
    effect.alpha = 1 - effect.age / effect.lifetime;
    if (effect.age >= effect.lifetime) effects.splice(index, 1);
  }
};

export const populationFlow: Rule = (world, frame) => {
  world.population = stepLotkaVolterra(world.population, frame.dt);
  topUpPopulation(world, frame.now);
};

export const DEFAULT_RULES: readonly Rule[] = [
  assignFlocks,
  moveObjects,
  resolveCatchRule,
  flockKills,
  populationEvents,
  scarcityPenalty,
  catchBursts,
  collisions,
  removeFinished,
  ageEffects,
  populationFlow,
];

const NO_CATCHES: CatchResolution = {
  winnerIds: new Set(),
  loserIds: new Set(),
  destroyedPreyIds: new Set(),
  bursts: [],
};

/** Advance the world by dt seconds at time now (ms). Extra rules run after the defaults. */
export function step(world: World, dt: number, now: number, extraRules: readonly Rule[] = []): void {
  const frame: StepFrame = {
    dt,
    now,
    wasVanishing: new Set(world.objects.filter((o) => o.vanishElapsed !== null).map((o) => o.id)),
    catches: NO_CATCHES,
  };
  for (const rule of DEFAULT_RULES) rule(world, frame);
  for (const rule of extraRules) rule(world, frame);
}
