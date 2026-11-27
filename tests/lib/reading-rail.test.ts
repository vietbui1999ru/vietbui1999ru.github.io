import { describe, expect, it } from "vitest";
import { readingCheckpointStates, readingLine, readingMarkerOffset } from "@/lib/reading-rail";

// Headings at document y 1000, 2000 and 3000; checkpoints at rail y 20, 60 and 100;
// content ends at 4000; the rail is 140 px tall.
const base = { headingTops: [1000, 2000, 3000], checkpoints: [20, 60, 100], contentBottom: 4000, railHeight: 140 };

describe("marker", () => {
  it("sits on a checkpoint when the reading line reaches its heading", () => {
    expect(readingMarkerOffset({ ...base, readingLine: 2000 })).toBe(60);
  });

  it("interpolates between two headings", () => {
    expect(readingMarkerOffset({ ...base, readingLine: 2500 })).toBe(80);
  });

  it("interpolates from the rail top above the first heading", () => {
    expect(readingMarkerOffset({ ...base, readingLine: 500 })).toBe(10);
  });

  it("interpolates to the rail end below the last heading", () => {
    expect(readingMarkerOffset({ ...base, readingLine: 3500 })).toBe(120);
    expect(readingMarkerOffset({ ...base, readingLine: 4000 })).toBe(140);
  });

  it("clamps to the rail", () => {
    expect(readingMarkerOffset({ ...base, readingLine: -200 })).toBe(0);
    expect(readingMarkerOffset({ ...base, readingLine: 9000 })).toBe(140);
  });

  it("maps the whole content to the rail when there are no headings", () => {
    expect(readingMarkerOffset({ ...base, headingTops: [], checkpoints: [], readingLine: 2000 })).toBe(70);
  });

  it("does not divide by zero when two headings share a top", () => {
    const offset = readingMarkerOffset({ ...base, headingTops: [1000, 1000, 3000], readingLine: 1000 });
    expect(Number.isFinite(offset)).toBe(true);
  });
});

describe("marker reading line", () => {
  // Viewport 1000 px, so the plain reading line is scrollY + 300.
  const short = { viewportHeight: 1000, maxScroll: 1000, contentBottom: 3000 };

  it("sits 30% down the viewport away from the scroll end", () => {
    expect(readingLine({ ...short, scrollY: 0 })).toBe(300);
    expect(readingLine({ viewportHeight: 1000, maxScroll: 10000, contentBottom: 10500, scrollY: 2000 })).toBe(2300);
  });

  it("moves down to the content bottom over the last viewport of the scroll", () => {
    // Plain line at the end is 1300; 1700 px of content stay below it.
    expect(readingLine({ ...short, scrollY: 500 })).toBe(800 + 850);
    expect(readingLine({ ...short, scrollY: 1000 })).toBe(3000);
  });

  it("reaches the content bottom on a page that does not scroll", () => {
    expect(readingLine({ viewportHeight: 1000, maxScroll: 0, contentBottom: 700, scrollY: 0 })).toBe(700);
  });

  it("passes every checkpoint at the end of a short page", () => {
    const line = readingLine({ ...short, scrollY: 1000 });
    const marker = readingMarkerOffset({ ...base, contentBottom: 3000, readingLine: line });
    expect(readingCheckpointStates(base.checkpoints, marker)).toEqual(["passed", "passed", "passed"]);
  });
});

describe("checkpoints", () => {
  it("marks checkpoints at or above the marker as passed", () => {
    expect(readingCheckpointStates([20, 60, 100], 60)).toEqual(["passed", "passed", "upcoming"]);
  });
});
