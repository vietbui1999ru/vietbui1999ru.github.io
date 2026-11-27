import { describe, expect, it } from "vitest";
import { atRest, bounceRatio, stepRail } from "@/lib/rail-motion";

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
