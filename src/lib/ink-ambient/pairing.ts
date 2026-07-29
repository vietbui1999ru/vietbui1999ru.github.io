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
  PREDATOR_SPEED_MULTIPLIER_MAX,
  PREDATOR_SPEED_MULTIPLIER_MIN,
  PREDATOR_WOBBLE_FACTOR,
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

export function pairForceMultiplier(a: InkObject, b: InkObject): number {
  return clamp(a.attractionValue * b.attractionValue, PAIR_FORCE_MIN, PAIR_FORCE_MAX);
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

export function formPair(a: InkObject, b: InkObject, rng: SeededRng): void {
  a.partnerId = b.id;
  b.partnerId = a.id;
  a.formerPartnerId = null;
  b.formerPartnerId = null;
  a.motionBlend = { from: { ...a.lastAcceleration }, elapsed: 0, duration: MOTION_BLEND_SECONDS };
  b.motionBlend = { from: { ...b.lastAcceleration }, elapsed: 0, duration: MOTION_BLEND_SECONDS };

  const aIsPredator = rng.chance(0.5);
  a.role = aIsPredator ? "predator" : "prey";
  b.role = aIsPredator ? "prey" : "predator";
  const predator = aIsPredator ? a : b;
  const prey = aIsPredator ? b : a;
  prey.chaseSpeed = rollPreySpeed(prey, rng);
  predator.chaseSpeed = prey.chaseSpeed * rollPredatorMultiplier(predator, rng);
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
  thrown.motionBlend = { from: { ...thrown.lastAcceleration }, elapsed: 0, duration: MOTION_BLEND_SECONDS };
  partner.motionBlend = { from: { ...partner.lastAcceleration }, elapsed: 0, duration: MOTION_BLEND_SECONDS };

  const thrownIsPredator = rng.chance(0.5);
  const throwSpeed = length(thrown.velocity);

  if (thrownIsPredator) {
    thrown.role = "predator";
    partner.role = "prey";
    const multiplier = rollPredatorMultiplier(thrown, rng);
    thrown.chaseSpeed = Math.max(throwSpeed, PREY_SPEED_MIN * PREDATOR_SPEED_MULTIPLIER_MIN);
    partner.chaseSpeed = clamp(thrown.chaseSpeed / multiplier, PREY_SPEED_MIN, PREY_SPEED_MAX);
  } else {
    thrown.role = "prey";
    partner.role = "predator";
    thrown.chaseSpeed = clamp(throwSpeed, PREY_SPEED_MIN, PREY_THROW_SPEED_MAX);
    partner.chaseSpeed = thrown.chaseSpeed * rollPredatorMultiplier(partner, rng);
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

export function pairAcceleration(
  object: InkObject,
  partner: InkObject,
  maxAcceleration: number,
  now: number,
): Vec2 {
  const direction = normalize(subtract(partner.position, object.position));
  const baseMagnitude = clamp(
    ATTRACTION_BASE_ACCELERATION * pairForceMultiplier(object, partner),
    0,
    maxAcceleration,
  );
  const magnitude = baseMagnitude * pairApproachRamp(object, partner);
  const acceleration = { x: direction.x * magnitude, y: direction.y * magnitude };

  // Fade a small seeded wobble to zero as the pair closes in, so the final
  // approach reads clean rather than jittery right before collision.
  const closeDistance = (object.radius + partner.radius) * 2;
  const currentDistance = pairDistance(object, partner);
  const wobbleFade = clamp((currentDistance - closeDistance) / closeDistance, 0, 1);
  if (wobbleFade > 0) {
    const t = now / 1000 + object.wobblePhase;
    const wobbleMagnitude = baseMagnitude * 0.25 * wobbleFade;
    acceleration.x += Math.sin(t * object.wobbleFrequency * 1.7) * wobbleMagnitude;
    acceleration.y += Math.cos(t * object.wobbleFrequency * 1.3) * wobbleMagnitude;
  }
  return acceleration;
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
