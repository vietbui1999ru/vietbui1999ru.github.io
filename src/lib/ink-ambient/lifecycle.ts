import { SPAWN_SETTLE_SECONDS } from "./config";
import type { InkObject } from "./types";

export function updateSpawnFade(object: InkObject, now: number, dt: number): void {
  if (object.lifecycle !== "spawning") return;
  object.opacity = Math.min(1, object.opacity + dt * 0.9);
  if (object.opacity >= 1 && now >= object.spawnAt + SPAWN_SETTLE_SECONDS * 1000) {
    object.lifecycle = "active";
  }
}
