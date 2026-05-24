import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { buildWikilinkIndex } from "@/lib/build-wikilink-index";

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
draft: false
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

  it("skips draft posts", () => {
    write(
      "draft-post.md",
      `---
title: Draft
description: Not published
date: 2026-01-01
draft: true
---

Draft content.`,
    );
    const index = buildWikilinkIndex(tmp);
    expect(index.posts.has("draft-post")).toBe(false);
  });

  it("indexes multiple posts", () => {
    write("post-a.md", `---\ntitle: Post A\ndate: 2026-01-01\ndraft: false\n---\n`);
    write("post-b.md", `---\ntitle: Post B\ndate: 2026-01-02\ndraft: false\n---\n`);
    const index = buildWikilinkIndex(tmp);
    expect(index.posts.size).toBe(2);
    expect(index.posts.has("post-a")).toBe(true);
    expect(index.posts.has("post-b")).toBe(true);
  });

  it("uses filename as title fallback when frontmatter has no title", () => {
    write("no-title.md", `Content without frontmatter.`);
    const index = buildWikilinkIndex(tmp);
    const entry = index.posts.get("no-title");
    expect(entry?.title).toBe("no-title");
  });

  it("returns empty index when directory does not exist", () => {
    const index = buildWikilinkIndex("/nonexistent/path/xyz");
    expect(index.posts.size).toBe(0);
  });
});
