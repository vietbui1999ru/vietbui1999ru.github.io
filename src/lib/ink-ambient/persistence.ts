import { SNAPSHOT_KEY, SNAPSHOT_MAX_AGE } from "./config";
import type { InkObject, InkSnapshot } from "./types";

export function loadSnapshot(now = Date.now()): InkSnapshot | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SNAPSHOT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<InkSnapshot>;
    if (
      parsed.version !== 2 ||
      typeof parsed.savedAt !== "number" ||
      now - parsed.savedAt > SNAPSHOT_MAX_AGE ||
      !Array.isArray(parsed.objects)
    )
      return null;
    const ids = new Set<number>();
    const objects = parsed.objects.filter((object) => {
      const valid =
        object &&
        typeof object.id === "number" &&
        !ids.has(object.id) &&
        Number.isFinite(object.position?.x) &&
        Number.isFinite(object.position?.y) &&
        object.position.x >= 0 &&
        object.position.x <= 1 &&
        object.position.y >= 0 &&
        object.position.y <= 1 &&
        Number.isFinite(object.velocity?.x) &&
        Number.isFinite(object.velocity?.y) &&
        Number.isFinite(object.attractionValue);
      if (valid) ids.add(object.id);
      return valid;
    }) as InkSnapshot["objects"];
    if (objects.length !== parsed.objects.length) return null;
    return {
      version: 2,
      seed: Number(parsed.seed) >>> 0,
      savedAt: parsed.savedAt,
      objects,
    };
  } catch {
    return null;
  }
}

export function saveSnapshot(
  seed: number,
  objects: readonly InkObject[],
  viewport: { width: number; height: number },
  now = Date.now(),
): void {
  if (typeof sessionStorage === "undefined") return;
  if (viewport.width <= 0 || viewport.height <= 0) return;
  const snapshot: InkSnapshot = {
    version: 2,
    seed: seed >>> 0,
    savedAt: now,
    objects: objects.map((object) => ({
      id: object.id,
      position: {
        x: Math.min(1, Math.max(0, object.position.x / viewport.width)),
        y: Math.min(1, Math.max(0, object.position.y / viewport.height)),
      },
      velocity: {
        x: object.velocity.x / viewport.width,
        y: object.velocity.y / viewport.height,
      },
      attractionValue: object.attractionValue,
      rngState: object.rngState >>> 0,
    })),
  };
  try {
    sessionStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot));
  } catch {
    // Storage can be disabled or full; the animation remains ephemeral.
  }
}
