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
  PREDATOR_CHASE_ACCEL_MAX_MULTIPLIER,
  PREDATOR_CHASE_ACCEL_SECONDS,
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

/** A predator sustaining a chase on the same target speeds up the longer it
 * goes on, reaching PREDATOR_CHASE_ACCEL_MAX_MULTIPLIER after
 * PREDATOR_CHASE_ACCEL_SECONDS of uninterrupted pursuit. `chaseElapsed`
 * resets to 0 whenever the tracked target changes (see updateTarget). */
export function chaseAccelerationMultiplier(chaseElapsed: number): number {
  const t = clamp(chaseElapsed / PREDATOR_CHASE_ACCEL_SECONDS, 0, 1);
  return 1 + (PREDATOR_CHASE_ACCEL_MAX_MULTIPLIER - 1) * t;
}
