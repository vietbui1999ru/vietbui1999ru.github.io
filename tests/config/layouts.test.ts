import { describe, it, expect } from "vitest";
import { LAYOUTS, layoutFor, layoutBlocks } from "@/config/layouts";

describe("layout presets", () => {
  it("defines essay, notebook and visual as block lists", () => {
    expect(Object.keys(LAYOUTS).sort()).toEqual(["essay", "notebook", "visual"]);
    for (const preset of Object.values(LAYOUTS)) {
      expect(Array.isArray(preset)).toBe(true);
    }
  });

  it("gives essay and notebook a backlinks block", () => {
    expect(layoutBlocks("essay").map((b) => b.block)).toContain("backlinks");
    expect(layoutBlocks("notebook").map((b) => b.block)).toContain("backlinks");
  });

  it("uses only registry blocks, validated at load", () => {
    expect(() => layoutBlocks("essay")).not.toThrow();
    expect(layoutBlocks("essay").every((b) => typeof b.block === "string")).toBe(true);
  });
});

describe("layoutFor", () => {
  it("defaults post and thought to essay", () => {
    expect(layoutFor({ type: "post" })).toBe("essay");
    expect(layoutFor({ type: "thought" })).toBe("essay");
  });

  it("honours an explicit preset", () => {
    expect(layoutFor({ type: "post", layout: "notebook" })).toBe("notebook");
  });

  it("fails naming the unknown layout", () => {
    expect(() => layoutFor({ type: "post", layout: "poster" })).toThrow(/unknown layout "poster"/);
  });
});
