import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkMath from "remark-math";
import { remarkTypst } from "@/lib/remark/typst-plugin";

let cache: string;
beforeEach(() => {
  cache = fs.mkdtempSync(path.join(os.tmpdir(), "typst-math-"));
});
afterEach(() => {
  fs.rmSync(cache, { recursive: true, force: true });
});

async function run(md: string, math?: string) {
  const tree = unified().use(remarkParse).use(remarkMath).parse(md);
  const file = { data: { astro: { frontmatter: math ? { math } : {} } } } as any;
  await unified()
    .use(remarkParse)
    .use(remarkMath)
    .use(remarkTypst, { cacheDir: cache })
    .run(tree, file);
  return tree as any;
}

describe("remarkTypst math", () => {
  it("renders inline $...$ as Typst SVG by default", async () => {
    const tree = await run("Energy $E = m c^2$ here.");
    const html = JSON.stringify(tree);
    expect(html).toContain("<svg");
    expect(html).not.toContain("inlineMath");
  });

  it("renders display $$...$$ as Typst SVG", async () => {
    const tree = await run("$$\nsum_(i=1)^n i\n$$");
    expect(JSON.stringify(tree)).toContain("<svg");
  });

  it("leaves math alone in notes with math: katex", async () => {
    const tree = await run("Energy $E = m c^2$ here.", "katex");
    expect(JSON.stringify(tree)).toContain("inlineMath");
    expect(JSON.stringify(tree)).not.toContain("<svg");
  });
});
