import { describe, expect, it } from "vitest";
import { nextIndex, createTypeahead, TYPEAHEAD_RESET_MS } from "@/lib/listbox";

describe("navigation", () => {
  it("moves down and up by one", () => {
    expect(nextIndex("ArrowDown", 1, 4)).toBe(2);
    expect(nextIndex("ArrowUp", 1, 4)).toBe(0);
  });

  it("clamps at the ends without wrapping", () => {
    expect(nextIndex("ArrowDown", 3, 4)).toBe(3);
    expect(nextIndex("ArrowUp", 0, 4)).toBe(0);
  });

  it("jumps to the first and last option", () => {
    expect(nextIndex("Home", 2, 4)).toBe(0);
    expect(nextIndex("End", 0, 4)).toBe(3);
  });

  it("returns null for keys it does not handle", () => {
    expect(nextIndex("Enter", 1, 4)).toBeNull();
    expect(nextIndex("a", 1, 4)).toBeNull();
  });
});

describe("type-ahead", () => {
  const labels = ["featured", "newest", "Title", "status", "stale"];

  it("matches a prefix case-insensitively, after the active option", () => {
    let now = 0;
    const ta = createTypeahead(() => now);
    expect(ta.match("t", labels, 0)).toBe(2);
    now += 100;
    expect(ta.match("s", labels, 2)).toBe(-1);
  });

  it("builds a prefix from keys typed within the reset window", () => {
    let now = 0;
    const ta = createTypeahead(() => now);
    expect(ta.match("s", labels, 0)).toBe(3);
    now += 100;
    expect(ta.match("t", labels, 3)).toBe(3);
    now += 100;
    expect(ta.match("a", labels, 3)).toBe(3);
    now += 100;
    expect(ta.match("l", labels, 3)).toBe(4);
  });

  it("starts the search at the option after the active one and wraps", () => {
    const ta = createTypeahead(() => 0);
    expect(ta.match("s", labels, 3)).toBe(4);
    const tb = createTypeahead(() => 0);
    expect(tb.match("f", labels, 4)).toBe(0);
  });

  it("resets the prefix after the window", () => {
    let now = 0;
    const ta = createTypeahead(() => now);
    ta.match("s", labels, 0);
    now += TYPEAHEAD_RESET_MS + 1;
    expect(ta.match("n", labels, 3)).toBe(1);
  });

  it("returns -1 when nothing matches", () => {
    const ta = createTypeahead(() => 0);
    expect(ta.match("z", labels, 0)).toBe(-1);
  });
});
