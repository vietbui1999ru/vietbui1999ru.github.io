import { describe, it, expect, vi } from "vitest";
import { unified } from "unified";
import remarkParse from "remark-parse";
import { remarkEmbeds } from "@/lib/remark/embeds";

const opts = (extra: Record<string, unknown>) => ({
  attachmentsRoot: "/vault/Attachments",
  copyAsset: vi.fn().mockReturnValue("/blog-assets/x.png"),
  resolveExcalidraw: vi.fn(),
  ...extra,
});

async function run(md: string, o: any) {
  const tree: any = unified().use(remarkParse).parse(md);
  await unified()
    .use(remarkParse)
    .use(remarkEmbeds, o)
    .run(tree, { path: "/vault/Blogs/my-post.md" } as any);
  return tree;
}

describe("note embeds", () => {
  it("renders ![[Other note]] as a card with title, preview and link", async () => {
    const o = opts({
      resolveNote: () => ({
        url: "/blog/other-note",
        title: "Other Note",
        preview: "A short preview.",
      }),
    });
    const tree = await run("![[Other note]]", o);
    const html = tree.children[0].children[0].value as string;
    expect(html).toContain('class="note-card"');
    expect(html).toContain('href="/blog/other-note"');
    expect(html).toContain("Other Note");
    expect(html).toContain("A short preview.");
    expect(o.copyAsset).not.toHaveBeenCalled();
  });

  it("renders an unpublished or unknown note as plain text, never as an image", async () => {
    const o = opts({ resolveNote: () => undefined });
    const tree = await run("![[Still private]]", o);
    const node = tree.children[0].children[0];
    expect(node.type).toBe("text");
    expect(node.value).toBe("Still private");
    expect(o.copyAsset).not.toHaveBeenCalled();
  });

  it("escapes the card's title and preview", async () => {
    const o = opts({
      resolveNote: () => ({ url: "/blog/x", title: '<b>"T"</b>', preview: "a & <i>" }),
    });
    const tree = await run("![[X]]", o);
    const html = tree.children[0].children[0].value as string;
    expect(html).not.toContain("<b>");
    expect(html).toContain("&lt;b&gt;");
    expect(html).toContain("a &amp; &lt;i&gt;");
  });
});
