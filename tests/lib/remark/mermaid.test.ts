import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { unified } from "unified";
import remarkParse from "remark-parse";
import { remarkMermaid } from "@/lib/remark/mermaid-plugin";

let cache: string;
beforeEach(() => {
  cache = fs.mkdtempSync(path.join(os.tmpdir(), "mermaid-"));
});
afterEach(() => {
  fs.rmSync(cache, { recursive: true, force: true });
});

async function run(md: string) {
  const tree = unified().use(remarkParse).parse(md);
  await unified().use(remarkParse).use(remarkMermaid, { cacheDir: cache }).run(tree);
  return tree as any;
}

const FLOW = "```mermaid\nflowchart LR\n  A[Start] --> B[End]\n```";

describe("remarkMermaid", () => {
  it("renders a mermaid fence to SVG at build time", async () => {
    const tree = await run(FLOW);
    expect(tree.children[0].type).toBe("html");
    expect(tree.children[0].value).toContain("<svg");
  });

  it("colors the diagram with CSS variables, not fixed colours", async () => {
    const tree = await run(FLOW);
    expect(tree.children[0].value).toContain("var(--");
  });

  it("caches by content hash", async () => {
    await run(FLOW);
    await run(FLOW);
    expect(fs.readdirSync(cache).filter((f) => f.startsWith("mermaid-"))).toHaveLength(1);
  });
});
