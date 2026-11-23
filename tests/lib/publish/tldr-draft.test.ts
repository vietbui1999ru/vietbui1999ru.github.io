import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { ensureTldrDrafts } from "@/lib/publish/tldr-draft";
import { PiMissingError } from "@/lib/publish/tldr-client";
import { copyVault, makeTargetWithRemote } from "./git-helpers";
import { runPublish } from "@/lib/publish/publish";

let t: ReturnType<typeof makeTargetWithRemote>;
let vault: string;

beforeEach(() => {
  t = makeTargetWithRemote();
  vault = copyVault(t.root);
  // legacy-post is published with no TLDR yet; published-post already has one.
  const legacy = path.join(vault, "Blogs/legacy-post.md");
  fs.writeFileSync(legacy, fs.readFileSync(legacy, "utf8").replace(
    "---\n",
    "---\npublish: true\ntype: post\n",
  ));
});

afterEach(() => {
  fs.rmSync(t.root, { recursive: true, force: true });
});

const fakePi = async (title: string) => `TLDR of ${title}.`;

describe("ensureTldrDrafts", () => {
  it("writes a draft beside each published post without a TLDR, unpublished and generated", async () => {
    const res = await ensureTldrDrafts({ vaultRoot: vault, generate: fakePi });
    expect(res.created).toEqual(["Blogs/legacy-post.tldr.md"]);
    const draft = fs.readFileSync(path.join(vault, "Blogs/legacy-post.tldr.md"), "utf8");
    expect(draft).toContain("publish: false");
    expect(draft).toContain("generated: true");
    expect(draft).toContain("parent_slug: legacy-post");
    expect(draft).toContain("TLDR of Legacy Post.");
  });

  it("never modifies an existing TLDR file", async () => {
    const existing = path.join(vault, "Blogs/published-post.tldr.md");
    const before = fs.readFileSync(existing, "utf8");
    await ensureTldrDrafts({ vaultRoot: vault, generate: fakePi });
    expect(fs.readFileSync(existing, "utf8")).toBe(before);
  });

  it("skips generation with a notice when pi is missing", async () => {
    const missing = async () => {
      throw new PiMissingError("pi is not installed");
    };
    const res = await ensureTldrDrafts({ vaultRoot: vault, generate: missing });
    expect(res.created).toEqual([]);
    expect(res.notices.join("\n")).toMatch(/pi.*missing|skipped/i);
    expect(fs.existsSync(path.join(vault, "Blogs/legacy-post.tldr.md"))).toBe(false);
  });

  it("publish runs generation before building and reports the drafts", async () => {
    const res = await runPublish({
      vaultRoot: vault,
      targetRoot: t.target,
      dryRun: true,
      tldr: { generate: fakePi },
    });
    expect(res.tldrDrafts.created).toEqual(["Blogs/legacy-post.tldr.md"]);
    // The new draft is unpublished, so it is not in the target.
    expect(fs.existsSync(path.join(t.target, "Blogs/legacy-post.tldr.md"))).toBe(false);
  });
});
