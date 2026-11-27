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
  minDamping: 0.48,
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

// Checkpoint spin. A checkpoint near the marker spins with the marker's speed, scaled by
// proximity: influence = max(0, 1 - distance / near), drive = vel * gain * influence (deg/s).
// Moving down spins clockwise, moving up counter-clockwise. Away from the marker, friction
// slows it. A spring always pulls it to the nearest quarter turn, so it lands square with a
// small wobble: a slow pass wobbles back, a fast pass turns one or two quarters.
export const CHECKPOINT_SPIN = {
  /** Distance (px) inside which the marker turns a checkpoint. */
  near: 56,
  /** Degrees per second of spin per px/s of marker speed, at zero distance. */
  gain: 1.4,
  /** How fast the spin follows the drive while the marker is near, in 1/s. */
  coupling: 30,
  /** Spin friction once the marker is away, in 1/s. */
  friction: 6,
  /** Spring toward the nearest quarter turn, in 1/s^2. */
  snap: 40,
};
export type CheckpointSpinParams = typeof CHECKPOINT_SPIN;

export interface Spin {
  /** Rotation in degrees. */
  angle: number;
  /** Angular speed in degrees per second. */
  spin: number;
}

/** Advances one checkpoint at `offset` by `dt` seconds. Mutates and returns `s`. */
export function stepSpin(
  s: Spin,
  offset: number,
  marker: RailBody,
  dt: number,
  p: CheckpointSpinParams = CHECKPOINT_SPIN,
): Spin {
  const influence = Math.max(0, 1 - Math.abs(offset - marker.pos) / p.near);
  const drive = marker.vel * p.gain * influence;
  const rest = Math.round(s.angle / 90) * 90;
  const away = 1 - influence;
  // The snap spring always acts, so a checkpoint under a parked marker still squares up.
  const accel =
    (drive - s.spin) * p.coupling * influence -
    s.spin * p.friction * away +
    (rest - s.angle) * p.snap;
  s.spin += accel * dt;
  s.angle += s.spin * dt;
  return s;
}

/** At rest when square to a quarter turn and nearly still. */
export function spinAtRest(s: Spin): boolean {
  return Math.abs(s.angle - Math.round(s.angle / 90) * 90) < 0.5 && Math.abs(s.spin) < 3;
}
