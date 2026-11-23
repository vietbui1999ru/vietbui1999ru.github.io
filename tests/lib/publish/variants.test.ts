import { describe, it, expect } from "vitest";
import { splitVariants, tldrTargetPath } from "@/lib/publish/variants";

const note = (relPath: string, frontmatter: Record<string, unknown> = {}) => ({
  relPath,
  frontmatter: { publish: true, type: "post", title: "T", ...frontmatter },
});

describe("splitVariants", () => {
  it("keeps a published post and its published tldr together", () => {
    const { primaries, tldrs, skipped } = splitVariants([
      note("Blogs/post.md"),
      note("Blogs/post.tldr.md"),
    ]);
    expect(primaries.map((n) => n.relPath)).toEqual(["Blogs/post.md"]);
    expect(tldrs.map((n) => n.relPath)).toEqual(["Blogs/post.tldr.md"]);
    expect(skipped).toEqual([]);
  });

  it("never routes persona variants and lists them as skipped", () => {
    const { primaries, tldrs, skipped } = splitVariants([
      note("Blogs/post.md"),
      note("Blogs/post.yoda.md"),
    ]);
    expect(primaries.map((n) => n.relPath)).toEqual(["Blogs/post.md"]);
    expect(tldrs).toEqual([]);
    expect(skipped).toEqual([{ relPath: "Blogs/post.yoda.md", reason: "persona variant" }]);
  });

  it("skips a tldr whose parent is not published", () => {
    const { tldrs, skipped } = splitVariants([note("Blogs/orphan.tldr.md")]);
    expect(tldrs).toEqual([]);
    expect(skipped).toEqual([
      { relPath: "Blogs/orphan.tldr.md", reason: "parent not published" },
    ]);
  });

  it("does not treat a dotted title as a variant", () => {
    const { primaries, skipped } = splitVariants([note("Blogs/v1.2 notes.md")]);
    expect(primaries.map((n) => n.relPath)).toEqual(["Blogs/v1.2 notes.md"]);
    expect(skipped).toEqual([]);
  });
});

describe("tldrTargetPath", () => {
  it("places the tldr beside its parent's target", () => {
    expect(tldrTargetPath("Blogs/my-post.md")).toBe("Blogs/my-post.tldr.md");
  });
});
