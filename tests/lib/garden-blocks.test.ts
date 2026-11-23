import { describe, it, expect } from "vitest";
import { resolveBlocks } from "@/lib/garden-blocks";
import { gardenRegistry } from "@/components/garden/registry";

const NOTE = "Site/Home.md";

describe("resolveBlocks", () => {
  it("returns the registered component and props with defaults applied", () => {
    const [block] = resolveBlocks(NOTE, [{ block: "feed" }], gardenRegistry);
    expect(block.id).toBe("feed");
    expect(block.component).toBe(gardenRegistry.feed.component);
    expect(block.props).toEqual({ limit: 8 });
  });

  it("keeps the order of the note's block list", () => {
    const list = [{ block: "identity" }, { block: "focus" }, { block: "feed", limit: 6 }];
    const ids = resolveBlocks(NOTE, list, gardenRegistry).map((b) => b.id);
    expect(ids).toEqual(["identity", "focus", "feed"]);
  });

  it("fails naming the note for an unknown block id", () => {
    expect(() => resolveBlocks(NOTE, [{ block: "nope" }], gardenRegistry)).toThrow(
      /Site\/Home\.md.*nope/,
    );
  });

  it("fails naming the note and field for invalid props", () => {
    expect(() =>
      resolveBlocks(NOTE, [{ block: "feed", limit: "many" }], gardenRegistry),
    ).toThrow(/Site\/Home\.md.*limit/);
  });

  it("fails naming the note and the unknown key for a misspelt prop", () => {
    expect(() => resolveBlocks(NOTE, [{ block: "feed", limt: 6 }], gardenRegistry)).toThrow(
      /Site\/Home\.md.*limt/,
    );
  });

  it("toc defaults minHeadings and maxDepth to 3", () => {
    const [block] = resolveBlocks(NOTE, [{ block: "toc" }], gardenRegistry);
    expect(block.props).toEqual({ minHeadings: 3, maxDepth: 3 });
  });

  it("toc rejects an unknown prop and names it", () => {
    expect(() => resolveBlocks(NOTE, [{ block: "toc", maxdepth: 2 }], gardenRegistry)).toThrow(
      /Site\/Home\.md.*maxdepth/,
    );
  });

  it("toc rejects maxDepth outside 2 to 6", () => {
    expect(() => resolveBlocks(NOTE, [{ block: "toc", maxDepth: 1 }], gardenRegistry)).toThrow(
      /maxDepth/,
    );
  });

  it("rejects a non-positive feed limit", () => {
    expect(() => resolveBlocks(NOTE, [{ block: "feed", limit: 0 }], gardenRegistry)).toThrow(
      /limit/,
    );
  });
});
