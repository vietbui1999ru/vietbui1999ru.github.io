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
  PREDATOR_RADIUS_MAX,
  PREDATOR_RADIUS_MIN,
  PREDATOR_SPEED_MULTIPLIER_MAX,
  PREDATOR_SPEED_MULTIPLIER_MIN,
  PREDATOR_WOBBLE_FACTOR,
  PREY_RADIUS_MAX,
  PREY_RADIUS_MIN,
  PREY_SPEED_MAX,
  PREY_SPEED_MIN,
  PREY_THROW_SPEED_MAX,
  PREY_WOBBLE_FACTOR,
} from "./config";
import { clamp, length, normalize, subtract } from "./physics";
import type { SeededRng } from "./rng";
import type { InkObject, Vec2 } from "./types";

export function findNearestAvailable(
  object: InkObject,
  objects: readonly InkObject[],
): InkObject | null {
  let best: InkObject | null = null;
  let bestDistanceSquared = Number.POSITIVE_INFINITY;
  for (const candidate of objects) {
    if (candidate.id === object.id || candidate.partnerId !== null || candidate.grabbed) continue;
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
  return (
    PREDATOR_SPEED_MULTIPLIER_MIN +
    (PREDATOR_SPEED_MULTIPLIER_MAX - PREDATOR_SPEED_MULTIPLIER_MIN) * t
  );
}

/**
 * Roles are sticky: an object that already has a role (from a previous
 * pairing) keeps it rather than being re-flipped by a coin toss — otherwise
 * dragging one object out of a pair and releasing it can visibly swap it
 * (and its new partner) from predator to prey or back, which read as
 * arbitrary/buggy once shape was tied to role. Only rolls a fresh coin flip
 * when neither object has an established role (brand-new pairing) or both
 * claim the same role (a rare reshuffle conflict with no clear precedent).
 */
function resolveStickyRoles(
  a: InkObject,
  b: InkObject,
  rng: SeededRng,
): { predator: InkObject; prey: InkObject } {
  if (a.role === "predator" && b.role !== "predator") return { predator: a, prey: b };
  if (b.role === "predator" && a.role !== "predator") return { predator: b, prey: a };
  if (a.role === "prey" && b.role !== "prey") return { predator: b, prey: a };
  if (b.role === "prey" && a.role !== "prey") return { predator: a, prey: b };
  const aIsPredator = rng.chance(0.5);
  return aIsPredator ? { predator: a, prey: b } : { predator: b, prey: a };
}

export function formPair(a: InkObject, b: InkObject, rng: SeededRng): void {
  a.partnerId = b.id;
  b.partnerId = a.id;
  a.formerPartnerId = null;
  b.formerPartnerId = null;
  a.motionBlend = { from: { ...a.lastAcceleration }, elapsed: 0, duration: MOTION_BLEND_SECONDS };
  b.motionBlend = { from: { ...b.lastAcceleration }, elapsed: 0, duration: MOTION_BLEND_SECONDS };

  const { predator, prey } = resolveStickyRoles(a, b, rng);
  predator.role = "predator";
  prey.role = "prey";
  prey.chaseSpeed = rollPreySpeed(prey, rng);
  predator.chaseSpeed = prey.chaseSpeed * rollPredatorMultiplier(predator, rng);
  prey.radius = rng.range(PREY_RADIUS_MIN, PREY_RADIUS_MAX);
  predator.radius = rng.range(PREDATOR_RADIUS_MIN, PREDATOR_RADIUS_MAX);
}

export function formInitialPairs(objects: InkObject[], rng: SeededRng): void {
  const sorted = [...objects].sort((a, b) => a.id - b.id);
  for (const object of sorted) {
    if (object.partnerId !== null) continue;
    const partner = findNearestAvailable(object, objects);
    if (partner) formPair(object, partner, rng);
  }
}

export function detachPair(object: InkObject, objects: readonly InkObject[]): void {
  const partner =
    object.partnerId !== null
      ? (objects.find((candidate) => candidate.id === object.partnerId) ?? null)
      : null;
  object.formerPartnerId = object.partnerId;
  object.partnerId = null;
  if (partner) {
    partner.formerPartnerId = object.id;
    partner.partnerId = null;
    partner.motionBlend = {
      from: { ...partner.lastAcceleration },
      elapsed: 0,
      duration: MOTION_BLEND_SECONDS,
    };
  }
}

function recalibratePair(thrown: InkObject, partner: InkObject, rng: SeededRng): void {
  thrown.partnerId = partner.id;
  partner.partnerId = thrown.id;
  thrown.formerPartnerId = null;
  partner.formerPartnerId = null;
  thrown.motionBlend = {
    from: { ...thrown.lastAcceleration },
    elapsed: 0,
    duration: MOTION_BLEND_SECONDS,
  };
  partner.motionBlend = {
    from: { ...partner.lastAcceleration },
    elapsed: 0,
    duration: MOTION_BLEND_SECONDS,
  };

  const throwSpeed = length(thrown.velocity);
  const { predator, prey } = resolveStickyRoles(thrown, partner, rng);
  predator.role = "predator";
  prey.role = "prey";

  if (thrown === predator) {
    const multiplier = rollPredatorMultiplier(predator, rng);
    predator.chaseSpeed = Math.max(throwSpeed, PREY_SPEED_MIN * PREDATOR_SPEED_MULTIPLIER_MIN);
    prey.chaseSpeed = clamp(predator.chaseSpeed / multiplier, PREY_SPEED_MIN, PREY_SPEED_MAX);
    predator.radius = rng.range(PREDATOR_RADIUS_MIN, PREDATOR_RADIUS_MAX);
    prey.radius = rng.range(PREY_RADIUS_MIN, PREY_RADIUS_MAX);
  } else {
    prey.chaseSpeed = clamp(throwSpeed, PREY_SPEED_MIN, PREY_THROW_SPEED_MAX);
    predator.chaseSpeed = prey.chaseSpeed * rollPredatorMultiplier(predator, rng);
    prey.radius = rng.range(PREY_RADIUS_MIN, PREY_RADIUS_MAX);
    predator.radius = rng.range(PREDATOR_RADIUS_MIN, PREDATOR_RADIUS_MAX);
  }
}

export function reevaluatePartner(
  object: InkObject,
  objects: readonly InkObject[],
  rng: SeededRng,
): void {
  const nearest = findNearestAvailable(object, objects);
  const oldPartnerId = object.formerPartnerId;
  if (nearest) recalibratePair(object, nearest, rng);
  if (oldPartnerId !== null && oldPartnerId !== nearest?.id) {
    const oldPartner = objects.find((candidate) => candidate.id === oldPartnerId) ?? null;
    if (oldPartner && oldPartner.partnerId === null) {
      const oldPartnerNearest = findNearestAvailable(oldPartner, objects);
      if (oldPartnerNearest) formPair(oldPartner, oldPartnerNearest, rng);
    }
  }
  object.formerPartnerId = null;
}

function pairDistance(object: InkObject, partner: InkObject): number {
  return Math.hypot(partner.position.x - object.position.x, partner.position.y - object.position.y);
}

/**
 * 1 when a pair is far apart, ramping up to ATTRACTION_RAMP_MAX as they close
 * in on touching — a dramatic final rush into the collision rather than a
 * constant approach speed.
 */
export function pairApproachRamp(object: InkObject, partner: InkObject): number {
  const closeDistance = (object.radius + partner.radius) * 2;
  const rampStart = (object.radius + partner.radius) * ATTRACTION_RAMP_START_MULTIPLIER;
  const currentDistance = pairDistance(object, partner);
  const proximity = clamp(
    1 - (currentDistance - closeDistance) / (rampStart - closeDistance),
    0,
    1,
  );
  return 1 + proximity * proximity * (ATTRACTION_RAMP_MAX - 1);
}

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

function driveMultiplier(object: InkObject): number {
  return clamp(object.attractionValue, PAIR_FORCE_MIN, PAIR_FORCE_MAX);
}

function lateralWobbleScalar(
  object: InkObject,
  magnitude: number,
  wobbleFactor: number,
  now: number,
): number {
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
  const magnitude = clamp(
    ATTRACTION_BASE_ACCELERATION * driveMultiplier(object) * ramp,
    0,
    maxAcceleration,
  );
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
  const magnitude = clamp(
    ATTRACTION_BASE_ACCELERATION * driveMultiplier(object),
    0,
    maxAcceleration,
  );
  const perpendicular = { x: -direction.y, y: direction.x };
  const panicRamp = preyPanicRamp(object, predator);
  const wobble = lateralWobbleScalar(object, magnitude, PREY_WOBBLE_FACTOR * panicRamp, now);
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
