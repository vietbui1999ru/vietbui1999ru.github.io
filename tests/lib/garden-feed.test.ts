import { describe, it, expect } from "vitest";
import { buildFeed } from "@/lib/garden-feed";

const blog = (id: string, date: string, draft = false) => ({
  id,
  data: { title: `title ${id}`, date: new Date(date), draft },
});
const thought = (id: string, date: string, publish = true) => ({
  id,
  data: { date: new Date(date), publish },
});

describe("buildFeed", () => {
  it("merges published posts and published thoughts, newest first, with a type label", () => {
    const feed = buildFeed(
      [blog("old-post", "2026-01-01"), blog("new-post", "2026-03-01")],
      [thought("mid-thought", "2026-02-01")],
    );
    expect(feed.map((f) => f.kind)).toEqual(["blog", "thought", "blog"]);
    expect(feed.map((f) => f.date.toISOString().slice(0, 10))).toEqual([
      "2026-03-01",
      "2026-02-01",
      "2026-01-01",
    ]);
  });

  it("drops drafts and unpublished thoughts", () => {
    const feed = buildFeed(
      [blog("draft", "2026-05-01", true)],
      [thought("private", "2026-05-02", false)],
    );
    expect(feed).toEqual([]);
  });

  it("caps the feed at 8 items by default", () => {
    const blogs = Array.from({ length: 10 }, (_, i) => blog(`p${i}`, `2026-01-${10 + i}`));
    expect(buildFeed(blogs, [])).toHaveLength(8);
  });

  it("honours an explicit limit", () => {
    const blogs = Array.from({ length: 10 }, (_, i) => blog(`p${i}`, `2026-01-${10 + i}`));
    expect(buildFeed(blogs, [], 3)).toHaveLength(3);
  });

  it("links posts to their blog page and thoughts to the thoughts page", () => {
    const feed = buildFeed([blog("My Post", "2026-03-01")], [thought("A Thought", "2026-02-01")]);
    expect(feed[0].href).toBe("/blog/my-post");
    expect(feed[1].href).toBe("/thoughts#a-thought");
  });
});
