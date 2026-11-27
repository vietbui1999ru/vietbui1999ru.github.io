import { render } from "@testing-library/svelte";
import { flushSync } from "svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import GardenToc from "@/components/garden/GardenToc.svelte";

// jsdom has no layout. The rail spans viewport y 100..240, checkpoints sit at rail offsets
// 20, 60 and 100, headings at document y 1000, 2000 and 3000, and the content ends at 4000.
// innerHeight is 1000, so the reading line is scrollY + 300.
const headings = [
  { depth: 2, slug: "one", text: "One" },
  { depth: 3, slug: "two", text: "Two" },
  { depth: 2, slug: "three", text: "Three" },
];
const HEADING_Y: Record<string, number> = { one: 1000, two: 2000, three: 3000 };

let queue: FrameRequestCallback[] = [];
let clock = 0;
let scrollY = 0;
let reduced = false;
function frames(n = 1) {
  for (let i = 0; i < n; i++) {
    clock += 16;
    const run = queue;
    queue = [];
    run.forEach((cb) => cb(clock));
  }
}
function scrollTo(y: number) {
  scrollY = y;
  window.dispatchEvent(new Event("scroll"));
}

beforeEach(() => {
  queue = [];
  clock = 1000;
  scrollY = 0;
  reduced = false;
  vi.spyOn(performance, "now").mockImplementation(() => clock);
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => queue.push(cb));
  vi.stubGlobal("cancelAnimationFrame", () => {});
  vi.stubGlobal("matchMedia", (q: string) => ({ matches: q.includes("reduce") && reduced }));
  vi.stubGlobal("innerHeight", 1000);
  Object.defineProperty(window, "scrollY", { configurable: true, get: () => scrollY });
  // The page scrolls to 3300, so the reading line catches up to the content end only past 2300.
  Object.defineProperty(document.documentElement, "scrollHeight", { configurable: true, value: 4300 });
  Element.prototype.animate = vi.fn();
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
    const el = this as HTMLElement;
    const at = (y: number, height = 0) => DOMRect.fromRect({ x: 0, y: y - scrollY, width: 0, height });
    if (el.dataset.readingRail !== undefined) return DOMRect.fromRect({ x: 0, y: 100, width: 0, height: 140 });
    if (el.dataset.checkpoint !== undefined)
      return DOMRect.fromRect({ x: 0, y: 120 + Number(el.dataset.index) * 40, width: 0, height: 0 });
    if (el.dataset.hiddenCopy !== undefined) return DOMRect.fromRect({ x: 0, y: 0, width: 0, height: 0 });
    if (el.id in HEADING_Y) return at(HEADING_Y[el.id]);
    if (el.dataset.inkObstacle === "content") return at(0, 4000);
    return DOMRect.fromRect({ x: 0, y: 0, width: 0, height: 0 });
  });
  document.body.innerHTML = `<article data-ink-obstacle="content">${headings
    .map((h) => `<h${h.depth} id="${h.slug}">${h.text}</h${h.depth}>`)
    .join("")}</article>`;
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
});

function pointer(pointerType: string, clientY: number) {
  const event = new MouseEvent("pointermove", { bubbles: true, clientY });
  Object.defineProperty(event, "pointerType", { value: pointerType });
  document.dispatchEvent(event);
}

function setup() {
  const { container } = render(GardenToc, { props: { headings, sidebar: true } });
  flushSync();
  const nav = container.querySelector<HTMLElement>("nav")!;
  const marker = nav.querySelector<HTMLElement>("[data-rail-marker]")!;
  const checkpoints = () => [...nav.querySelectorAll<HTMLElement>("[data-checkpoint]")];
  const states = () => checkpoints().map((c) => c.dataset.state);
  const markerY = () => Number(/,\s*(-?[\d.]+)px/.exec(marker.style.transform)?.[1]) + 6.5;
  return { container, nav, marker, checkpoints, states, markerY };
}

describe("GardenToc reading rail", () => {
  it("rail: renders one checkpoint per entry inside its link, one marker and two line segments", () => {
    const { nav, checkpoints } = setup();
    expect(nav.querySelectorAll("[data-rail-marker]")).toHaveLength(1);
    expect(nav.querySelectorAll("[data-rail-line]")).toHaveLength(2);
    expect(checkpoints()).toHaveLength(3);
    for (const [i, cp] of checkpoints().entries()) {
      expect(cp.closest("a")?.getAttribute("href")).toBe(`#${headings[i].slug}`);
      expect(cp.getAttribute("aria-hidden")).toBe("true");
    }
    for (const el of nav.querySelectorAll("[data-rail-line], [data-rail-marker]"))
      expect(el.getAttribute("aria-hidden")).toBe("true");
    // The h3 checkpoint is smaller than the h2 checkpoints.
    expect(checkpoints()[1].className).toContain("h-[7px]");
    expect(checkpoints()[0].className).toContain("h-[10px]");
  });

  it("scroll: the marker glides to the reading position and sets checkpoint states", () => {
    const { nav, states, markerY } = setup();
    expect(nav.querySelector("[data-reading-rail]")?.hasAttribute("data-rail-ready")).toBe(true);
    // Reading line 300 is above the first heading, so the marker waits on the first checkpoint.
    expect(markerY()).toBeCloseTo(20, 1);
    expect(states()).toEqual(["passed", "upcoming", "upcoming"]);
    scrollTo(2200); // reading line 2500: halfway between checkpoints 60 and 100
    frames(1);
    expect(markerY()).toBeGreaterThan(20);
    expect(markerY()).toBeLessThan(80);
    frames(200);
    expect(markerY()).toBeCloseTo(80, 0);
    expect(states()).toEqual(["passed", "passed", "upcoming"]);
  });

  it("scroll: at the end of the scroll the marker reaches the last checkpoint and every checkpoint passes", () => {
    reduced = true;
    const { states, markerY } = setup();
    scrollTo(3300);
    frames(1);
    expect(markerY()).toBeCloseTo(100, 1);
    expect(states()).toEqual(["passed", "passed", "passed"]);
  });

  it("scroll: measures the visible heading, not a hidden copy with the same id", () => {
    // A blog post keeps a hidden copy of its headings (variant storage) before the content.
    document.body.insertAdjacentHTML(
      "afterbegin",
      `<div style="display:none">${headings.map((h) => `<h2 id="${h.slug}" data-hidden-copy></h2>`).join("")}</div>`,
    );
    reduced = true;
    const { markerY } = setup();
    pointer("mouse", 1400);
    frames(1);
    expect(markerY()).toBeCloseTo(36, 1);
  });

  it("pointer: the marker follows the mouse in proportion between headings", () => {
    reduced = true;
    const { states, markerY } = setup();
    pointer("mouse", 1400); // 40% of the way from heading 1 (1000) to heading 2 (2000)
    frames(1);
    expect(markerY()).toBeCloseTo(36, 1);
    pointer("mouse", 1900); // short of heading 2: its checkpoint stays upcoming
    frames(1);
    expect(states()).toEqual(["passed", "upcoming", "upcoming"]);
    pointer("mouse", 2000); // on heading 2
    frames(1);
    expect(markerY()).toBeCloseTo(60, 1);
    expect(states()).toEqual(["passed", "passed", "upcoming"]);
  });

  it("pointer: scrolling under a still mouse moves the marker", () => {
    reduced = true;
    const { markerY } = setup();
    pointer("mouse", 500); // above heading 1
    frames(1);
    expect(markerY()).toBeCloseTo(20, 1);
    scrollTo(2000); // the mouse now sits over document y 2500
    frames(1);
    expect(markerY()).toBeCloseTo(80, 1);
  });

  it("pointer: a pen counts, touch does not, and leaving the page returns to scroll mode", () => {
    reduced = true;
    const { markerY } = setup();
    pointer("touch", 2000);
    frames(1);
    expect(markerY()).toBeCloseTo(20, 1);
    pointer("pen", 2000);
    frames(1);
    expect(markerY()).toBeCloseTo(60, 1);
    document.documentElement.dispatchEvent(new Event("pointerleave"));
    frames(1);
    expect(markerY()).toBeCloseTo(20, 1); // scroll mode: reading line 300
  });

  it("pointer: the marker chases with no overshoot while the mouse moves", () => {
    const { markerY } = setup();
    let peak = 0;
    for (let y = 1000; y <= 2000; y += 50) {
      pointer("mouse", y);
      frames(1);
      peak = Math.max(peak, markerY());
    }
    expect(peak).toBeLessThanOrEqual(60 + 0.5);
  });

  it("reduced motion: the marker jumps to its target and checkpoints do not pop", () => {
    reduced = true;
    const { states, markerY, checkpoints } = setup();
    scrollTo(1700); // reading line 2000: the second checkpoint
    frames(1);
    expect(markerY()).toBeCloseTo(60, 1);
    expect(states()).toEqual(["passed", "passed", "upcoming"]);
    for (const cp of checkpoints()) expect(cp.animate).not.toHaveBeenCalled();
  });

  it("breakpoint: the rail shows only at lg and up, the collapsed TOC only below lg", () => {
    const { container, nav } = setup();
    expect(nav.classList.contains("hidden")).toBe(true);
    expect(nav.classList.contains("lg:block")).toBe(true);
    expect(container.querySelector("details")?.classList.contains("lg:hidden")).toBe(true);
  });
});
