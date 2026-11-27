import { describe, it, expect } from "vitest";
import { librarySchema } from "@/content/schemas";
import { statusLabel, statusesFor } from "@/lib/library-status";

describe("library status labels", () => {
  it.each([
    ["game", "active", "playing"],
    ["game", "done", "finished"],
    ["book", "active", "reading"],
    ["book", "done", "read"],
    ["film", "active", "watching"],
    ["film", "done", "watched"],
    ["recipe", "backlog", "to try"],
    ["recipe", "active", "trying"],
    ["recipe", "done", "tried"],
    ["recipe", "dropped", "not for me"],
  ] as const)("%s %s reads %s", (type, status, label) => {
    expect(statusLabel(type, status)).toBe(label);
  });

  it("gives games, books and films all five statuses", () => {
    for (const type of ["game", "book", "film"] as const) {
      expect(statusesFor(type)).toEqual(["backlog", "active", "paused", "done", "dropped"]);
    }
  });

  it("gives recipes no paused status", () => {
    expect(statusesFor("recipe")).not.toContain("paused");
    expect(() => statusLabel("recipe", "paused")).toThrow();
  });

  it("rejects a paused recipe in the schema", () => {
    const item = { title: "PLACEHOLDER", type: "recipe", status: "paused", publish: true };
    expect(() => librarySchema.parse(item)).toThrow(/paused/);
  });
});
