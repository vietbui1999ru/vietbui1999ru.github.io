import type { RouteProfile } from "./types";

export const FIXED_STEP = 1 / 60;
export const MAX_CATCH_UP_STEPS = 4;
export const MAX_DPR = 2;
export const MAX_OBJECTS_DESKTOP = 4;
export const MAX_OBJECTS_MOBILE = 2;
export const SAFE_CLEARANCE = 18;
export const TRAPPED_ESCAPE_SECONDS = 1.5;
export const TRAPPED_ESCAPE_ACCELERATION = 140;
export const TRAIL_MAX_POINTS = 56;
export const TRAIL_MAX_AGE_SECONDS = 0.9;
// Sample every simulation tick (~FIXED_STEP) so fast drags produce closely
// spaced points instead of a few long, visibly straight polyline segments.
export const TRAIL_SAMPLE_INTERVAL_SECONDS = 0;
export const TRAIL_MIN_SPEED = 6;
export const GRID_COLUMNS = 28;
export const GRID_ROWS = 18;
export const SNAPSHOT_KEY = "ink-ambient:v1";
export const SNAPSHOT_MAX_AGE = 1000 * 60 * 60 * 12;

export const ATTRACTION_VALUE_MIN = 0.5;
export const ATTRACTION_VALUE_MAX = 1.5;
export const ATTRACTION_BASE_ACCELERATION = 110;
export const ATTRACTION_MAX_ACCELERATION_LIGHT = 130;
export const ATTRACTION_MAX_ACCELERATION_HEAVY = 70;
export const PAIR_FORCE_MIN = 0.3;
export const PAIR_FORCE_MAX = 2.2;
export const ATTRACTION_RAMP_MAX = 2.4;
export const ATTRACTION_RAMP_START_MULTIPLIER = 6;
export const PREY_SPEED_MIN = 95;
export const PREY_SPEED_MAX = 130;
export const PREY_THROW_SPEED_MAX = 180;
export const PREDATOR_SPEED_MULTIPLIER_MIN = 1.15;
export const PREDATOR_SPEED_MULTIPLIER_MAX = 1.45;
export const PANIC_RAMP_MAX = 2.2;
export const PREDATOR_MAX_RAMPED_SPEED = 372; // matches the previous system's own worst-case ceiling (155 * ATTRACTION_RAMP_MAX)
export const PREY_RADIUS_MIN = 11;
export const PREY_RADIUS_MAX = 17;
export const PREDATOR_RADIUS_MIN = 19;
export const PREDATOR_RADIUS_MAX = 26;
export const PREDATOR_WOBBLE_FACTOR = 0.15;
export const PREY_WOBBLE_FACTOR = 0.4;
export const CHASE_VIGOR_JITTER = 0.15;
export const MOTION_BLEND_SECONDS = 0.22;
export const SPAWN_SETTLE_SECONDS = 0.45;
export const BURST_RADIUS_MULTIPLIER = 1.6;
export const BURST_ALPHA = 0.55;
export const BURST_LIFETIME_MIN = 0.6;
export const BURST_LIFETIME_MAX = 1.0;

const OUTER: RouteProfile = {
  name: "outer-gutters",
  edgeBias: "outer",
  regions: [
    { x: 0, y: 0.08, width: 0.22, height: 0.84, weight: 1 },
    { x: 0.78, y: 0.08, width: 0.22, height: 0.84, weight: 1 },
  ],
};

export const ROUTE_PROFILES: Record<string, RouteProfile> = {
  home: {
    name: "home-open",
    edgeBias: "outer",
    regions: [
      { x: 0.02, y: 0.1, width: 0.25, height: 0.8, weight: 1 },
      { x: 0.73, y: 0.1, width: 0.25, height: 0.8, weight: 1 },
    ],
  },
  about: {
    name: "about-right",
    edgeBias: "right",
    regions: [{ x: 0.68, y: 0.08, width: 0.3, height: 0.84, weight: 2 }],
  },
  experience: {
    name: "experience-right",
    edgeBias: "right",
    regions: [{ x: 0.7, y: 0.08, width: 0.28, height: 0.84, weight: 2 }],
  },
  contact: {
    name: "contact-right",
    edgeBias: "right",
    regions: [{ x: 0.68, y: 0.08, width: 0.3, height: 0.84, weight: 2 }],
  },
  blog: OUTER,
  projects: OUTER,
  gallery: OUTER,
  education: OUTER,
  default: OUTER,
};

export function getRouteProfile(pathname: string, sectionId?: string): RouteProfile {
  if (sectionId && ROUTE_PROFILES[sectionId]) return ROUTE_PROFILES[sectionId];
  if (pathname.startsWith("/blog/")) return ROUTE_PROFILES.blog;
  if (pathname.startsWith("/projects/")) return ROUTE_PROFILES.projects;
  if (pathname === "/blog") return ROUTE_PROFILES.blog;
  if (pathname === "/projects") return ROUTE_PROFILES.projects;
  return ROUTE_PROFILES.default;
}
