import { render } from "@testing-library/svelte";
import { createRawSnippet, flushSync } from "svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import TimelineRail from "@/components/patterns/TimelineRail.svelte";
import { installTimelineRails } from "@/lib/timeline-rail-dom";

// jsdom has no layout: the rail spans y = 100..500, checkpoints sit at offsets 0, 120, 240, 360.
// window.innerHeight is 768, so the scroll-mode marker is 384 - 100 = 284.
const items = ["a", "b", "c", "d"].map((id) => ({ id }));

// Frames queue up and run when a test calls frames(). Reduced motion is on, so the marker
// reaches its target in one frame; tests/lib/rail-motion.test.ts covers the spring itself.
let queue: FrameRequestCallback[] = [];
function frames(n = 1) {
  for (let i = 0; i < n; i++) {
    const run = queue;
    queue = [];
    run.forEach((cb) => cb(performance.now()));
  }
}
beforeEach(() => {
  queue = [];
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => queue.push(cb));
  vi.stubGlobal("matchMedia", (q: string) => ({ matches: q.includes("reduce") }));
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
    const el = this as HTMLElement;
    if (el.dataset.rail !== undefined)
      return DOMRect.fromRect({ x: 0, y: 100, width: 10, height: 400 });
    if (el.dataset.checkpoint !== undefined) {
      const i = Number(el.dataset.index);
      return DOMRect.fromRect({ x: 0, y: 100 + i * 120, width: 0, height: 0 });
    }
    return DOMRect.fromRect({ x: 0, y: 0, width: 0, height: 0 });
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function setup(install = true) {
  const entry = createRawSnippet((item: () => { id: string }) => ({
    render: () => `<p>entry ${item().id}</p>`,
  }));
  const { container } = render(TimelineRail, {
    props: { items, key: (i: { id: string }) => i.id, tone: () => "sage" as const, entry },
  });
  flushSync();
  if (install) installTimelineRails(container);
  const rail = container.querySelector<HTMLElement>("[data-rail]")!;
  const states = () =>
    [...container.querySelectorAll<HTMLElement>("[data-checkpoint]")].map((c) => c.dataset.state);
  return { container, rail, states };
}

function pointer(target: Element, type: string, pointerType: string, clientY: number) {
  const event = new MouseEvent(type, { bubbles: true, clientY });
  Object.defineProperty(event, "pointerType", { value: pointerType });
  target.dispatchEvent(event);
  frames();
  flushSync();
}

describe("render", () => {
  it("renders one checkpoint per item, one marker and two line segments", () => {
    const { container } = setup();
    expect(container.querySelectorAll("[data-checkpoint]")).toHaveLength(4);
    expect(container.querySelectorAll("[data-rail-marker]")).toHaveLength(1);
    expect(container.querySelector('[data-rail-line="passed"]')).toBeTruthy();
    expect(container.querySelector('[data-rail-line="upcoming"]')).toBeTruthy();
    expect(container.textContent).toContain("entry c");
  });

  it("sets checkpoint states from the scroll-mode marker", () => {
    const { states } = setup();
    expect(states()).toEqual(["passed", "passed", "passed", "upcoming"]);
  });
});

describe("pointer", () => {
  it("moves the marker to a mouse pointer", () => {
    const { rail, states } = setup();
    pointer(rail, "pointermove", "mouse", 150);
    expect(states()).toEqual(["passed", "upcoming", "upcoming", "upcoming"]);
  });

  it("moves the marker to a pen pointer", () => {
    const { rail, states } = setup();
    pointer(rail, "pointermove", "pen", 600);
    expect(states()).toEqual(["passed", "passed", "passed", "passed"]);
  });

  it("ignores touch pointers", () => {
    const { rail, states } = setup();
    pointer(rail, "pointermove", "touch", 150);
    expect(states()).toEqual(["passed", "passed", "passed", "upcoming"]);
  });

  it("returns to the scroll position when the pointer leaves", () => {
    const { rail, states } = setup();
    pointer(rail, "pointermove", "mouse", 150);
    pointer(rail, "pointerleave", "mouse", 150);
    expect(states()).toEqual(["passed", "passed", "passed", "upcoming"]);
  });
});

const marker = (rail: HTMLElement) =>
  rail.querySelector<HTMLElement>("[data-rail-marker]")!.style.transform;
const line = (rail: HTMLElement) =>
  rail.querySelector<HTMLElement>('[data-rail-line="passed"]')!.style.transform;

describe("script", () => {
  it("renders a static timeline before the script runs", () => {
    const { rail, states } = setup(false);
    expect(rail.dataset.railReady).toBeUndefined();
    expect(states()).toEqual(["passed", "passed", "passed", "passed"]);
  });

  it("places the marker at its first target", () => {
    const { rail } = setup();
    // Marker centre at 284: translate by 284 - 6.5. The passed line covers 284 / 400.
    expect(marker(rail)).toBe("translate3d(0, 277.5px, 0)");
    expect(line(rail)).toBe("scaleY(0.7100)");
    expect(rail.dataset.railReady).toBe("");
  });

  it("moves the marker to the pointer offset", () => {
    const { rail } = setup();
    pointer(rail, "pointermove", "mouse", 150);
    expect(marker(rail)).toBe("translate3d(0, 43.5px, 0)");
    expect(rail.dataset.railTarget).toBe("50");
  });
});

describe("cleanup", () => {
  it("stops reacting to scroll after the returned cleanup runs", () => {
    // Rails from earlier tests in this file were never cleaned up and still listen, so
    // count the frames a scroll schedules before the install as the baseline.
    const scrollFrames = () => {
      frames(5);
      queue = [];
      window.dispatchEvent(new Event("scroll"));
      return queue.length;
    };
    const { container } = setup(false);
    const baseline = scrollFrames();
    const cleanup = installTimelineRails(container);
    expect(scrollFrames()).toBe(baseline + 1);
    cleanup();
    expect(scrollFrames()).toBe(baseline);
  });
});
