import {
  PREDATOR_SPAWN_RAMP_SECONDS,
  PREDATOR_SPAWN_RAMP_START_FRACTION,
  PREDATOR_STARVE_SECONDS,
  SPAWN_SETTLE_SECONDS,
  VANISH_DURATION_SECONDS,
} from "./config";
import { clamp } from "./physics";
import type { InkObject } from "./types";

export function updateSpawnFade(object: InkObject, now: number, dt: number): void {
  if (object.lifecycle !== "spawning") return;
  object.opacity = Math.min(1, object.opacity + dt * 0.9);
  if (object.opacity >= 1 && now >= object.spawnAt + SPAWN_SETTLE_SECONDS * 1000) {
    object.lifecycle = "active";
  }
}

export function livesFadeStep(lives: number): number {
  if (lives >= 3) return 1.0;
  if (lives === 2) return 0.7;
  return 0.4;
}

export function renderedOpacityMultiplier(
  object: Pick<InkObject, "role" | "lives" | "hungerElapsed" | "vanishElapsed">,
): number {
  if (object.role !== "predator" || object.vanishElapsed !== null) return 1;
  const hungerFade = clamp(1 - object.hungerElapsed / PREDATOR_STARVE_SECONDS, 0, 1);
  return livesFadeStep(object.lives) * hungerFade;
}

export function updateVanish(object: InkObject, dt: number): boolean {
  if (object.vanishElapsed === null) return false;
  object.vanishElapsed += dt;
  const remaining = clamp(1 - object.vanishElapsed / VANISH_DURATION_SECONDS, 0, 1);
  object.scale.x = remaining;
  object.scale.y = remaining;
  object.opacity = remaining;
  return object.vanishElapsed >= VANISH_DURATION_SECONDS;
}

export function applyPredatorSurvivalTick(object: InkObject, dt: number): void {
  if (object.role !== "predator" || object.vanishElapsed !== null) return;
  object.hungerElapsed += dt;
  if (object.lives <= 0 || object.hungerElapsed >= PREDATOR_STARVE_SECONDS) {
    object.vanishElapsed = 0;
  }
}

export function predatorSpawnRampMultiplier(object: Pick<InkObject, "spawnAt">, now: number): number {
  const elapsedSeconds = (now - object.spawnAt) / 1000;
  return (
    PREDATOR_SPAWN_RAMP_START_FRACTION +
    (1 - PREDATOR_SPAWN_RAMP_START_FRACTION) *
      clamp(elapsedSeconds / PREDATOR_SPAWN_RAMP_SECONDS, 0, 1)
  );
}
