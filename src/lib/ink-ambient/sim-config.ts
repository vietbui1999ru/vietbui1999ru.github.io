// Tunable simulation values (issue #22). Rules read them from world.config, never
// from mutated module state. DEFAULT_SIM_CONFIG equals the constants in config.ts,
// so a world created without a config behaves exactly as before.
import {
  AMBIENT_PREDATOR_COUNT,
  AMBIENT_PREY_COUNT,
  FLOCK_MIN_SIZE,
  FLOCK_RADIUS,
  FLOCK_TARGET_SWITCH_MARGIN,
  LIFESPAN_MAX_MULTIPLIER,
  PEN_TRAIL_MAX_AGE_SECONDS,
  PLAYGROUND_INITIAL_MULTIPLIER,
  PREDATOR_LIVES_START,
  PREDATOR_STARVE_SECONDS,
} from "./config";

export interface SimConfig {
  /** Playground only: most objects alive at once. null = the device cap; Infinity = no cap. */
  objectCap: number | null;
  /** Playground only: predators and prey on a fresh start. */
  startPredators: number;
  startPrey: number;
  /** Multiplies every speed limit of a role. */
  predatorSpeedScale: number;
  preySpeedScale: number;
  /** Lives of a newly spawned predator, and after each catch. */
  predatorLives: number;
  /** Seconds of hunger before a predator starves, at lifespan multiplier 1. */
  starveSeconds: number;
  lifespanMaxMultiplier: number;
  flockRadius: number;
  flockMinSize: number;
  flockSwitchMargin: number;
  /** Multiplies the radius of newly spawned objects. */
  sizeScale: number;
  /** Pen trail length in seconds; the pencil trail keeps its shorter ratio. */
  trailSeconds: number;
}

export const DEFAULT_SIM_CONFIG: Readonly<SimConfig> = Object.freeze({
  objectCap: null,
  startPredators: AMBIENT_PREDATOR_COUNT * PLAYGROUND_INITIAL_MULTIPLIER,
  startPrey: AMBIENT_PREY_COUNT * PLAYGROUND_INITIAL_MULTIPLIER,
  predatorSpeedScale: 1,
  preySpeedScale: 1,
  predatorLives: PREDATOR_LIVES_START,
  starveSeconds: PREDATOR_STARVE_SECONDS,
  lifespanMaxMultiplier: LIFESPAN_MAX_MULTIPLIER,
  flockRadius: FLOCK_RADIUS,
  flockMinSize: FLOCK_MIN_SIZE,
  flockSwitchMargin: FLOCK_TARGET_SWITCH_MARGIN,
  sizeScale: 1,
  trailSeconds: PEN_TRAIL_MAX_AGE_SECONDS,
});

/** Keys that apply only to objects spawned after the change; every other key applies on the next step. */
export const NEW_OBJECT_KEYS: ReadonlySet<keyof SimConfig> = new Set(["predatorLives", "sizeScale"]);

export function mergeConfig(base: Readonly<SimConfig>, patch: Partial<SimConfig> = {}): SimConfig {
  const merged = { ...base };
  for (const key of Object.keys(patch) as Array<keyof SimConfig>) {
    if (patch[key] !== undefined) (merged as Record<string, unknown>)[key] = patch[key];
  }
  return merged;
}

/** Trail length as a fraction of the default, used by trailMaxAge and trailMaxPoints. */
export function trailScale(config: Readonly<SimConfig>): number {
  return config.trailSeconds / PEN_TRAIL_MAX_AGE_SECONDS;
}

/** The playground runs a fresh world each visit: it never loads or saves the shared snapshot. */
export function usesSnapshot(pathname: string): boolean {
  return pathname !== "/playground" && pathname !== "/playground/";
}
