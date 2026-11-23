import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { siteNoteSchema } from "@/content/schemas";

const SITE = path.resolve("tests/fixtures/garden-vault/Site");

function siteFiles(): string[] {
  const focus = fs.readdirSync(path.join(SITE, "Focus")).map((f) => path.join("Focus", f));
  return ["Home.md", "About.md", ...focus];
}

describe("site collection", () => {
  it("contains Home, About and Focus notes in the fixture", () => {
    const files = siteFiles();
    expect(files).toContain("Home.md");
    expect(files).toContain("About.md");
    expect(files.some((f) => f.startsWith("Focus" + path.sep))).toBe(true);
  });

  it("parses every site note against the site schema", () => {
    for (const file of siteFiles()) {
      const { data } = matter(fs.readFileSync(path.join(SITE, file), "utf-8"));
      expect(() => siteNoteSchema.parse(data), file).not.toThrow();
    }
  });

  it("rejects a site note without a title", () => {
    expect(() => siteNoteSchema.parse({ blocks: [] })).toThrow();
  });
});
