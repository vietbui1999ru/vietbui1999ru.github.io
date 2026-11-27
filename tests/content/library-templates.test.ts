import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { librarySchema } from "@/content/schemas";

const DIR = path.resolve("docs/library/templates");

describe("library templates", () => {
  it.each(["game", "book", "film", "recipe"])("%s template passes the library schema", (type) => {
    const { data, content } = matter(fs.readFileSync(path.join(DIR, `${type}.md`), "utf-8"));
    expect(data.type).toBe(type);
    expect(content.trim()).toBe("");
    expect(() => librarySchema.parse(data)).not.toThrow();
  });

  it("ships a sample .base file with a view per type", () => {
    const base = fs.readFileSync(path.join(DIR, "library.base"), "utf-8");
    for (const type of ["game", "book", "film", "recipe"]) expect(base).toContain(`type == "${type}"`);
  });
});
