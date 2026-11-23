import { describe, it, expect } from "vitest";
import { buildBacklinks } from "@/lib/garden-backlinks";
import type { WikilinkIndex } from "@/lib/remark/wikilinks";

const index: WikilinkIndex = {
  posts: new Map([
    ["alpha", { kind: "blog", url: "/blog/alpha", title: "Alpha" }],
    ["beta", { kind: "blog", url: "/blog/beta", title: "Beta" }],
  ]),
  thoughts: new Map([["idea", { kind: "thought", url: "/thoughts#idea", title: "Idea" }]]),
  projects: new Map(),
  roles: new Map(),
  education: new Map(),
  gallery: new Map(),
  clippings: new Map(),
};

describe("buildBacklinks", () => {
  it("lists the published notes that link to each page", () => {
    const links = buildBacklinks(
      [
        { url: "/blog/alpha", title: "Alpha", body: "See [[beta]] and [[idea]]." },
        { url: "/thoughts#idea", title: "Idea", body: "Nothing linked." },
      ],
      index,
    );
    expect(links.get("/blog/beta")).toEqual([{ url: "/blog/alpha", title: "Alpha" }]);
    expect(links.get("/thoughts#idea")).toEqual([{ url: "/blog/alpha", title: "Alpha" }]);
  });

  it("excludes a page linking to itself", () => {
    const links = buildBacklinks(
      [{ url: "/blog/alpha", title: "Alpha", body: "I am [[alpha]]." }],
      index,
    );
    expect(links.get("/blog/alpha")).toBeUndefined();
  });

  it("counts each source once even when it links twice", () => {
    const links = buildBacklinks(
      [{ url: "/blog/alpha", title: "Alpha", body: "[[beta]] and again [[beta|that one]]." }],
      index,
    );
    expect(links.get("/blog/beta")).toHaveLength(1);
  });

  it("ignores links to targets that are not indexed", () => {
    const links = buildBacklinks(
      [{ url: "/blog/alpha", title: "Alpha", body: "[[nowhere]]" }],
      index,
    );
    expect(links.size).toBe(0);
  });
});
