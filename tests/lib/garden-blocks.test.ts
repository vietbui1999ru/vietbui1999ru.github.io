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

  it("rejects a non-positive feed limit", () => {
    expect(() => resolveBlocks(NOTE, [{ block: "feed", limit: 0 }], gardenRegistry)).toThrow(
      /limit/,
    );
  });
});
