import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { unified } from "unified";
import remarkParse from "remark-parse";
import { remarkWikilinks, type WikilinkIndex } from "@/lib/remark/wikilinks";
import { buildSiteWikilinkIndex } from "@/lib/build-wikilink-index";

const LONG = "word ".repeat(200);

const index: WikilinkIndex = {
  posts: new Map([
    [
      "hello",
      {
        kind: "blog",
        url: "/blog/hello",
        title: "Hello",
        preview: LONG.slice(0, 280),
        cover: "/blog-assets/hello/cover.png",
      },
    ],
  ]),
  thoughts: new Map(),
  projects: new Map(),
  roles: new Map(),
  education: new Map(),
  gallery: new Map(),
  clippings: new Map(),
};

async function linkFor(md: string, idx: WikilinkIndex = index) {
  const tree: any = unified().use(remarkParse).parse(md);
  await unified().use(remarkParse).use(remarkWikilinks, { index: idx, onDead: () => {} }).run(tree);
  return tree.children[0].children[1];
}

describe("wikilink hover data", () => {
  it("carries kind, title, preview and cover on a resolved link", async () => {
    const link = await linkFor("See [[hello]] now.");
    const props = link.data.hProperties;
    expect(link.type).toBe("link");
    expect(props["data-kind"]).toBe("blog");
    expect(props["data-title"]).toBe("Hello");
    expect(props["data-cover"]).toBe("/blog-assets/hello/cover.png");
  });

  it("caps the preview at 280 characters", async () => {
    const link = await linkFor("See [[hello]] now.");
    expect(link.data.hProperties["data-preview"].length).toBeLessThanOrEqual(280);
  });

  it("omits cover when the target has none", async () => {
    const noCover: WikilinkIndex = {
      ...index,
      posts: new Map([["plain", { kind: "blog", url: "/blog/plain", title: "Plain" }]]),
    };
    const link = await linkFor("See [[plain]] now.", noCover);
    expect(link.data.hProperties["data-cover"]).toBeUndefined();
  });
});

describe("index preview data", () => {
  let vault: string;
  beforeEach(() => {
    vault = fs.mkdtempSync(path.join(os.tmpdir(), "wiki-preview-"));
    fs.mkdirSync(path.join(vault, "Blogs"));
  });
  afterEach(() => {
    fs.rmSync(vault, { recursive: true, force: true });
  });

  it("builds a preview from the body, without frontmatter, capped at 280 characters", () => {
    fs.writeFileSync(
      path.join(vault, "Blogs/long.md"),
      `---\ntitle: Long\npublish: true\n---\n# Heading\n\n${LONG}`,
    );
    const entry = buildSiteWikilinkIndex(vault).posts.get("long");
    expect(entry?.preview).toBeDefined();
    expect(entry!.preview!.length).toBeLessThanOrEqual(280);
    expect(entry!.preview).not.toContain("publish: true");
    expect(entry!.preview).toMatch(/^Heading word/);
  });
});
