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

describe("routeNote for site notes", () => {
  const site = (slot: unknown) => ({
    relPath: "Site/x.md",
    frontmatter: { title: "Anything", type: "site", slot },
  });

  it("routes each fixed slot to its Site/ file", () => {
    expect(routeNote(site("home"))).toBe("Site/Home.md");
    expect(routeNote(site("about"))).toBe("Site/About.md");
    expect(routeNote(site("now"))).toBe("Site/Now.md");
    expect(routeNote(site("library"))).toBe("Site/Library.md");
  });

  it("routes a focus slot to Site/Focus/<name>.md", () => {
    expect(routeNote(site("focus/automation"))).toBe("Site/Focus/automation.md");
  });

  it("ignores the title for site notes", () => {
    const r = routeNote({
      relPath: "Site/x.md",
      frontmatter: { title: "A Completely Different Title", type: "site", slot: "about" },
    });
    expect(r).toBe("Site/About.md");
  });

  it("stops the run naming the file when slot is missing", () => {
    expect(() => routeNote(site(undefined))).toThrow(/Site\/x\.md.*slot/);
  });

  it("stops the run naming the file when slot is invalid", () => {
    for (const bad of ["Home", "focus/", "focus/a/b", "../etc", "focus/Auto", "other"]) {
      expect(() => routeNote(site(bad))).toThrow(/Site\/x\.md.*slot/);
    }
  });
});

describe("slugify", () => {
  it("lowercases, hyphenates and strips punctuation", () => {
    expect(slugify("Hello, World: It's Me!")).toBe("hello-world-its-me");
  });
});
