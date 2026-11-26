import { render, screen, cleanup } from "@testing-library/svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import PaperBlogVariants from "@/components/svelte/PaperBlogVariants.svelte";
import GardenToc from "@/components/garden/GardenToc.svelte";

const STORAGE = "variant-test-storage";

// Mirrors the post page: the Original and any published TLDR sit in hidden storage,
// each with its own headings.
function mountStorage(variants: Array<{ label: string; headings: string[] }>) {
  const storage = document.createElement("div");
  storage.id = STORAGE;
  for (const v of variants) {
    const block = document.createElement("div");
    block.dataset.variantLabel = v.label;
    block.dataset.headings = JSON.stringify(
      v.headings.map((text, i) => ({ depth: 2, slug: `${v.label}-${i}`, text })),
    );
    for (const t of v.headings) {
      const h = document.createElement("h2");
      h.textContent = t;
      block.appendChild(h);
    }
    storage.appendChild(block);
  }
  document.body.appendChild(storage);
}

afterEach(() => {
  cleanup();
  document.getElementById(STORAGE)?.remove();
});

describe("post variant switcher", () => {
  it("shows no tabs when only the Original exists", () => {
    mountStorage([{ label: "Original", headings: ["One", "Two"] }]);
    render(PaperBlogVariants, { storageId: STORAGE });
    expect(screen.queryByRole("tablist")).toBeNull();
  });

  it("shows Original and TLDR tabs when a published TLDR exists", () => {
    mountStorage([
      { label: "Original", headings: ["One"] },
      { label: "TLDR", headings: ["Short"] },
    ]);
    render(PaperBlogVariants, { storageId: STORAGE });
    const tabs = screen.getAllByRole("tab").map((t) => t.textContent?.trim());
    expect(tabs).toEqual(["Original", "TLDR"]);
  });
});

describe("TOC follows the active tab", () => {
  it("swaps its entries when the switcher announces a new tab's headings", async () => {
    render(GardenToc, {
      headings: [{ depth: 2, slug: "o", text: "Original heading" }],
      minHeadings: 1,
    });
    expect(screen.getByText("Original heading")).toBeTruthy();

    window.dispatchEvent(
      new CustomEvent("variant-change", {
        detail: { headings: [{ depth: 2, slug: "t", text: "TLDR heading" }] },
      }),
    );
    await Promise.resolve();
    expect(await screen.findByText("TLDR heading")).toBeTruthy();
    expect(screen.queryByText("Original heading")).toBeNull();
  });

  it("re-observes the new tab's headings so the active section follows the switch", () => {
    const observed: string[] = [];
    let disconnects = 0;
    class FakeObserver {
      observe(el: Element) {
        observed.push(el.id);
      }
      disconnect() {
        disconnects += 1;
      }
      unobserve() {}
      takeRecords() {
        return [];
      }
    }
    vi.stubGlobal("IntersectionObserver", FakeObserver);
    const original = document.createElement("h2");
    original.id = "o";
    const tldr = document.createElement("h2");
    tldr.id = "t";
    document.body.append(original, tldr);
    try {
      render(GardenToc, {
        headings: [{ depth: 2, slug: "o", text: "Original heading" }],
        minHeadings: 1,
      });
      expect(observed).toEqual(["o"]);

      window.dispatchEvent(
        new CustomEvent("variant-change", {
          detail: { headings: [{ depth: 2, slug: "t", text: "TLDR heading" }] },
        }),
      );
      expect(disconnects).toBeGreaterThanOrEqual(1);
      expect(observed).toEqual(["o", "t"]);
    } finally {
      original.remove();
      tldr.remove();
      vi.unstubAllGlobals();
    }
  });
});
