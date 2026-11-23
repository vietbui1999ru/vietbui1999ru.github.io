import { describe, it, expect } from "vitest";
import { routeNote, slugify } from "@/lib/publish/route";

const note = (relPath: string, frontmatter: Record<string, unknown>) => ({
  relPath,
  frontmatter,
});

describe("routeNote", () => {
  it("routes a post to Blogs/<slug of title>.md", () => {
    const r = routeNote(note("Notes/My First Post.md", { title: "My First Post", type: "post" }));
    expect(r).toBe("Blogs/my-first-post.md");
  });

  it("routes each known type to its PortfolioVault folder", () => {
    const cases: Array<[string, string]> = [
      ["thought", "Thoughts/a.md"],
      ["site", "Site/a.md"],
      ["gallery", "Gallery/a.md"],
      ["project", "Portfolio/Projects/a.md"],
    ];
    for (const [type, expected] of cases) {
      expect(routeNote(note("x.md", { title: "A", type }))).toBe(expected);
    }
  });

  it("throws an error naming the file when type is missing", () => {
    expect(() => routeNote(note("Blogs/no-type.md", { title: "No type" }))).toThrow(
      /Blogs\/no-type\.md/,
    );
  });

  it("throws an error naming the file when type is unknown", () => {
    expect(() =>
      routeNote(note("Blogs/odd.md", { title: "Odd", type: "essay-ish" })),
    ).toThrow(/Blogs\/odd\.md.*essay-ish/);
  });
});

describe("slugify", () => {
  it("lowercases, hyphenates and strips punctuation", () => {
    expect(slugify("Hello, World: It's Me!")).toBe("hello-world-its-me");
  });
});
