import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const FIXTURE = path.resolve(__dirname, "../../fixtures/personal-vault");

/**
 * Copy of the personal-vault fixture under `root`. Checkout mtimes are not
 * reliable, so the export is pinned newer than its drawing, as Obsidian leaves it.
 */
export function copyVault(root: string): string {
  const vault = path.join(root, "vault");
  fs.cpSync(FIXTURE, vault, { recursive: true });
  const md = path.join(vault, "Attachments", "diagram.excalidraw.md");
  const svg = path.join(vault, "Attachments", "diagram.excalidraw.svg");
  fs.utimesSync(md, new Date("2026-01-01"), new Date("2026-01-01"));
  fs.utimesSync(svg, new Date("2026-02-01"), new Date("2026-02-01"));
  return vault;
}

export function git(cwd: string, ...args: string[]): string {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}

/**
 * A bare remote plus a clone with one commit on it, all inside a fresh temp dir.
 * The clone is the publish target; the bare repo stands in for PortfolioVault.
 */
export function makeTargetWithRemote(): { root: string; remote: string; target: string } {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "publish-git-"));
  const remote = path.join(root, "remote.git");
  const target = path.join(root, "target");
  fs.mkdirSync(remote);
  git(remote, "init", "--bare", "-q");
  git(root, "clone", "-q", remote, target);
  git(target, "config", "user.name", "Test Owner");
  git(target, "config", "user.email", "owner@example.invalid");
  fs.writeFileSync(path.join(target, "README.md"), "target\n");
  git(target, "add", "README.md");
  git(target, "commit", "-q", "-m", "init");
  git(target, "push", "-q", "origin", "HEAD");
  return { root, remote, target };
}
