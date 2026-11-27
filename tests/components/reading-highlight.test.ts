import { render } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ReadingHighlightFixture from "@/components/ui-lab/ReadingHighlightFixture.svelte";
import experience from "@/data/experience.json";
import { HIGHLIGHT_NAME, installReadingHighlight } from "@/lib/reading-highlight-dom";

// jsdom has no layout, no caret API and no CSS Custom Highlight API: the tests stub them.
class FakeHighlight {
  ranges: Range[];
  constructor(...ranges: Range[]) {
    this.ranges = ranges;
  }
}

let registry: Map<string, FakeHighlight>;
let caret: { offsetNode: Node; offset: number } | null;
let reduced: boolean;
const RECT = { left: 0, right: 500, top: 0, bottom: 100 } as DOMRect;
const cleanups: (() => void)[] = [];
// Installs and records the cleanup, so no listener leaks into the next test.
const install = (root: ParentNode) => {
  const stop = installReadingHighlight(root);
  cleanups.push(stop);
  return stop;
};

beforeEach(() => {
  registry = new Map();
  caret = null;
  reduced = false;
  vi.stubGlobal("CSS", { highlights: registry });
  vi.stubGlobal("Highlight", FakeHighlight);
  vi.stubGlobal("matchMedia", (q: string) => ({ matches: q.includes("reduce") && reduced }));
  Object.assign(document, { caretPositionFromPoint: () => caret });
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(RECT);
});

afterEach(() => {
  for (const stop of cleanups.splice(0)) stop();
  delete (document as { caretPositionFromPoint?: unknown }).caretPositionFromPoint;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
});

function move(x: number, y: number, pointerType = "mouse") {
  const event = new MouseEvent("pointermove", { clientX: x, clientY: y, bubbles: true });
  Object.defineProperty(event, "pointerType", { value: pointerType });
  document.dispatchEvent(event);
}

function block(html = "<p data-read-hl>first line <em>second</em> end</p><h3>Title</h3>") {
  const root = document.createElement("section");
  root.innerHTML = html;
  document.body.append(root);
  return root;
}

const painted = () => registry.get(HIGHLIGHT_NAME)?.ranges.map((r) => r.toString());

describe("pointer", () => {
  it("highlights the block text up to the caret under a mouse", () => {
    const root = block();
    install(root);
    caret = { offsetNode: root.querySelector("p")!.firstChild!, offset: 5 };
    move(10, 10);
    expect(painted()).toEqual(["first"]);
  });

  it("keeps the furthest position when the pointer moves back or leaves", () => {
    const root = block();
    install(root);
    const em = root.querySelector("em")!.firstChild!;
    caret = { offsetNode: em, offset: 3 };
    move(10, 10, "pen");
    caret = { offsetNode: root.querySelector("p")!.firstChild!, offset: 2 };
    move(10, 10);
    caret = null;
    move(900, 10);
    expect(painted()).toEqual(["first line sec"]);
  });

  it("highlights the whole block when the pointer is below it", () => {
    const root = block();
    install(root);
    move(10, 150);
    expect(painted()).toEqual(["first line second end"]);
  });

  it("ignores a caret outside the blocks and touch pointers", () => {
    const root = block();
    install(root);
    caret = { offsetNode: root.querySelector("h3")!.firstChild!, offset: 2 };
    move(10, 10);
    caret = { offsetNode: root.querySelector("p")!.firstChild!, offset: 5 };
    move(10, 10, "touch");
    expect(registry.has(HIGHLIGHT_NAME)).toBe(false);
  });
});

describe("fallback", () => {
  const cases: [string, () => void][] = [
    ["reduced motion", () => (reduced = true)],
    ["no CSS.highlights", () => vi.stubGlobal("CSS", {})],
    ["no caret API", () => delete (document as { caretPositionFromPoint?: unknown }).caretPositionFromPoint],
  ];
  it.each(cases)("does nothing with %s", (_name, setup) => {
    setup();
    const add = vi.spyOn(document, "addEventListener");
    const root = block();
    install(root)();
    move(10, 150);
    expect(add).not.toHaveBeenCalledWith("pointermove", expect.anything(), expect.anything());
    expect(registry.has(HIGHLIGHT_NAME)).toBe(false);
  });
});

describe("cleanup", () => {
  it("removes the listener and deletes the highlight", () => {
    const root = block();
    const stop = install(root);
    move(10, 150);
    expect(registry.has(HIGHLIGHT_NAME)).toBe(true);
    stop();
    expect(registry.has(HIGHLIGHT_NAME)).toBe(false);
    move(10, 150);
    expect(registry.has(HIGHLIGHT_NAME)).toBe(false);
  });
});

describe("fixture", () => {
  const job = experience.items[0].jobs[0];

  it("renders the first About entry with only the content marked", () => {
    const { container } = render(ReadingHighlightFixture);
    const marked = container.querySelectorAll("[data-read-hl]");
    expect(marked).toHaveLength(1);
    expect(marked[0].tagName).toBe("P");
    expect(marked[0].textContent).toBe(job.content);
    expect(marked[0].classList.contains("text-journal-1")).toBe(true);
    expect(container.querySelector("h3")!.textContent).toBe(job.name);
    expect(container.querySelector("h3")!.hasAttribute("data-read-hl")).toBe(false);
    expect(container.textContent).toContain(job.date);
  });

  it("installs on mount and cleans up on destroy", () => {
    const { unmount } = render(ReadingHighlightFixture);
    move(10, 150);
    expect(registry.has(HIGHLIGHT_NAME)).toBe(true);
    unmount();
    expect(registry.has(HIGHLIGHT_NAME)).toBe(false);
  });
});
