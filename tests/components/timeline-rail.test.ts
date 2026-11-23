import { render } from "@testing-library/svelte";
import { createRawSnippet, flushSync } from "svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import TimelineRail from "@/components/patterns/TimelineRail.svelte";

// jsdom has no layout: the rail spans y = 100..500, checkpoints sit at offsets 0, 120, 240, 360.
// window.innerHeight is 768, so the scroll-mode marker is 384 - 100 = 284.
const items = ["a", "b", "c", "d"].map((id) => ({ id }));

beforeEach(() => {
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
    const el = this as HTMLElement;
    if (el.dataset.rail !== undefined) return DOMRect.fromRect({ x: 0, y: 100, width: 10, height: 400 });
    if (el.dataset.checkpoint !== undefined) {
      const i = Number(el.dataset.index);
      return DOMRect.fromRect({ x: 0, y: 100 + i * 120, width: 0, height: 0 });
    }
    return DOMRect.fromRect({ x: 0, y: 0, width: 0, height: 0 });
  });
});

afterEach(() => vi.restoreAllMocks());

function setup() {
  const entry = createRawSnippet((item: () => { id: string }) => ({
    render: () => `<p>entry ${item().id}</p>`,
  }));
  const { container } = render(TimelineRail, {
    props: { items, key: (i: { id: string }) => i.id, tone: () => "sage" as const, entry },
  });
  flushSync();
  const rail = container.querySelector<HTMLElement>("[data-rail]")!;
  const states = () =>
    [...container.querySelectorAll<HTMLElement>("[data-checkpoint]")].map((c) => c.dataset.state);
  return { container, rail, states };
}

function pointer(target: Element, type: string, pointerType: string, clientY: number) {
  const event = new MouseEvent(type, { bubbles: true, clientY });
  Object.defineProperty(event, "pointerType", { value: pointerType });
  target.dispatchEvent(event);
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
