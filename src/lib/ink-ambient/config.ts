import type { RouteProfile } from "./types";

export const FIXED_STEP = 1 / 60;
export const MAX_CATCH_UP_STEPS = 4;
export const MAX_DPR = 2;
// Raised from 4/2 — canvas should support a much larger, denser population
// rather than a tightly-capped handful; actual on-screen count is still
// naturally bounded by available safe screen space (spatial-field capacity).
export const MAX_OBJECTS_DESKTOP = 24;
export const MAX_OBJECTS_MOBILE = 10;
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
export const ATTRACTION_BASE_ACCELERATION = 154;
export const ATTRACTION_MAX_ACCELERATION_LIGHT = 182;
export const ATTRACTION_MAX_ACCELERATION_HEAVY = 98;
export const PAIR_FORCE_MIN = 0.3;
export const PAIR_FORCE_MAX = 2.2;
export const ATTRACTION_RAMP_MAX = 2.4;
export const ATTRACTION_RAMP_START_MULTIPLIER = 6;
export const PREY_SPEED_MIN = 133;
export const PREY_SPEED_MAX = 182;
// Floor is set above PREY_SPEED_MAX / PREY_SPEED_MIN (182/133 ≈ 1.37) so a
// predator's max speed always exceeds every prey's, regardless of vigor rolls
// — a low-vigor predator must still be able to run down a high-vigor prey.
// Previously the floor (1.15) let a slow predator be outrun by a fast prey,
// so predators effectively never caught anything (user-reported).
export const PREDATOR_SPEED_MULTIPLIER_MIN = 1.4;
export const PREDATOR_SPEED_MULTIPLIER_MAX = 1.8;
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
// Scale and per-role maximums raised alongside MAX_OBJECTS_* so the LV cycle
// has real room to swing across a much larger population instead of pinning
// at 1-2 of each role.
export const LV_SCALE = 6;
export const PREY_TARGET_MAX = 12;
export const PREDATOR_TARGET_MAX = 12;

// Predator survival mechanics (spec §5-§7).
export const PREDATOR_LIVES_START = 3;
// 5x the original 16s — starvation always happens eventually from passive
// hunger accrual alone (never gated on user interaction), but on a much
// longer autonomous clock; dragging (PREDATOR_DRAG_HUNGER_PENALTY_SECONDS)
// is what meaningfully accelerates it.
export const PREDATOR_STARVE_SECONDS = 80;
export const VANISH_DURATION_SECONDS = 0.5;
export const PREDATOR_PREY_CATCH_RADIUS_FRACTION = 0.65;
// Predator spawn ramp (spec §6.1) — lives here rather than in Task 5 because
// predatorSpawnRampMultiplier (added below) needs it and is built/tested in
// this task, before the cutover.
export const PREDATOR_SPAWN_RAMP_SECONDS = 3;
export const PREDATOR_SPAWN_RAMP_START_FRACTION = 0.5;

// Continuous per-tick targeting (spec §4.3-§4.4).
export const ANTI_FLICKER_SWITCH_THRESHOLD = 0.1;
export const NEARBY_PREDATOR_WOBBLE_STEP = 0.25;
export const NEARBY_PREDATOR_WOBBLE_MAX = 2;

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

// Population top-up pacing (spec §8.3). PREDATOR_SPAWN_RAMP_SECONDS and
// PREDATOR_SPAWN_RAMP_START_FRACTION were already added in Task 3, alongside
// predatorSpawnRampMultiplier which consumes them.
export const POPULATION_TOPUP_MIN_DELAY_MS = 1500;
export const POPULATION_TOPUP_MAX_DELAY_MS = 3500;

// User-drag hunger penalty: starvation risk should mostly come from the user
// interfering (dragging a predator off its hunt, or dragging its prey away),
// not from ordinary autonomous chasing. Applied once per real drag+release,
// on top of the normal per-second hungerElapsed accrual.
export const PREDATOR_DRAG_HUNGER_PENALTY_SECONDS = 6;

// Independent per-role spawn count at page load/refresh (each role rolled
// separately, so a fresh load can be prey-heavy, predator-heavy, or balanced).
export const SPAWN_COUNT_MIN = 2;
export const SPAWN_COUNT_MAX = 10;

// Predators speed up the longer they've sustained a chase on the same
// target (distinct from the proximity-based pairApproachRamp and the one-
// time spawn ramp) — reaches the max multiplier after this many seconds of
// continuously chasing the same target, reset whenever the target changes.
export const PREDATOR_CHASE_ACCEL_SECONDS = 4;
export const PREDATOR_CHASE_ACCEL_MAX_MULTIPLIER = 1.6;

// Scarcity competition: whenever a catch happens and predators outnumber
// (or match) the remaining prey, every predator that DIDN'T make that catch
// gets an extra hunger penalty — food just got scarcer, and missing out
// costs you regardless of whether you were even chasing that specific prey.
export const PREDATOR_SCARCITY_HUNGER_PENALTY_SECONDS = 5;

// Spawn tint: a freshly-spawned object briefly renders in a distinctive
// pastel color (predator = light red, prey = light green) before quickly
// converging to its normal ink/soft-grey sprite color, as a visual "just
// spawned in" cue.
export const PREDATOR_SPAWN_TINT_COLOR = "#f2a6a6";
export const PREY_SPAWN_TINT_COLOR = "#a8d8b0";
// Long enough to clear the spawn opacity ramp-in (object.opacity starts at
// 0.01 and takes ~1.1s to reach 1.0, plus SPAWN_SETTLE_SECONDS before
// lifecycle flips to "active") with real margin — otherwise the tint fades
// out at almost the same rate the object fades in, making it barely
// visible: the two ramps would cancel out instead of overlapping.
export const SPAWN_TINT_DURATION_SECONDS = 2.5;

// Ties the abstract Lotka-Volterra population state to REAL events in the
// discrete chase sim, not just its own continuous x*y math (see stepLotkaVolterra
// in population.ts) — matching the classical model's actual mechanism: a
// predator eating prey drives predator population growth (delta*x*y, a birth
// term), and a predator dying drives its own population down beyond the
// passive gamma*y decay. Applied once per real event, on top of the
// continuous flow, each simulation tick.
export const LV_CATCH_PREDATOR_BOOST = 0.15;
export const LV_CATCH_PREY_DECAY = 0.1;
export const LV_PREDATOR_DEATH_DECAY = 0.15;

// Prey flock predator conversion (spec 2026-07-30). FLOCK_RADIUS doubles as
// both the flock-cohesion sensing radius and the kill-trigger radius — the
// same value, per the design's explicit constraint (not a separate tighter
// kill threshold like the normal catch mechanic uses).
export const FLOCK_RADIUS = 90;
export const FLOCK_MIN_SIZE = 3;

// Boids weights for flock-hunt steering (spec §6) — hunt dominant, boids
// rules add clustering texture. Starting values, tune live in the browser.
export const FLOCK_SEPARATION_DISTANCE = 30;
export const FLOCK_HUNT_WEIGHT = 1.0;
export const FLOCK_COHESION_WEIGHT = 0.4;
export const FLOCK_SEPARATION_WEIGHT = 0.6;
export const FLOCK_ALIGNMENT_WEIGHT = 0.3;
// The "pastel red" half of the blink reuses PREDATOR_SPAWN_TINT_COLOR; the
// targeted predator's steady tint reuses PREY_SPAWN_TINT_COLOR (both
// already defined above) — only the bright-red half is new.
export const FLOCK_HUNT_BRIGHT_RED_COLOR = "#ff3b3b";
export const FLOCK_BLINK_FREQUENCY = 4;
