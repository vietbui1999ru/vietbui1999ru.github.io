import {
  ATTRACTION_VALUE_MAX,
  ATTRACTION_VALUE_MIN,
  CHASE_VIGOR_JITTER,
  PREDATOR_RADIUS_MAX,
  PREDATOR_RADIUS_MIN,
  PREDATOR_SPEED_MULTIPLIER_MAX,
  PREDATOR_SPEED_MULTIPLIER_MIN,
  PREY_RADIUS_MAX,
  PREY_RADIUS_MIN,
  PREY_SPEED_MAX,
  PREY_SPEED_MIN,
} from "./config";
import { clamp } from "./physics";
import type { SeededRng } from "./rng";
import type { InkObject } from "./types";

type Role = NonNullable<InkObject["role"]>;

function vigorT(attractionValue: number, rng: SeededRng): number {
  const raw = (attractionValue - ATTRACTION_VALUE_MIN) / (ATTRACTION_VALUE_MAX - ATTRACTION_VALUE_MIN);
  return clamp(raw + rng.range(-CHASE_VIGOR_JITTER, CHASE_VIGOR_JITTER), 0, 1);
}

export function rollRadius(role: Role, rng: SeededRng): number {
  return role === "predator"
    ? rng.range(PREDATOR_RADIUS_MIN, PREDATOR_RADIUS_MAX)
    : rng.range(PREY_RADIUS_MIN, PREY_RADIUS_MAX);
}

export function rollChaseSpeed(role: Role, attractionValue: number, rng: SeededRng): number {
  const t = vigorT(attractionValue, rng);
  if (role === "prey") return PREY_SPEED_MIN + (PREY_SPEED_MAX - PREY_SPEED_MIN) * t;
  const min = PREY_SPEED_MIN * PREDATOR_SPEED_MULTIPLIER_MIN;
  const max = PREY_SPEED_MAX * PREDATOR_SPEED_MULTIPLIER_MAX;
  return min + (max - min) * t;
}
