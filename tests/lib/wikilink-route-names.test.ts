import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { buildWikilinkIndex, buildSiteWikilinkIndex } from "@/lib/build-wikilink-index";
import { resolve } from "@/lib/remark/wikilinks";
import { buildBacklinks } from "@/lib/garden-backlinks";
import { noteId } from "@/lib/note-id";

// Names that the old basename-based index got wrong: spaces, capitals, and "&".
const LINUX = "I accidentally deleted my Linux Boot";
const QA = "Q&A notes";

let tmp: string;

const publishedPost = (title: string, body = "Body.") =>
  `---\ntitle: ${title}\ndescription: d\ndate: 2026-01-01\npublish: true\n---\n\n${body}\n`;

beforeAll(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "wikilink-names-"));
  fs.mkdirSync(path.join(tmp, "Blogs"));
  fs.writeFileSync(
    path.join(tmp, "Blogs", `${LINUX}.md`),
    publishedPost(LINUX, `Read [[${QA}]] first.`),
  );
  fs.writeFileSync(
    path.join(tmp, "Blogs", `${QA}.md`),
    publishedPost(QA, `Back to [[${LINUX}]].`),
  );
});

afterAll(() => {
  fs.rmSync(tmp, { recursive: true, force: true });
});

describe("awkward file names share one route id", () => {
  it("the index key and URL match the id the page routes by", () => {
    const index = buildWikilinkIndex(path.join(tmp, "Blogs"));
    const id = noteId(`${LINUX}.md`);
    expect(id).toBe("i-accidentally-deleted-my-linux-boot");
    expect(index.posts.get(id)?.url).toBe(`/blog/${id}`);
    expect(index.posts.get(noteId(`${QA}.md`))?.url).toBe("/blog/q-a-notes");
  });

  it("a wikilink to a note with spaces and capitals resolves to its route", () => {
    const index = buildWikilinkIndex(path.join(tmp, "Blogs"));
    expect(resolve(index, LINUX)?.url).toBe("/blog/i-accidentally-deleted-my-linux-boot");
  });

  it("a wikilink containing & resolves to its route", () => {
    const index = buildWikilinkIndex(path.join(tmp, "Blogs"));
    expect(resolve(index, QA)?.url).toBe("/blog/q-a-notes");
  });

  it("backlinks are found for the awkward-named page", () => {
    const index = buildWikilinkIndex(path.join(tmp, "Blogs"));
    const sources = [
      {
        url: `/blog/${noteId(`${LINUX}.md`)}`,
        title: LINUX,
        body: `Read [[${QA}]] first.`,
      },
      {
        url: `/blog/${noteId(`${QA}.md`)}`,
        title: QA,
        body: `Back to [[${LINUX}]].`,
      },
    ];
    const backlinks = buildBacklinks(sources, index);
    expect(backlinks.get("/blog/q-a-notes")).toEqual([
      { url: "/blog/i-accidentally-deleted-my-linux-boot", title: LINUX },
    ]);
    expect(backlinks.get("/blog/i-accidentally-deleted-my-linux-boot")).toEqual([
      { url: "/blog/q-a-notes", title: QA },
    ]);
  });

  it("the site-wide index uses the same ids for thoughts", () => {
    const vault = fs.mkdtempSync(path.join(os.tmpdir(), "wikilink-thought-"));
    try {
      fs.mkdirSync(path.join(vault, "Thoughts"));
      fs.writeFileSync(
        path.join(vault, "Thoughts", "Deep Thought.md"),
        "---\npublish: true\n---\n\nIdea.\n",
      );
      const index = buildSiteWikilinkIndex(vault);
      expect(resolve(index, "Deep Thought")?.url).toBe("/thoughts#deep-thought");
    } finally {
      fs.rmSync(vault, { recursive: true, force: true });
    }
  });
});
