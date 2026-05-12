import { describe, it, expect } from "vitest";
import { createTrailBuffer, pushPosition, readTrail } from "@/scenes/sims/lorenz/trails";

describe("TrailBuffer", () => {
  it("starts empty", () => {
    const buf = createTrailBuffer(10);
    expect(buf.count).toBe(0);
    expect(buf.head).toBe(0);
  });

  it("pushes positions and increments count up to capacity", () => {
    const buf = createTrailBuffer(4);
    pushPosition(buf, 1, 2, 3);
    pushPosition(buf, 4, 5, 6);
    expect(buf.count).toBe(2);
    pushPosition(buf, 7, 8, 9);
    pushPosition(buf, 10, 11, 12);
    pushPosition(buf, 13, 14, 15); // overflow — count should stay 4
    expect(buf.count).toBe(4);
  });

  it("readTrail returns positions in oldest-to-newest order", () => {
    const buf = createTrailBuffer(3);
    pushPosition(buf, 1, 0, 0);
    pushPosition(buf, 2, 0, 0);
    pushPosition(buf, 3, 0, 0);

    const out = new Float32Array(9);
    const n = readTrail(buf, out);
    expect(n).toBe(3);
    expect(out[0]).toBe(1);
    expect(out[3]).toBe(2);
    expect(out[6]).toBe(3);
  });

  it("overwrites oldest on overflow and reads in correct order", () => {
    const buf = createTrailBuffer(3);
    pushPosition(buf, 1, 0, 0); // will be overwritten
    pushPosition(buf, 2, 0, 0);
    pushPosition(buf, 3, 0, 0);
    pushPosition(buf, 4, 0, 0); // overwrites slot 0 (value 1)

    const out = new Float32Array(9);
    const n = readTrail(buf, out);
    expect(n).toBe(3);
    expect(out[0]).toBe(2);
    expect(out[3]).toBe(3);
    expect(out[6]).toBe(4);
  });

  it("readTrail with outOffset writes at correct position", () => {
    const buf = createTrailBuffer(2);
    pushPosition(buf, 5, 6, 7);
    const out = new Float32Array(6);
    readTrail(buf, out, 1);
    expect(out[3]).toBe(5);
    expect(out[4]).toBe(6);
    expect(out[5]).toBe(7);
  });
});
