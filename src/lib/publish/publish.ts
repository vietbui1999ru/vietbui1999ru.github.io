import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { buildDesired } from "./build";
import { ensureTldrDrafts, type TldrDraftResult } from "./tldr-draft";
import { applySync, MANIFEST, planSync, readManifest, type SyncPlan } from "./sync";

const execGit = promisify(execFile);

/** Runs one git command in `cwd`; resolves to stdout. Injected so tests can record calls. */
export type GitRunner = (args: string[], cwd: string) => Promise<string>;

// No shell: arguments go to git as an array.
export const runGit: GitRunner = async (args, cwd) => {
  const { stdout } = await execGit("git", args, { cwd });
  return stdout.trim();
};

export interface PublishOptions {
  vaultRoot: string;
  targetRoot: string;
  dryRun: boolean;
  git?: GitRunner;
  /** Generates TLDR drafts first. Omitted in tests, so no model is called. */
  tldr?: { generate: (title: string, body: string) => Promise<string> };
}

export interface PublishResult {
  plan: SyncPlan;
  committed: boolean;
  skipped: Array<{ relPath: string; reason: string }>;
  tldrDrafts: TldrDraftResult;
}

/**
 * Build from the personal vault and sync into the target repo. A dry run writes
 * into the target working tree only; a real run commits and pushes the target.
 */
export async function runPublish(opts: PublishOptions): Promise<PublishResult> {
  const git = opts.git ?? runGit;
  const tldrDrafts = opts.tldr
    ? await ensureTldrDrafts({ vaultRoot: opts.vaultRoot, generate: opts.tldr.generate })
    : { created: [], pending: [], notices: [] };
  const { desired, skipped } = await buildDesired(opts.vaultRoot);
  const previous = await readManifest(opts.targetRoot);
  const plan = await planSync(opts.targetRoot, desired, previous);
  await applySync(opts.targetRoot, desired, plan);

  const touched = [...plan.created, ...plan.changed, ...plan.removed];
  if (opts.dryRun || touched.length === 0) {
    return { plan, committed: false, skipped, tldrDrafts };
  }

  // Stage only what this run wrote, never `git add -A`: the target may hold
  // the owner's own uncommitted work.
  await git(["add", "-A", "--", MANIFEST, ...touched], opts.targetRoot);
  const message =
    `publish: ${plan.created.length} created, ${plan.changed.length} changed, ` +
    `${plan.removed.length} removed`;
  await git(["commit", "-q", "-m", message], opts.targetRoot);
  await git(["push", "-q", "origin", "HEAD"], opts.targetRoot);
  return { plan, committed: true, skipped, tldrDrafts };
}
