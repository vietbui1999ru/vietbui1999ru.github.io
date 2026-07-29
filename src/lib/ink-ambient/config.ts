import type { RouteProfile } from "./types";

export const FIXED_STEP = 1 / 60;
export const MAX_CATCH_UP_STEPS = 4;
export const MAX_DPR = 2;
export const MAX_OBJECTS_DESKTOP = 4;
export const MAX_OBJECTS_MOBILE = 2;
export const SAFE_CLEARANCE = 18;
export const TRAPPED_ESCAPE_SECONDS = 1.5;
export const TRAPPED_ESCAPE_ACCELERATION = 140;
// Pen (predator) and pencil (prey) get independent trail retention — pen's
// is deliberately longer/darker (see renderer.ts's isPenLike-driven color and
// physics.ts's trailMaxAge/trailMaxPoints). Point counts are sized so the
// point-count cap doesn't truncate a trail before its own age cap would
// (points accumulate roughly once per FIXED_STEP tick while moving).
export const PEN_TRAIL_MAX_AGE_SECONDS = 2.6;
export const PEN_TRAIL_MAX_POINTS = 160;
export const PENCIL_TRAIL_MAX_AGE_SECONDS = 1.4;
export const PENCIL_TRAIL_MAX_POINTS = 90;
// Sample every simulation tick (~FIXED_STEP) so fast drags produce closely
// spaced points instead of a few long, visibly straight polyline segments.
export const TRAIL_SAMPLE_INTERVAL_SECONDS = 0;
export const TRAIL_MIN_SPEED = 6;
// Fraction of object.radius from center to the sprite's tip (pen/pencil nib).
// Must match the renderer's sprite geometry (TARGET_SPAN / SPRITE_SIZE) — the
// renderer derives its TARGET_SPAN from this same constant, so there's one
// source of truth for "how far forward is the tip."
export const OBJECT_TIP_OFFSET_FRACTION = 70 / 96;
export const GRID_COLUMNS = 28;
export const GRID_ROWS = 18;
export const SNAPSHOT_KEY = "ink-ambient:v1";
export const SNAPSHOT_MAX_AGE = 1000 * 60 * 60 * 12;

export const ATTRACTION_VALUE_MIN = 0.5;
export const ATTRACTION_VALUE_MAX = 1.5;
// Speed/acceleration constants below are scaled ~1.4x over the original
// tuning for a more aggressive chase (user feedback: "feels a bit slow").
// The predator/prey ratio (PREDATOR_SPEED_MULTIPLIER_*) is unchanged — only
// the baseline everyone moves/accelerates at went up.
export const ATTRACTION_BASE_ACCELERATION = 154;
export const ATTRACTION_MAX_ACCELERATION_LIGHT = 182;
export const ATTRACTION_MAX_ACCELERATION_HEAVY = 98;
export const PAIR_FORCE_MIN = 0.3;
export const PAIR_FORCE_MAX = 2.2;
export const ATTRACTION_RAMP_MAX = 2.4;
export const ATTRACTION_RAMP_START_MULTIPLIER = 6;
export const PREY_SPEED_MIN = 133;
export const PREY_SPEED_MAX = 182;
export const PREY_THROW_SPEED_MAX = 252;
export const PREDATOR_SPEED_MULTIPLIER_MIN = 1.15;
export const PREDATOR_SPEED_MULTIPLIER_MAX = 1.45;
export const PANIC_RAMP_MAX = 2.2;
export const PREDATOR_MAX_RAMPED_SPEED = 520; // scaled up with the rest — was 372 (155 * ATTRACTION_RAMP_MAX) before the speed increase
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

// Lotka-Volterra population rhythm (spec §8) — tuned for a ~20-40s bounded
// boom/bust cycle at equilibrium x*=y*=1, not biological accuracy.
export const LV_ALPHA = 0.2;
export const LV_BETA = 0.2;
export const LV_GAMMA = 0.2;
export const LV_DELTA = 0.2;
export const LV_SCALE = 2;
export const PREY_TARGET_MAX = 2;
export const PREDATOR_TARGET_MAX = 2;

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
