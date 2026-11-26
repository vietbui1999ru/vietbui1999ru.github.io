import { describe, it, expect } from "vitest";
import path from "node:path";
import { scanVault } from "@/lib/publish/scan";

const FIXTURE = path.resolve(__dirname, "../../fixtures/personal-vault");

describe("scanVault", () => {
  it("returns every publish: true note anywhere under the root", async () => {
    const notes = await scanVault(FIXTURE);
    const rels = notes.map((n) => n.relPath).sort();
    expect(rels).toEqual([
      "Blogs/published-post.md",
      "Blogs/published-post.tldr.md",
      "Blogs/published-post.yoda.md",
      "Thoughts/Deep/deep-thought.md",
    ]);
  });

  it("ignores notes without publish: true", async () => {
    const notes = await scanVault(FIXTURE);
    expect(notes.some((n) => n.relPath.includes("unpublished"))).toBe(false);
    expect(notes.some((n) => n.relPath.includes("private-thought"))).toBe(false);
  });

  it("exposes frontmatter and body", async () => {
    const notes = await scanVault(FIXTURE);
    const post = notes.find((n) => n.relPath === "Blogs/published-post.md");
    expect(post?.frontmatter.title).toBe("Published Post");
    expect(post?.body).toContain("inline math");
  });
});
