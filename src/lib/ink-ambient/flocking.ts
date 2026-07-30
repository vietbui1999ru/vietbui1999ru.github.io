import {
  ATTRACTION_BASE_ACCELERATION,
  FLOCK_ALIGNMENT_WEIGHT,
  FLOCK_COHESION_WEIGHT,
  FLOCK_HUNT_WEIGHT,
  FLOCK_MIN_SIZE,
  FLOCK_RADIUS,
  FLOCK_SEPARATION_DISTANCE,
  FLOCK_SEPARATION_WEIGHT,
  PAIR_FORCE_MAX,
  PAIR_FORCE_MIN,
} from "./config";
import { clamp, distance, normalize, subtract } from "./physics";
import type { InkObject, Vec2 } from "./types";

function isAlive(object: InkObject): boolean {
  return object.vanishElapsed === null;
}

export function detectFlocks(objects: readonly InkObject[]): InkObject[][] {
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
        if (distance(current.position, candidate.position) < FLOCK_RADIUS) {
          visited.add(candidate.id);
          stack.push(candidate);
        }
      }
    }
    if (component.length >= FLOCK_MIN_SIZE) flocks.push(component);
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

export function computeFlockAssignments(objects: readonly InkObject[]): FlockAssignment {
  const huntingFlockIds = new Set<number>();
  const beingHuntedIds = new Set<number>();
  const targetByMemberId = new Map<number, InkObject>();
  const flockByMemberId = new Map<number, InkObject[]>();
  const flockByTargetPredatorId = new Map<number, InkObject[]>();

  for (const members of detectFlocks(objects)) {
    const target = selectFlockTarget(members, objects);
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

export function cohesionDirection(object: InkObject, flockMembers: readonly InkObject[]): Vec2 {
  const neighbors = localNeighbors(object, flockMembers, FLOCK_RADIUS);
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

export function alignmentDirection(object: InkObject, flockMembers: readonly InkObject[]): Vec2 {
  const neighbors = localNeighbors(object, flockMembers, FLOCK_RADIUS);
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
): Vec2 {
  const hunt = normalize(subtract(targetPredator.position, object.position));
  const cohesion = cohesionDirection(object, flockMembers);
  const separation = separationDirection(object, flockMembers);
  const alignment = alignmentDirection(object, flockMembers);

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

export function isFlockKillTriggered(predator: InkObject, flockMembers: readonly InkObject[]): boolean {
  return flockMembers.some((member) => distance(predator.position, member.position) < FLOCK_RADIUS);
}
