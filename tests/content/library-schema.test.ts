import { describe, it, expect } from "vitest";
import { librarySchema } from "@/content/schemas";

const base = { title: "PLACEHOLDER item", status: "backlog", publish: true };

describe("library schema", () => {
  it.each(["game", "book", "film", "recipe"])("accepts a minimal %s", (type) => {
    const item = librarySchema.parse({ ...base, type });
    expect(item.draft).toBe(false);
    expect(item.tags).toEqual([]);
  });

  it("accepts every optional field", () => {
    const item = librarySchema.parse({
      ...base,
      type: "book",
      status: "active",
      draft: true,
      cover: "cover.jpg",
      tags: ["placeholder"],
      rating: 7,
      progress: 40,
      started: "2026-01-02",
      finished: "2026-02-03",
      creator: "PLACEHOLDER author",
      year: 1999,
      link: "https://example.com/item",
    });
    expect(item.started).toBeInstanceOf(Date);
    expect(item.rating).toBe(7);
  });

  it.each(["title", "type", "status", "publish"])("requires %s", (key) => {
    const item: Record<string, unknown> = { ...base, type: "film" };
    delete item[key];
    expect(() => librarySchema.parse(item)).toThrow();
  });

  it.each([0, 11, 6.5])("rejects rating %s", (rating) => {
    expect(() => librarySchema.parse({ ...base, type: "film", rating })).toThrow();
  });

  it.each([-1, 101])("rejects progress %s", (progress) => {
    expect(() => librarySchema.parse({ ...base, type: "film", progress })).toThrow();
  });

  it("allows platform only on games", () => {
    expect(() => librarySchema.parse({ ...base, type: "game", platform: "PC" })).not.toThrow();
    expect(() => librarySchema.parse({ ...base, type: "book", platform: "PC" })).toThrow(/games only/);
  });

  it("allows staple only on recipes", () => {
    expect(() => librarySchema.parse({ ...base, type: "recipe", staple: true })).not.toThrow();
    expect(() => librarySchema.parse({ ...base, type: "film", staple: true })).toThrow(/recipes only/);
  });

  it("rejects an unknown type or status", () => {
    expect(() => librarySchema.parse({ ...base, type: "podcast" })).toThrow();
    expect(() => librarySchema.parse({ ...base, type: "book", status: "wishlist" })).toThrow();
  });
});
