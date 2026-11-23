import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import { runPublish, type GitRunner } from "@/lib/publish/publish";
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

describe("publish", () => {
  it("commits and pushes the target repo to the bare remote", async () => {
    const remoteBefore = git(t.remote, "rev-parse", "HEAD");
    const result = await runPublish({ vaultRoot: FIXTURE, targetRoot: t.target, dryRun: false });
    expect(result.committed).toBe(true);
    expect(git(t.remote, "rev-parse", "HEAD")).not.toBe(remoteBefore);
    expect(git(t.remote, "log", "-1", "--format=%s")).toMatch(/^publish: /);
  });

  it("runs every git command inside the target repo, never this repo", async () => {
    const cwds: string[] = [];
    const recorder: GitRunner = async (args, cwd) => {
      cwds.push(cwd);
      return git(cwd, ...args);
    };
    await runPublish({ vaultRoot: FIXTURE, targetRoot: t.target, dryRun: false, git: recorder });
    expect(cwds.length).toBeGreaterThan(0);
    expect(cwds.every((cwd) => cwd === t.target)).toBe(true);
  });

  it("makes no commit when nothing changed", async () => {
    await runPublish({ vaultRoot: FIXTURE, targetRoot: t.target, dryRun: false });
    const head = git(t.remote, "rev-parse", "HEAD");
    const again = await runPublish({ vaultRoot: FIXTURE, targetRoot: t.target, dryRun: false });
    expect(again.committed).toBe(false);
    expect(git(t.remote, "rev-parse", "HEAD")).toBe(head);
  });
});
