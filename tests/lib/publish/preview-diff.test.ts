import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { previewDiff, pageUrlFor } from "@/lib/publish/preview-diff";
import { runPublish } from "@/lib/publish/publish";
import { awaitingTldrReview } from "@/lib/publish/tldr-draft";
import { copyVault, makeTargetWithRemote } from "./git-helpers";

let t: ReturnType<typeof makeTargetWithRemote>;
let FIXTURE: string;

beforeEach(() => {
  t = makeTargetWithRemote();
  FIXTURE = copyVault(t.root);
});

afterEach(() => {
  fs.rmSync(t.root, { recursive: true, force: true });
});

describe("previewDiff", () => {
  it("lists pending new notes with a link to their rendered page", async () => {
    const entries = await previewDiff({ vaultRoot: FIXTURE, targetRoot: t.target });
    const post = entries.find((e) => e.target === "Blogs/published-post.md");
    expect(post).toEqual({
      target: "Blogs/published-post.md",
      status: "new",
      url: "/blog/published-post",
    });
  });

  it("writes nothing into the target", async () => {
    await previewDiff({ vaultRoot: FIXTURE, targetRoot: t.target });
    expect(fs.existsSync(path.join(t.target, "Blogs"))).toBe(false);
    expect(fs.existsSync(path.join(t.target, ".publish-manifest.json"))).toBe(false);
  });

  it("reports removals after a note is unpublished", async () => {
    await runPublish({ vaultRoot: FIXTURE, targetRoot: t.target, dryRun: false });
    const src = path.join(FIXTURE, "Thoughts/Deep/deep-thought.md");
    fs.writeFileSync(src, fs.readFileSync(src, "utf8").replace("publish: true", "publish: false"));
    const entries = await previewDiff({ vaultRoot: FIXTURE, targetRoot: t.target });
    expect(entries).toContainEqual({
      target: "Thoughts/deep-thought.md",
      status: "removed",
      url: null,
    });
  });
});

describe("tldr drafts awaiting review", () => {
  it("lists generated TLDR drafts awaiting review", async () => {
    // published-post's fixture TLDR is published; flip it to an unreviewed draft.
    const tldr = path.join(FIXTURE, "Blogs/published-post.tldr.md");
    fs.writeFileSync(
      tldr,
      fs.readFileSync(tldr, "utf8").replace("publish: true", "publish: false"),
    );
    const pending = await awaitingTldrReview(FIXTURE);
    expect(pending).toEqual(["Blogs/published-post.tldr.md"]);
  });

  it("does not list a TLDR the owner wrote by hand", async () => {
    const tldr = path.join(FIXTURE, "Blogs/published-post.tldr.md");
    fs.writeFileSync(
      tldr,
      fs.readFileSync(tldr, "utf8").replace("publish: true", "publish: false").replace("generated: true\n", ""),
    );
    expect(await awaitingTldrReview(FIXTURE)).toEqual([]);
  });
});

describe("pageUrlFor", () => {
  it("maps a blog post to its /blog page and leaves other folders unlinked", () => {
    expect(pageUrlFor("Blogs/my-post.md")).toBe("/blog/my-post");
    expect(pageUrlFor("Thoughts/x.md")).toBeNull();
  });
});
