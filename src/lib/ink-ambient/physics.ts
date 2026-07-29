import { OBJECT_TIP_OFFSET_FRACTION } from "./config";
import type { InkObject, Rect, Vec2 } from "./types";

export const ZERO: Vec2 = { x: 0, y: 0 };

/**
 * World position of the object's sprite tip (the pen/pencil nib), forward of
 * center along the object's current heading. Used for trail sampling so ink
 * appears to flow from the nib rather than the object's center.
 */
export function tipPosition(object: Pick<InkObject, "position" | "rotation" | "radius">): Vec2 {
  return {
    x: object.position.x + Math.cos(object.rotation) * object.radius * OBJECT_TIP_OFFSET_FRACTION,
    y: object.position.y + Math.sin(object.rotation) * object.radius * OBJECT_TIP_OFFSET_FRACTION,
  };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function length(vector: Vec2): number {
  return Math.hypot(vector.x, vector.y);
}

export function distance(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function normalize(vector: Vec2): Vec2 {
  const size = length(vector);
  return size > 0.0001 ? { x: vector.x / size, y: vector.y / size } : { x: 0, y: 0 };
}

export function add(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function subtract(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function scale(vector: Vec2, amount: number): Vec2 {
  return { x: vector.x * amount, y: vector.y * amount };
}

export function limit(vector: Vec2, max: number): Vec2 {
  const size = length(vector);
  return size > max ? scale(vector, max / size) : vector;
}

export function integrate(object: InkObject, acceleration: Vec2, dt: number): void {
  object.velocity.x += acceleration.x * dt;
  object.velocity.y += acceleration.y * dt;
  object.position.x += object.velocity.x * dt;
  object.position.y += object.velocity.y * dt;
}

export function applyHeadingRotation(object: InkObject, dt: number, smoothing = 6): number {
  let headingDelta = 0;
  if (length(object.velocity) > 4) {
    const target = Math.atan2(object.velocity.y, object.velocity.x);
    let delta = (target - object.rotation) % (Math.PI * 2);
    if (delta > Math.PI) delta -= Math.PI * 2;
    if (delta < -Math.PI) delta += Math.PI * 2;
    headingDelta = delta * Math.min(1, dt * smoothing);
    object.rotation += headingDelta;
  }
  const spin = object.angularVelocity * dt;
  object.rotation += spin;
  return headingDelta + spin;
}

const TURN_SQUASH_ANGULAR_VELOCITY_CAP = 8;
const TURN_SQUASH_STRENGTH = 0.12;

export function updateTurnSquash(object: InkObject, rotationDelta: number, dt: number): number {
  const instantaneous = dt > 0 ? Math.abs(rotationDelta / dt) : 0;
  object.smoothedAngularVelocity =
    object.smoothedAngularVelocity * 0.6 +
    Math.min(instantaneous, TURN_SQUASH_ANGULAR_VELOCITY_CAP) * 0.4;
  return (object.smoothedAngularVelocity / TURN_SQUASH_ANGULAR_VELOCITY_CAP) * TURN_SQUASH_STRENGTH;
}

export function applyDrag(object: InkObject, drag: number, dt: number): void {
  const factor = Math.pow(Math.max(0, 1 - drag), dt * 60);
  object.velocity.x *= factor;
  object.velocity.y *= factor;
  object.angularVelocity *= factor;
}

export type CollisionResult = { hit: boolean; impulse: number };

export function resolveCircleCollision(
  a: InkObject,
  b: InkObject,
  tangentialImpulse = 0,
): CollisionResult {
  const dx = b.position.x - a.position.x;
  const dy = b.position.y - a.position.y;
  const minimumDistance = a.radius + b.radius;
  const distanceSquared = dx * dx + dy * dy;
  if (distanceSquared >= minimumDistance * minimumDistance) return { hit: false, impulse: 0 };

  const currentDistance = Math.sqrt(distanceSquared) || 0.001;
  const normalX = dx / currentDistance;
  const normalY = dy / currentDistance;
  const overlap = minimumDistance - currentDistance;
  const totalMass = a.mass + b.mass;

  a.position.x -= normalX * overlap * (b.mass / totalMass);
  a.position.y -= normalY * overlap * (b.mass / totalMass);
  b.position.x += normalX * overlap * (a.mass / totalMass);
  b.position.y += normalY * overlap * (a.mass / totalMass);

  const relativeVelocityX = b.velocity.x - a.velocity.x;
  const relativeVelocityY = b.velocity.y - a.velocity.y;
  const separatingVelocity = relativeVelocityX * normalX + relativeVelocityY * normalY;

  let impulseMagnitude = 0;
  if (separatingVelocity < 0) {
    const restitution = 0.38;
    const impulse = (-separatingVelocity * (1 + restitution)) / (1 / a.mass + 1 / b.mass);
    impulseMagnitude = impulse;
    a.velocity.x -= (impulse * normalX) / a.mass;
    a.velocity.y -= (impulse * normalY) / a.mass;
    b.velocity.x += (impulse * normalX) / b.mass;
    b.velocity.y += (impulse * normalY) / b.mass;
  }

  const tangentX = -normalY;
  const tangentY = normalX;
  a.velocity.x -= tangentX * tangentialImpulse;
  a.velocity.y -= tangentY * tangentialImpulse;
  b.velocity.x += tangentX * tangentialImpulse;
  b.velocity.y += tangentY * tangentialImpulse;
  return { hit: true, impulse: impulseMagnitude };
}

export function circlesOverlap(
  a: Pick<InkObject, "position" | "radius">,
  b: Pick<InkObject, "position" | "radius">,
): boolean {
  const dx = b.position.x - a.position.x;
  const dy = b.position.y - a.position.y;
  const minDistance = a.radius + b.radius;
  return dx * dx + dy * dy < minDistance * minDistance;
}

export function boundarySteeringForce(
  object: InkObject,
  width: number,
  height: number,
  strength = 90,
): Vec2 {
  const margin = object.radius * 1.4;
  let x = 0;
  let y = 0;
  if (object.position.x < margin) x += ((margin - object.position.x) / margin) * strength;
  if (object.position.x > width - margin)
    x -= ((object.position.x - (width - margin)) / margin) * strength;
  if (object.position.y < margin) y += ((margin - object.position.y) / margin) * strength;
  if (object.position.y > height - margin)
    y -= ((object.position.y - (height - margin)) / margin) * strength;
  return { x, y };
}

export function clampToViewport(object: InkObject, width: number, height: number): void {
  object.position.x = clamp(object.position.x, object.radius, width - object.radius);
  object.position.y = clamp(object.position.y, object.radius, height - object.radius);
}

export function nearestPointOnRect(point: Vec2, rect: Rect): Vec2 {
  return {
    x: clamp(point.x, rect.x, rect.x + rect.width),
    y: clamp(point.y, rect.y, rect.y + rect.height),
  };
}

export function obstacleRepulsion(
  object: InkObject,
  obstacles: readonly Rect[],
  clearance: number,
  strength = 60,
): Vec2 {
  let x = 0;
  let y = 0;
  const threshold = object.radius + clearance;
  for (const obstacle of obstacles) {
    const nearest = nearestPointOnRect(object.position, obstacle);
    const away = subtract(object.position, nearest);
    const dist = length(away);
    if (dist < threshold) {
      const push = normalize(away);
      const factor = (threshold - dist) / threshold;
      x += push.x * factor * strength;
      y += push.y * factor * strength;
    }
  }
  return { x, y };
}

export function fixedStepAccumulator(
  elapsed: number,
  accumulator: number,
  step: number,
  maxSteps: number,
  update: (dt: number) => void,
): number {
  let remaining = accumulator + Math.min(elapsed, step * maxSteps);
  let steps = 0;
  while (remaining >= step && steps < maxSteps) {
    update(step);
    remaining -= step;
    steps += 1;
  }
  return remaining;
}
