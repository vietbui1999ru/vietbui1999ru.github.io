// Spring motion of the timeline rail marker, free of DOM code.
//
// While the pointer moves, the box chases it with critical damping (no overshoot), capped
// at `chaseSpeed`, so it falls behind on fast strokes. Once the pointer stops, the box
// decelerates into the target and bounces with a damping ratio set by how fast the last
// stroke was: bounce = clamp((strokeSpeed - slowSpeed) / (fastSpeed - slowSpeed), 0, 1),
// damping = 1 - bounce * (1 - minDamping). The box never passes the rail ends.

export const RAIL_MOTION = {
  /** Spring stiffness in 1/s^2; higher catches up sooner. */
  stiffness: 90,
  /** Fastest the box moves, in px/s. */
  chaseSpeed: 1100,
  /** Stroke speed (px/s) at or under which there is no bounce. */
  slowSpeed: 250,
  /** Stroke speed (px/s) at or over which the bounce is strongest. */
  fastSpeed: 1600,
  /** Damping ratio at the strongest bounce; 1 means no overshoot. */
  minDamping: 0.53,
};
export type RailMotionParams = typeof RAIL_MOTION;

export interface RailBody {
  pos: number;
  vel: number;
}

/** 0 for slow strokes, 1 for fast ones, linear between. */
export function bounceRatio(strokeSpeed: number, p: RailMotionParams = RAIL_MOTION): number {
  return Math.min(Math.max((strokeSpeed - p.slowSpeed) / (p.fastSpeed - p.slowSpeed), 0), 1);
}

/** Advances the box by `dt` seconds toward `target`, inside 0..`limit`. Mutates and returns `body`. */
export function stepRail(
  body: RailBody,
  target: number,
  limit: number,
  dt: number,
  bounce: number,
  p: RailMotionParams = RAIL_MOTION,
): RailBody {
  const damping = 1 - bounce * (1 - p.minDamping);
  const c = 2 * damping * Math.sqrt(p.stiffness);
  // Small sub-steps keep the integration stable when a frame is late.
  const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
  const h = dt / steps;
  for (let i = 0; i < steps; i++) {
    body.vel += (p.stiffness * (target - body.pos) - c * body.vel) * h;
    body.vel = Math.min(Math.max(body.vel, -p.chaseSpeed), p.chaseSpeed);
    body.pos += body.vel * h;
    if (body.pos < 0 || body.pos > limit) {
      body.pos = Math.min(Math.max(body.pos, 0), limit);
      body.vel = 0;
    }
  }
  return body;
}

/** At rest when within half a pixel of the target and nearly still. */
export function atRest(body: RailBody, target: number): boolean {
  return Math.abs(target - body.pos) < 0.5 && Math.abs(body.vel) < 5;
}
