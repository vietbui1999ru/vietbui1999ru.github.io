// Input rules for grabbing objects, shared by mouse, touch and pen. Framework-free,
// so they can be tested without a browser (issue #26).
import { MOUSE_DRAG_THRESHOLD, MOUSE_HIT_SLOP, TOUCH_DRAG_THRESHOLD, TOUCH_HIT_SLOP } from "./config";
import type { InkObject } from "./types";

const ACCEPTED_POINTERS = new Set(["mouse", "touch", "pen"]);

export function acceptsPointer(pointerType: string): boolean {
  return ACCEPTED_POINTERS.has(pointerType);
}

/** Extra hit radius around an object: a fingertip covers far more than a cursor. */
export function hitSlop(pointerType: string): number {
  return pointerType === "mouse" ? MOUSE_HIT_SLOP : TOUCH_HIT_SLOP;
}

/** Movement before a press becomes a drag, so a tap does not jitter the object. */
export function dragThreshold(pointerType: string): number {
  return pointerType === "mouse" ? MOUSE_DRAG_THRESHOLD : TOUCH_DRAG_THRESHOLD;
}

/** The nearest live object whose radius plus slop contains (x, y), or null. */
export function findGrabTarget(
  objects: readonly InkObject[],
  x: number,
  y: number,
  pointerType: string,
): InkObject | null {
  const slop = hitSlop(pointerType);
  let best: InkObject | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const object of objects) {
    if (object.vanishElapsed !== null) continue;
    const distance = Math.hypot(object.position.x - x, object.position.y - y);
    if (distance <= object.radius + slop && distance < bestDistance) {
      best = object;
      bestDistance = distance;
    }
  }
  return best;
}
