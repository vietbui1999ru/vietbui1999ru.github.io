import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { unified } from "unified";
import remarkParse from "remark-parse";
import { remarkTypst } from "@/lib/remark/typst-plugin";

let cache: string;
beforeEach(() => {
  cache = fs.mkdtempSync(path.join(os.tmpdir(), "typst-block-"));
});
afterEach(() => {
  fs.rmSync(cache, { recursive: true, force: true });
});

async function run(md: string) {
  const tree = unified().use(remarkParse).parse(md);
  await unified().use(remarkParse).use(remarkTypst, { cacheDir: cache }).run(tree);
  return tree as any;
}

describe("remarkTypst fenced blocks", () => {
  it("renders a typst fence to SVG", async () => {
    const tree = await run("```typst\n#let x = 3\n$x + 1$\n```");
    const node = tree.children[0];
    expect(node.type).toBe("html");
    expect(node.value).toContain("<svg");
  });

  it("caches by content hash: the same source writes one cache entry", async () => {
    await run("```typst\n$a^2$\n```");
    const first = await run("```typst\n$a^2$\n```");
    expect(fs.readdirSync(cache).filter((f) => f.startsWith("typst-"))).toHaveLength(1);
    expect(first.children[0].value).toContain("<svg");
  });
});
