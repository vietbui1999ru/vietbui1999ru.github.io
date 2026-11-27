import { describe, expect, it } from "vitest";
import { atRest, bounceRatio, spinAtRest, stepRail, stepSpin } from "@/lib/rail-motion";

// A marker passes a checkpoint at offset 0, from -200 to 300 px at `vel` px/s, then stops.
// Returns the checkpoint spin after 5 s at 60 fps, plus the fastest spin seen.
function pass(vel: number) {
  const marker = { pos: -200 * Math.sign(vel), vel };
  const s = { angle: 0, spin: 0 };
  let peak = 0;
  for (let i = 0; i < 300; i++) {
    const moving = vel > 0 ? marker.pos < 300 : marker.pos > -300;
    marker.vel = moving ? vel : 0;
    marker.pos += marker.vel / 60;
    stepSpin(s, 0, marker, 1 / 60);
    peak = vel > 0 ? Math.max(peak, s.spin) : Math.min(peak, s.spin);
  }
  return { s, peak };
}

describe("stepSpin", () => {
  it("does not spin when the marker stays far away", () => {
    const s = stepSpin({ angle: 0, spin: 0 }, 0, { pos: 200, vel: 1000 }, 1 / 60);
    expect(s).toEqual({ angle: 0, spin: 0 });
  });

  it("spins clockwise for a downward pass and counter-clockwise for an upward one", () => {
    expect(pass(800).peak).toBeGreaterThan(0);
    expect(pass(-800).peak).toBeLessThan(0);
  });

  it("turns more for a faster pass and lands square", () => {
    const slow = pass(150).s;
    const fast = pass(1100).s;
    expect(spinAtRest(slow)).toBe(true);
    expect(spinAtRest(fast)).toBe(true);
    expect(slow.angle).toBeCloseTo(0, 0);
    expect(Math.round(fast.angle)).toBeGreaterThanOrEqual(180);
  });

  it("squares up under a marker parked on it", () => {
    const s = { angle: 37, spin: 0 };
    for (let i = 0; i < 300; i++) stepSpin(s, 0, { pos: 0, vel: 0 }, 1 / 60);
    expect(spinAtRest(s)).toBe(true);
    expect(s.angle).toBeCloseTo(0, 0);
  });
});

// Runs the box from 0 to `target` at 60 fps and returns every position.
function run(target: number, bounce: number, limit = 1000, frames = 180) {
  const body = { pos: 0, vel: 0 };
  const path: number[] = [];
  for (let i = 0; i < frames; i++) path.push(stepRail(body, target, limit, 1 / 60, bounce).pos);
  return { body, path };
}

describe("bounceRatio", () => {
  it("is 0 for slow strokes, 1 for fast, linear between", () => {
    expect(bounceRatio(100)).toBe(0);
    expect(bounceRatio(5000)).toBe(1);
    expect(bounceRatio((250 + 1600) / 2)).toBeCloseTo(0.5);
  });
});

describe("stepRail", () => {
  it("does not overshoot after a slow stroke", () => {
    const { path, body } = run(300, 0);
    expect(Math.max(...path)).toBeLessThanOrEqual(300.5);
    expect(atRest(body, 300)).toBe(true);
  });

  it("overshoots, bounces back and settles after a fast stroke", () => {
    const { path, body } = run(300, 1);
    const peak = Math.max(...path);
    expect(peak).toBeGreaterThan(310);
    expect(path.slice(path.indexOf(peak)).some((y) => y < 300)).toBe(true);
    expect(atRest(body, 300)).toBe(true);
  });

  it("lags behind: the box needs time to cover the distance", () => {
    const { path } = run(600, 0);
    // After 100 ms the box has covered under a quarter of the way.
    expect(path[5]).toBeLessThan(150);
  });

  it("never passes the rail end, even with the strongest bounce", () => {
    const { path, body } = run(400, 1, 400);
    expect(Math.max(...path)).toBeLessThanOrEqual(400);
    expect(body.pos).toBe(400);
  });
});
