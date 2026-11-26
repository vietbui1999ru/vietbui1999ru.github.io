import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { blogSchema } from "@/content/schemas";
import { buildFeed } from "@/lib/garden-feed";

const base = { title: "x", description: "y", date: "2026-04-16" };

describe("blogSchema publish flag", () => {
  it("defaults publish to false", () => {
    expect(blogSchema.parse(base).publish).toBe(false);
  });

  it("accepts publish: true", () => {
    expect(blogSchema.parse({ ...base, publish: true }).publish).toBe(true);
  });

  it("no longer has a draft field", () => {
    expect(blogSchema.parse({ ...base, draft: true })).not.toHaveProperty("draft");
  });
});

describe("unpublished posts never render", () => {
  it("the garden feed drops posts that are not published", () => {
    const feed = buildFeed(
      [
        { id: "live", data: { title: "Live", date: new Date("2026-05-02"), publish: true } },
        { id: "wip", data: { title: "WIP", date: new Date("2026-05-03"), publish: false } },
      ],
      [],
    );
    expect(feed.map((f) => f.href)).toEqual(["/blog/live"]);
  });

  it("the blog static paths and archive filter on publish", () => {
    const root = path.resolve(__dirname, "../..");
    const detail = fs.readFileSync(path.join(root, "src/pages/blog/[...slug].astro"), "utf8");
    const archive = fs.readFileSync(path.join(root, "src/pages/blog/index.astro"), "utf8");
    expect(detail).toMatch(/getCollection\("blog",\s*\(\w+\)\s*=>\s*\w+\.data\.publish\)/);
    expect(archive).toMatch(/\.filter\(\(p\) => p\.data\.publish\)/);
  });
});
