import { describe, it, expect } from "vitest";
import { unified } from "unified";
import remarkParse from "remark-parse";
import { remarkStripComments } from "@/lib/remark/strip-comments";

async function run(md: string) {
  const tree = unified().use(remarkParse).parse(md);
  await unified().use(remarkParse).use(remarkStripComments).run(tree);
  return tree as any;
}

describe("remarkStripComments", () => {
  it("removes %% comments from prose text", async () => {
    const tree = await run("keep %% secret %% this");
    expect(tree.children[0].children[0].value).toBe("keep  this");
  });

  it("leaves code spans and blocks untouched", async () => {
    const tree = await run("`%% kept %%`\n\n```\n%% kept too %%\n```");
    expect(tree.children[0].children[0].value).toBe("%% kept %%");
    expect(tree.children[1].value).toBe("%% kept too %%");
  });
});
