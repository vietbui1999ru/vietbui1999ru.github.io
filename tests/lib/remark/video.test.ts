import { describe, it, expect } from "vitest";
import { unified } from "unified";
import remarkParse from "remark-parse";
import { remarkVideo, videoRef } from "@/lib/remark/video-plugin";

async function run(md: string) {
  const tree = unified().use(remarkParse).parse(md);
  await unified().use(remarkParse).use(remarkVideo).run(tree);
  return tree as any;
}

describe("videoRef", () => {
  it("recognises YouTube watch, short and youtu.be URLs", () => {
    expect(videoRef("https://www.youtube.com/watch?v=abc123")).toEqual({
      provider: "youtube",
      id: "abc123",
    });
    expect(videoRef("https://youtu.be/abc123")).toEqual({ provider: "youtube", id: "abc123" });
    expect(videoRef("https://www.youtube.com/shorts/abc123")).toEqual({
      provider: "youtube",
      id: "abc123",
    });
  });

  it("recognises Vimeo URLs", () => {
    expect(videoRef("https://vimeo.com/76979871")).toEqual({ provider: "vimeo", id: "76979871" });
  });

  it("returns null for other URLs", () => {
    expect(videoRef("https://example.com/watch?v=abc")).toBeNull();
  });
});

describe("remarkVideo", () => {
  it("turns a YouTube link on its own line into a click-to-load card", async () => {
    const tree = await run("https://youtu.be/abc123");
    const node = tree.children[0];
    expect(node.type).toBe("html");
    expect(node.value).toContain("youtube-nocookie.com");
    expect(node.value).not.toContain("<iframe");
  });

  it("does the same for a Vimeo link", async () => {
    const tree = await run("[talk](https://vimeo.com/76979871)");
    expect(tree.children[0].value).toContain("vimeo.com/76979871");
    expect(tree.children[0].value).not.toContain("<iframe");
  });

  it("leaves other URLs as links", async () => {
    const tree = await run("[docs](https://example.com/page)");
    expect(tree.children[0].children[0].type).toBe("link");
  });
});
