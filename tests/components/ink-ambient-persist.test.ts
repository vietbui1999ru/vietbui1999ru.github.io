import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { watchPage } from "@/lib/ink-ambient/page-watch";

// jsdom has no layout observers; these fakes record what each observer watches.
const watched = { resize: [] as Element[], mutation: [] as Node[], sections: [] as Element[] };
let mutationCallbacks: MutationCallback[] = [];

class FakeResize {
  observe(el: Element) {
    watched.resize.push(el);
  }
  disconnect() {
    watched.resize = [];
  }
}
class FakeIntersection {
  observe(el: Element) {
    watched.sections.push(el);
  }
  disconnect() {
    watched.sections = [];
  }
}

beforeEach(() => {
  watched.resize = [];
  watched.mutation = [];
  watched.sections = [];
  mutationCallbacks = [];
  vi.stubGlobal("ResizeObserver", FakeResize);
  vi.stubGlobal("IntersectionObserver", FakeIntersection);
  vi.stubGlobal(
    "MutationObserver",
    class {
      constructor(cb: MutationCallback) {
        mutationCallbacks.push(cb);
      }
      observe(node: Node) {
        watched.mutation.push(node);
      }
      disconnect() {
        watched.mutation = [];
      }
      takeRecords() {
        return [];
      }
    },
  );
  document.body.innerHTML = `<section data-section-id="a"></section>`;
});

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
});

/** Replaces the body the way Astro's ClientRouter swap does, then fires astro:after-swap. */
function swapBody(html: string) {
  const next = document.createElement("body");
  next.innerHTML = html;
  document.body.replaceWith(next);
  document.dispatchEvent(new Event("astro:after-swap"));
}

describe("ink island across a page swap", () => {
  it("watches the body and the section elements of the first page", () => {
    const watch = watchPage({ onLayout: vi.fn(), onSections: vi.fn(), onSwap: vi.fn() });
    expect(watched.resize).toEqual([document.body]);
    expect(watched.mutation).toEqual([document.body]);
    expect(watched.sections.map((s) => s.getAttribute("data-section-id"))).toEqual(["a"]);
    watch.disconnect();
  });

  it("moves every observer to the new body and its sections after a swap", () => {
    const onSwap = vi.fn();
    const watch = watchPage({ onLayout: vi.fn(), onSections: vi.fn(), onSwap });
    swapBody(`<section data-section-id="b"></section><section data-section-id="c"></section>`);
    expect(onSwap).toHaveBeenCalledTimes(1);
    expect(watched.resize).toEqual([document.body]);
    expect(watched.mutation).toEqual([document.body]);
    expect(watched.sections.map((s) => s.getAttribute("data-section-id"))).toEqual(["b", "c"]);
    watch.disconnect();
  });

  it("reports body mutations as a layout change", () => {
    const onLayout = vi.fn();
    const watch = watchPage({ onLayout, onSections: vi.fn(), onSwap: vi.fn() });
    mutationCallbacks.at(-1)!([], {} as MutationObserver);
    expect(onLayout).toHaveBeenCalled();
    watch.disconnect();
  });

  it("stops following swaps after disconnect", () => {
    const onSwap = vi.fn();
    const watch = watchPage({ onLayout: vi.fn(), onSections: vi.fn(), onSwap });
    watch.disconnect();
    swapBody(`<section data-section-id="d"></section>`);
    expect(onSwap).not.toHaveBeenCalled();
    expect(watched.sections).toEqual([]);
  });
});
