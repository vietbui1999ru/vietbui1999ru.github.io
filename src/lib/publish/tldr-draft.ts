import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { walkFiles, scanVault } from "./scan";
import { splitVariants } from "./variants";
import { slugify } from "./route";
import { PiUnavailableError } from "./pi-tldr";

export interface TldrDraftResult {
  /** Draft files this run created (vault-relative). */
  created: string[];
  /** Generated drafts still waiting for the owner to set publish: true. */
  pending: string[];
  notices: string[];
}

export type Generate = (title: string, body: string) => Promise<string>;

export type DraftOutcome =
  | { status: "created"; file: string }
  | { status: "exists"; file: string }
  | { status: "failed"; file: string; reason: string };

/**
 * Generated TLDR drafts (generated: true, publish not true) whose parent post is
 * published. These are the drafts the owner has yet to review.
 */
export async function awaitingTldrReview(vaultRoot: string): Promise<string[]> {
  const files = await walkFiles(vaultRoot, (n) => n.endsWith(".tldr.md"));
  const out: string[] = [];
  for (const abs of files) {
    const parsed = matter(await fs.readFile(abs, "utf8"));
    if (parsed.data.generated !== true || parsed.data.publish === true) continue;
    const parent = abs.replace(/\.tldr\.md$/, ".md");
    const parentData = matter(await fs.readFile(parent, "utf8").catch(() => "")).data;
    if (parentData.publish !== true) continue;
    out.push(path.relative(vaultRoot, abs).split(path.sep).join("/"));
  }
  return out.sort();
}

/**
 * Write `<stem>.tldr.md` beside one post. The draft has publish: false and
 * generated: true, and the write uses `wx`, so an existing file is never touched.
 * PiUnavailableError propagates so the caller can skip everything with a notice.
 */
export async function writeTldrDraft(postAbs: string, generate: Generate): Promise<DraftOutcome> {
  const tldrAbs = postAbs.replace(/\.md$/, ".tldr.md");
  const file = path.basename(tldrAbs);
  if (await fs.stat(tldrAbs).then(() => true, () => false)) {
    return { status: "exists", file };
  }
  const post = matter(await fs.readFile(postAbs, "utf8"));
  const title = String(post.data.title ?? "");
  let text: string;
  try {
    text = await generate(title, post.content);
  } catch (err) {
    if (err instanceof PiUnavailableError) throw err;
    return { status: "failed", file, reason: (err as Error).message };
  }
  const draft = matter.stringify(text + "\n", {
    title: `${title} (TLDR)`,
    description: post.data.description ?? "",
    date: post.data.date,
    publish: false,
    generated: true,
    parent_slug: slugify(title),
  });
  try {
    await fs.writeFile(tldrAbs, draft, { flag: "wx" });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "EEXIST") return { status: "exists", file };
    throw err;
  }
  return { status: "created", file };
}

/**
 * For each published post with no TLDR file, write a draft beside it. An existing
 * TLDR is never touched. A missing or unready pi skips generation with a notice.
 */
export async function ensureTldrDrafts(opts: {
  vaultRoot: string;
  generate: Generate;
}): Promise<TldrDraftResult> {
  const result: TldrDraftResult = { created: [], pending: [], notices: [] };
  const { primaries } = splitVariants(await scanVault(opts.vaultRoot));
  const posts = primaries.filter((n) => n.frontmatter.type === "post");

  for (const post of posts) {
    try {
      const outcome = await writeTldrDraft(post.path, opts.generate);
      if (outcome.status === "created") {
        result.created.push(post.relPath.replace(/\.md$/, ".tldr.md"));
      } else if (outcome.status === "failed") {
        result.notices.push(`${post.relPath}: TLDR generation failed (${outcome.reason})`);
      }
    } catch (err) {
      if (err instanceof PiUnavailableError) {
        result.notices.push(`TLDR generation skipped: ${err.message}`);
        break;
      }
      throw err;
    }
  }

  result.pending = await awaitingTldrReview(opts.vaultRoot);
  return result;
}
