import {
  ATTRACTION_BASE_ACCELERATION,
  FLOCK_ALIGNMENT_WEIGHT,
  FLOCK_COHESION_WEIGHT,
  FLOCK_HUNT_WEIGHT,
  FLOCK_MIN_SIZE,
  FLOCK_KEEP_RADIUS,
  FLOCK_KILL_RADIUS_FRACTION,
  FLOCK_RADIUS,
  FLOCK_TARGET_SWITCH_MARGIN,
  FLOCK_SEPARATION_DISTANCE,
  FLOCK_SEPARATION_WEIGHT,
  PAIR_FORCE_MAX,
  PAIR_FORCE_MIN,
} from "./config";
import { clamp, distance, normalize, subtract } from "./physics";
import { preyAcceleration } from "./targeting";
import type { InkObject, Vec2 } from "./types";

/** Flock rule values (issue #22); the defaults are the config.ts constants. */
export interface FlockParams {
  radius: number;
  minSize: number;
  switchMargin: number;
}

export const DEFAULT_FLOCK_PARAMS: Readonly<FlockParams> = Object.freeze({
  radius: FLOCK_RADIUS,
  minSize: FLOCK_MIN_SIZE,
  switchMargin: FLOCK_TARGET_SWITCH_MARGIN,
});

// The keep radius stays the same multiple of the link radius when the radius changes.
const KEEP_RADIUS_RATIO = FLOCK_KEEP_RADIUS / FLOCK_RADIUS;

function isAlive(object: InkObject): boolean {
  return object.vanishElapsed === null;
}

/**
 * Prey linked by chains of neighbours closer than FLOCK_RADIUS, with at least
 * FLOCK_MIN_SIZE members. Two prey that were both in a hunting flock last step stay
 * linked up to FLOCK_KEEP_RADIUS, so a flock at the edge of the radius does not
 * break up and re-form every few frames.
 */
export function detectFlocks(
  objects: readonly InkObject[],
  previousMemberIds: ReadonlySet<number> = new Set(),
  params: Readonly<FlockParams> = DEFAULT_FLOCK_PARAMS,
): InkObject[][] {
  const keepRadius = params.radius * KEEP_RADIUS_RATIO;
  const prey = objects.filter((o) => o.role === "prey" && isAlive(o) && !o.grabbed);
  const visited = new Set<number>();
  const flocks: InkObject[][] = [];

  for (const start of prey) {
    if (visited.has(start.id)) continue;
    const component: InkObject[] = [];
    const stack = [start];
    visited.add(start.id);
    while (stack.length > 0) {
      const current = stack.pop()!;
      component.push(current);
      for (const candidate of prey) {
        if (visited.has(candidate.id)) continue;
        const linkRadius =
          previousMemberIds.has(current.id) && previousMemberIds.has(candidate.id)
            ? keepRadius
            : params.radius;
        if (distance(current.position, candidate.position) < linkRadius) {
          visited.add(candidate.id);
          stack.push(candidate);
        }
      }
    }
    if (component.length >= params.minSize) flocks.push(component);
  }

  return flocks;
}

function centroid(members: readonly InkObject[]): Vec2 {
  const sum = members.reduce(
    (acc, member) => ({ x: acc.x + member.position.x, y: acc.y + member.position.y }),
    { x: 0, y: 0 },
  );
  return { x: sum.x / members.length, y: sum.y / members.length };
}

export function selectFlockTarget(
  members: readonly InkObject[],
  objects: readonly InkObject[],
): InkObject | null {
  const memberIds = new Set(members.map((member) => member.id));
  const candidates = objects.filter(
    (object) =>
      object.role === "predator" &&
      isAlive(object) &&
      object.currentTargetId !== null &&
      memberIds.has(object.currentTargetId),
  );
  if (candidates.length === 0) return null;

  const center = centroid(members);
  let best: InkObject | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const candidate of candidates) {
    const d = distance(center, candidate.position);
    if (best === null || d < bestDistance || (d === bestDistance && candidate.id < best.id)) {
      best = candidate;
      bestDistance = d;
    }
  }
  return best;
}

export interface FlockAssignment {
  huntingFlockIds: Set<number>;
  beingHuntedIds: Set<number>;
  targetByMemberId: Map<number, InkObject>;
  flockByMemberId: Map<number, InkObject[]>;
  flockByTargetPredatorId: Map<number, InkObject[]>;
}

/**
 * The predator this flock already hunted last step, if it is still alive. When
 * members held different targets (flocks merged), the one most members held wins;
 * ties go to the lower id.
 */
export function heldFlockTarget(
  members: readonly InkObject[],
  previousTargetByMemberId: ReadonlyMap<number, InkObject>,
  objects: readonly InkObject[],
): InkObject | null {
  const votes = new Map<number, number>();
  for (const member of members) {
    const previous = previousTargetByMemberId.get(member.id);
    if (previous) votes.set(previous.id, (votes.get(previous.id) ?? 0) + 1);
  }
  let best: InkObject | null = null;
  let bestVotes = 0;
  for (const [id, count] of votes) {
    const predator = objects.find((o) => o.id === id && o.role === "predator" && isAlive(o));
    if (!predator) continue;
    if (count > bestVotes || (count === bestVotes && best !== null && id < best.id)) {
      best = predator;
      bestVotes = count;
    }
  }
  return best;
}

/**
 * Keep the held predator unless the nearest candidate is closer to the flock centre
 * by more than FLOCK_TARGET_SWITCH_MARGIN of the held distance. Small changes in
 * distance then never swap the target, while a much closer predator still does.
 */
export function chooseFlockTarget(
  members: readonly InkObject[],
  held: InkObject | null,
  nearest: InkObject | null,
  switchMargin = FLOCK_TARGET_SWITCH_MARGIN,
): InkObject | null {
  if (!held || !nearest || nearest.id === held.id) return held ?? nearest;
  const center = centroid(members);
  const heldDistance = distance(center, held.position);
  const nearestDistance = distance(center, nearest.position);
  return nearestDistance < heldDistance * (1 - switchMargin) ? nearest : held;
}

/**
 * Pick one hunted predator per flock. A flock keeps the predator it already hunts
 * (see heldFlockTarget), so the hunted tint does not jump between candidate
 * predators or drop out while the hunted predator flees and retargets.
 */
export function computeFlockAssignments(
  objects: readonly InkObject[],
  previousTargetByMemberId: ReadonlyMap<number, InkObject> = new Map(),
  params: Readonly<FlockParams> = DEFAULT_FLOCK_PARAMS,
): FlockAssignment {
  const huntingFlockIds = new Set<number>();
  const beingHuntedIds = new Set<number>();
  const targetByMemberId = new Map<number, InkObject>();
  const flockByMemberId = new Map<number, InkObject[]>();
  const flockByTargetPredatorId = new Map<number, InkObject[]>();

  const previousMemberIds = new Set(previousTargetByMemberId.keys());
  for (const members of detectFlocks(objects, previousMemberIds, params)) {
    const target = chooseFlockTarget(
      members,
      heldFlockTarget(members, previousTargetByMemberId, objects),
      selectFlockTarget(members, objects),
      params.switchMargin,
    );
    if (!target) continue;
    beingHuntedIds.add(target.id);
    flockByTargetPredatorId.set(target.id, members);
    for (const member of members) {
      huntingFlockIds.add(member.id);
      targetByMemberId.set(member.id, target);
      flockByMemberId.set(member.id, members);
    }
  }

  return { huntingFlockIds, beingHuntedIds, targetByMemberId, flockByMemberId, flockByTargetPredatorId };
}

function localNeighbors(
  object: InkObject,
  flockMembers: readonly InkObject[],
  radius: number,
): InkObject[] {
  return flockMembers.filter(
    (member) => member.id !== object.id && distance(object.position, member.position) < radius,
  );
}

export function cohesionDirection(
  object: InkObject,
  flockMembers: readonly InkObject[],
  radius = FLOCK_RADIUS,
): Vec2 {
  const neighbors = localNeighbors(object, flockMembers, radius);
  if (neighbors.length === 0) return { x: 0, y: 0 };
  return normalize(subtract(centroid(neighbors), object.position));
}

export function separationDirection(object: InkObject, flockMembers: readonly InkObject[]): Vec2 {
  const tooClose = localNeighbors(object, flockMembers, FLOCK_SEPARATION_DISTANCE);
  if (tooClose.length === 0) return { x: 0, y: 0 };
  let x = 0;
  let y = 0;
  for (const neighbor of tooClose) {
    const away = normalize(subtract(object.position, neighbor.position));
    x += away.x;
    y += away.y;
  }
  return normalize({ x, y });
}

export function alignmentDirection(
  object: InkObject,
  flockMembers: readonly InkObject[],
  radius = FLOCK_RADIUS,
): Vec2 {
  const neighbors = localNeighbors(object, flockMembers, radius);
  if (neighbors.length === 0) return { x: 0, y: 0 };
  const sum = neighbors.reduce(
    (acc, neighbor) => ({ x: acc.x + neighbor.velocity.x, y: acc.y + neighbor.velocity.y }),
    { x: 0, y: 0 },
  );
  return normalize(sum);
}

export function flockHuntAcceleration(
  object: InkObject,
  targetPredator: InkObject,
  flockMembers: readonly InkObject[],
  maxAcceleration: number,
  radius = FLOCK_RADIUS,
): Vec2 {
  const hunt = normalize(subtract(targetPredator.position, object.position));
  const cohesion = cohesionDirection(object, flockMembers, radius);
  const separation = separationDirection(object, flockMembers);
  const alignment = alignmentDirection(object, flockMembers, radius);

  const combined: Vec2 = {
    x:
      FLOCK_HUNT_WEIGHT * hunt.x +
      FLOCK_COHESION_WEIGHT * cohesion.x +
      FLOCK_SEPARATION_WEIGHT * separation.x +
      FLOCK_ALIGNMENT_WEIGHT * alignment.x,
    y:
      FLOCK_HUNT_WEIGHT * hunt.y +
      FLOCK_COHESION_WEIGHT * cohesion.y +
      FLOCK_SEPARATION_WEIGHT * separation.y +
      FLOCK_ALIGNMENT_WEIGHT * alignment.y,
  };
  const direction = normalize(combined);
  const driveMultiplier = clamp(object.attractionValue, PAIR_FORCE_MIN, PAIR_FORCE_MAX);
  const magnitude = clamp(ATTRACTION_BASE_ACCELERATION * driveMultiplier, 0, maxAcceleration);
  return { x: direction.x * magnitude, y: direction.y * magnitude };
}

/** A flock kills its predator once any member touches it: within
 * (predator.radius + member.radius) * reach, the contact rule of the normal catch. */
export function isFlockKillTriggered(
  predator: InkObject,
  flockMembers: readonly InkObject[],
  reach = FLOCK_KILL_RADIUS_FRACTION,
): boolean {
  return flockMembers.some(
    (member) => distance(predator.position, member.position) < (predator.radius + member.radius) * reach,
  );
}

/** A predator being hunted by a flock acts as prey (behavior only — its
 * role never changes): it flees the nearest flock member exactly like
 * ordinary prey flee the nearest predator, via the same preyAcceleration
 * formula. If the flock catches it anyway, it's destroyed outright, not
 * converted into a new prey object (see the kill-trigger pass). */
export function predatorFleeAcceleration(
  predator: InkObject,
  hunters: readonly InkObject[],
  maxAcceleration: number,
  now: number,
): Vec2 {
  let nearest: InkObject | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;
  for (const hunter of hunters) {
    const d = distance(predator.position, hunter.position);
    if (nearest === null || d < nearestDistance) {
      nearest = hunter;
      nearestDistance = d;
    }
  }
  if (!nearest) return { x: 0, y: 0 };
  return preyAcceleration(predator, nearest, maxAcceleration, now);
}
