import { describe, expect, it } from "vitest";
import { describeElement, pushCapped, speed, statusClass } from "@/lib/dev-monitor/metrics";

describe("speed", () => {
  it("is 0 with fewer than two samples", () => {
    expect(speed([])).toBe(0);
    expect(speed([{ t: 0, y: 10 }])).toBe(0);
  });

  it("measures px/s over the window only", () => {
    const samples = [
      { t: 0, y: 0 },
      { t: 900, y: 500 },
      { t: 950, y: 520 },
      { t: 1000, y: 550 },
    ];
    // window 100 ms: 900 -> 1000, 50 px in 0.1 s
    expect(speed(samples, 100)).toBe(500);
  });
});

describe("pushCapped", () => {
  it("drops the oldest entries", () => {
    expect(pushCapped([1, 2, 3], 4, 3)).toEqual([2, 3, 4]);
  });
});

describe("statusClass", () => {
  it("groups statuses", () => {
    expect([200, 301, 404, 503, 0].map(statusClass)).toEqual([
      "ok",
      "redirect",
      "client",
      "server",
      "unknown",
    ]);
  });
});

describe("describeElement", () => {
  it("labels an element", () => {
    const a = document.createElement("a");
    a.id = "go";
    a.className = "nav-link big";
    a.textContent = "  the   library page link here ";
    expect(describeElement(a)).toBe('a#go.nav-link "the library page link he"');
  });
});
