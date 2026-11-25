import { describe, expect, it } from "vitest";
import { markerOffset, checkpointStates } from "@/lib/timeline-rail";

// Rail spans y = 100..500 in viewport coordinates.
const rail = { top: 100, height: 400 };

describe("marker", () => {
  it("follows the pointer in pointer mode", () => {
    expect(markerOffset({ mode: "pointer", pointerY: 250, viewportHeight: 800 }, rail)).toBe(150);
  });

  it("follows the viewport centre in scroll mode", () => {
    expect(markerOffset({ mode: "scroll", pointerY: 0, viewportHeight: 600 }, rail)).toBe(200);
  });

  it("clamps to the top and bottom of the rail", () => {
    expect(markerOffset({ mode: "pointer", pointerY: 20, viewportHeight: 800 }, rail)).toBe(0);
    expect(markerOffset({ mode: "pointer", pointerY: 900, viewportHeight: 800 }, rail)).toBe(400);
    expect(markerOffset({ mode: "scroll", pointerY: 0, viewportHeight: 2000 }, rail)).toBe(400);
  });

  it("returns 0 for a rail with no height", () => {
    expect(markerOffset({ mode: "scroll", pointerY: 0, viewportHeight: 800 }, { top: 0, height: 0 })).toBe(0);
  });
});

describe("checkpoints", () => {
  it("marks checkpoints at or above the marker as passed", () => {
    expect(checkpointStates([0, 120, 240, 360], 240)).toEqual(["passed", "passed", "passed", "upcoming"]);
  });

  it("marks every checkpoint upcoming when the marker is above them", () => {
    expect(checkpointStates([10, 20], 5)).toEqual(["upcoming", "upcoming"]);
  });
});
