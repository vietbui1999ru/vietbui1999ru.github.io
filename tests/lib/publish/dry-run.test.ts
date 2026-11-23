import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { runPublish } from "@/lib/publish/publish";
import { copyVault, git, makeTargetWithRemote } from "./git-helpers";

let t: ReturnType<typeof makeTargetWithRemote>;
let FIXTURE: string;

beforeEach(() => {
  t = makeTargetWithRemote();
  FIXTURE = copyVault(t.root);
});

afterEach(() => {
  fs.rmSync(t.root, { recursive: true, force: true });
});

describe("dry run", () => {
  it("writes into the target working tree and reports new, changed and removed notes", async () => {
    const result = await runPublish({
      vaultRoot: FIXTURE,
      targetRoot: t.target,
      dryRun: true,
    });
    expect(result.plan.created).toContain("Blogs/published-post.md");
    expect(fs.existsSync(path.join(t.target, "Blogs/published-post.md"))).toBe(true);
    expect(result.committed).toBe(false);
  });

  it("never commits or pushes", async () => {
    const before = git(t.target, "rev-parse", "HEAD");
    const remoteBefore = git(t.remote, "rev-parse", "HEAD");
    await runPublish({ vaultRoot: FIXTURE, targetRoot: t.target, dryRun: true });
    expect(git(t.target, "rev-parse", "HEAD")).toBe(before);
    expect(git(t.remote, "rev-parse", "HEAD")).toBe(remoteBefore);
    expect(git(t.target, "status", "--porcelain")).toContain("Blogs/");
  });
});
