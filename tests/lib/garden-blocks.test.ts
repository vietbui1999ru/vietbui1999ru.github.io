import { describe, it, expect } from "vitest";
import { resolveBlocks } from "@/lib/garden-blocks";
import { gardenRegistry } from "@/components/garden/registry";
import { librarySchema } from "@/content/schemas";
import { currentlyItems } from "@/lib/library-view";

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

  it("accepts feed sources and rejects an unknown source", () => {
    const [block] = resolveBlocks(NOTE, [{ block: "feed", sources: ["library"] }], gardenRegistry);
    expect(block.props).toEqual({ limit: 8, sources: ["library"] });
    expect(() => resolveBlocks(NOTE, [{ block: "feed", sources: ["podcast"] }], gardenRegistry)).toThrow(
      /sources/,
    );
  });
});

describe("currently block", () => {
  it("registers currently with no props", () => {
    const [block] = resolveBlocks(NOTE, [{ block: "currently" }], gardenRegistry);
    expect(block.component).toBe(gardenRegistry.currently.component);
    expect(block.props).toEqual({});
    expect(() => resolveBlocks(NOTE, [{ block: "currently", limit: 3 }], gardenRegistry)).toThrow(/limit/);
  });

  it("renders currently only when the home note lists it", () => {
    const ids = resolveBlocks(NOTE, [{ block: "identity" }, { block: "feed" }], gardenRegistry).map((b) => b.id);
    expect(ids).not.toContain("currently");
  });

  it("currently lists active items across types, most recently started first", () => {
    const entry = (id: string, status: string, started: string, extra: Record<string, unknown> = {}) => ({
      id,
      data: librarySchema.parse({ title: id, type: id.split("/")[0], status, publish: true, started, ...extra }),
    });
    const items = currentlyItems(
      [
        entry("book/a", "active", "2026-01-01"),
        entry("game/b", "active", "2026-03-01", { progress: 30 }),
        entry("film/c", "done", "2026-04-01"),
        entry("recipe/d", "active", "2026-05-01", { draft: true }),
      ],
      { dev: false },
    );
    expect(items.map((i) => [i.href, i.statusLabel])).toEqual([
      ["/library/game/b", "playing"],
      ["/library/book/a", "reading"],
    ]);
    expect(items[0].progress).toBe(30);
  });
});
