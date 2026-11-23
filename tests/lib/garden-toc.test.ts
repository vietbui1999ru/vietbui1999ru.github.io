import { describe, expect, it } from "vitest";
import { TOC_DEFAULTS, tocEntries, tocVisible } from "@/lib/toc";

const h = (depth: number, slug: string) => ({ depth, slug, text: `Title ${slug}` });

describe("tocEntries", () => {
  it("maps headings to anchor entries, keeping order and text", () => {
    const entries = tocEntries([h(2, "intro"), h(3, "detail"), h(2, "next")]);
    expect(entries).toEqual([
      { depth: 2, slug: "intro", text: "Title intro" },
      { depth: 3, slug: "detail", text: "Title detail" },
      { depth: 2, slug: "next", text: "Title next" },
    ]);
  });

  it("skips the h1 page title", () => {
    expect(tocEntries([h(1, "title"), h(2, "intro")]).map((e) => e.slug)).toEqual(["intro"]);
  });

  it("drops headings deeper than maxDepth", () => {
    const headings = [h(2, "a"), h(3, "b"), h(4, "c")];
    expect(tocEntries(headings, 3).map((e) => e.slug)).toEqual(["a", "b"]);
    expect(tocEntries(headings, 2).map((e) => e.slug)).toEqual(["a"]);
  });

  it("defaults maxDepth to 3", () => {
    expect(TOC_DEFAULTS.maxDepth).toBe(3);
    expect(tocEntries([h(4, "deep")])).toEqual([]);
  });
});

describe("tocVisible", () => {
  const three = tocEntries([h(2, "a"), h(2, "b"), h(2, "c")]);

  it("hides the TOC below minHeadings", () => {
    expect(tocVisible(tocEntries([h(2, "a"), h(2, "b")]))).toBe(false);
  });

  it("shows the TOC at exactly minHeadings", () => {
    expect(tocVisible(three)).toBe(true);
  });

  it("defaults minHeadings to 3", () => {
    expect(TOC_DEFAULTS.minHeadings).toBe(3);
  });

  it("never shows an empty TOC, even with minHeadings 0", () => {
    expect(tocVisible([], 0)).toBe(false);
  });
});
