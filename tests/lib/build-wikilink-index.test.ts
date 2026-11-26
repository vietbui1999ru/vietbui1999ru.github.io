import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { buildWikilinkIndex, buildSiteWikilinkIndex } from "@/lib/build-wikilink-index";

let tmp: string;

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "wikilink-index-test-"));
});

afterEach(() => {
  fs.rmSync(tmp, { recursive: true, force: true });
});

function write(filename: string, content: string) {
  fs.writeFileSync(path.join(tmp, filename), content);
}

describe("buildWikilinkIndex", () => {
  it("returns empty posts map when directory is empty", () => {
    const index = buildWikilinkIndex(tmp);
    expect(index.posts.size).toBe(0);
  });

  it("returns empty maps for non-blog collections", () => {
    const index = buildWikilinkIndex(tmp);
    expect(index.projects.size).toBe(0);
    expect(index.roles.size).toBe(0);
    expect(index.clippings.size).toBe(0);
  });

  it("indexes a published post by slug", () => {
    write(
      "hello-world.md",
      `---
title: Hello World
description: A test post
date: 2026-01-01
publish: true
---

Content here.`,
    );
    const index = buildWikilinkIndex(tmp);
    expect(index.posts.has("hello-world")).toBe(true);
    const entry = index.posts.get("hello-world")!;
    expect(entry.kind).toBe("blog");
    expect(entry.url).toBe("/blog/hello-world");
    expect(entry.title).toBe("Hello World");
  });

  it("skips unpublished posts", () => {
    write(
      "draft-post.md",
      `---
title: Draft
description: Not published
date: 2026-01-01
publish: false
---

Draft content.`,
    );
    const index = buildWikilinkIndex(tmp);
    expect(index.posts.has("draft-post")).toBe(false);
  });

  it("indexes multiple posts", () => {
    write("post-a.md", `---\ntitle: Post A\ndate: 2026-01-01\npublish: true\n---\n`);
    write("post-b.md", `---\ntitle: Post B\ndate: 2026-01-02\npublish: true\n---\n`);
    const index = buildWikilinkIndex(tmp);
    expect(index.posts.size).toBe(2);
    expect(index.posts.has("post-a")).toBe(true);
    expect(index.posts.has("post-b")).toBe(true);
  });

  it("uses filename as title fallback when frontmatter has no title", () => {
    write("no-title.md", `---\npublish: true\n---\nContent without a title.`);
    const index = buildWikilinkIndex(tmp);
    const entry = index.posts.get("no-title");
    expect(entry?.title).toBe("no-title");
  });

  it("returns empty index when directory does not exist", () => {
    const index = buildWikilinkIndex("/nonexistent/path/xyz");
    expect(index.posts.size).toBe(0);
  });
});

describe("buildSiteWikilinkIndex", () => {
  let vault: string;
  beforeEach(() => {
    vault = fs.mkdtempSync(path.join(os.tmpdir(), "site-wikilink-"));
    fs.mkdirSync(path.join(vault, "Blogs"));
    fs.mkdirSync(path.join(vault, "Thoughts"));
    fs.mkdirSync(path.join(vault, "Portfolio/Projects"), { recursive: true });
  });
  afterEach(() => {
    fs.rmSync(vault, { recursive: true, force: true });
  });
  const put = (rel: string, body: string) => fs.writeFileSync(path.join(vault, rel), body);

  it("indexes published posts, thoughts and projects under their page urls", () => {
    put("Blogs/post-a.md", "---\ntitle: Post A\npublish: true\n---\n");
    put("Thoughts/idea.md", "---\ntitle: An Idea\npublish: true\n---\n");
    put("Portfolio/Projects/tool.md", "---\ntitle: Tool\n---\n");
    const index = buildSiteWikilinkIndex(vault);
    expect(index.posts.get("post-a")?.url).toBe("/blog/post-a");
    expect(index.thoughts.get("idea")?.url).toBe("/thoughts#idea");
    expect(index.projects.get("tool")?.url).toBe("/projects/tool");
  });

  it("leaves unpublished thoughts and draft projects out of the index", () => {
    put("Thoughts/private.md", "---\ntitle: Private\npublish: false\n---\n");
    put("Portfolio/Projects/wip.md", "---\ntitle: WIP\ndraft: true\n---\n");
    const index = buildSiteWikilinkIndex(vault);
    expect(index.thoughts.has("private")).toBe(false);
    expect(index.projects.has("wip")).toBe(false);
  });
});
