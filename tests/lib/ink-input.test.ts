import { describe, expect, it } from "vitest";
import { getRouteProfile, MOUSE_HIT_SLOP, TOUCH_DRAG_THRESHOLD, TOUCH_HIT_SLOP } from "@/lib/ink-ambient/config";
import { acceptsPointer, dragThreshold, findGrabTarget } from "@/lib/ink-ambient/input";
import { createWorld, setGeometry, spawnInitialBatch } from "@/lib/ink-ambient/world";
import type { InkObject } from "@/lib/ink-ambient/types";

// Two objects at known places: a at (100, 100), b at (300, 100).
function twoObjects(): [InkObject, InkObject] {
  const world = createWorld({ pointerFine: true }, 1);
  setGeometry(world, { width: 1280, height: 800, obstacles: [], profile: getRouteProfile("/") });
  spawnInitialBatch(world, 0);
  const [a, b] = world.objects;
  a.position = { x: 100, y: 100 };
  b.position = { x: 300, y: 100 };
  return [a, b];
}

describe("findGrabTarget", () => {
  it("returns the object under the point, and null on a miss", () => {
    const [a, b] = twoObjects();
    expect(findGrabTarget([a, b], 100, 100, "mouse")).toBe(a);
    expect(findGrabTarget([a, b], 200, 400, "touch")).toBeNull();
  });

  it("reaches radius plus the slop: farther for touch than for mouse", () => {
    const [a] = twoObjects();
    const between = a.radius + (MOUSE_HIT_SLOP + TOUCH_HIT_SLOP) / 2;
    expect(findGrabTarget([a], 100 + between, 100, "mouse")).toBeNull();
    expect(findGrabTarget([a], 100 + between, 100, "touch")).toBe(a);
    expect(findGrabTarget([a], 100 + a.radius + TOUCH_HIT_SLOP + 1, 100, "touch")).toBeNull();
  });

  it("picks the nearest object when two are in range", () => {
    const [a, b] = twoObjects();
    b.position = { x: 130, y: 100 };
    expect(findGrabTarget([a, b], 125, 100, "touch")).toBe(b);
    expect(findGrabTarget([b, a], 105, 100, "touch")).toBe(a);
  });

  it("never returns a vanishing object", () => {
    const [a] = twoObjects();
    a.vanishElapsed = 0.1;
    expect(findGrabTarget([a], 100, 100, "touch")).toBeNull();
  });
});

describe("acceptsPointer", () => {
  it("accepts mouse, touch and pen only", () => {
    expect(["mouse", "touch", "pen"].every(acceptsPointer)).toBe(true);
    expect(acceptsPointer("")).toBe(false);
    expect(acceptsPointer("joystick")).toBe(false);
  });
});

describe("dragThreshold", () => {
  it("is 5 px for mouse and the touch threshold for touch and pen", () => {
    expect(dragThreshold("mouse")).toBe(5);
    expect(dragThreshold("touch")).toBe(TOUCH_DRAG_THRESHOLD);
    expect(dragThreshold("pen")).toBe(TOUCH_DRAG_THRESHOLD);
  });
});
