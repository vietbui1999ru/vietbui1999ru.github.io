import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { walkFiles, scanVault } from "./scan";
import { splitVariants } from "./variants";
import { slugify } from "./route";
import { PiMissingError } from "./tldr-client";

export interface TldrDraftResult {
  /** Draft files this run created (vault-relative). */
  created: string[];
  /** Generated drafts still waiting for the owner to set publish: true. */
  pending: string[];
  notices: string[];
}

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
 * For each published post with no TLDR file, write `<stem>.tldr.md` beside it
 * with publish: false and generated: true. An existing TLDR is never touched.
 * A missing pi skips generation with a notice; other failures skip one post.
 */
export async function ensureTldrDrafts(opts: {
  vaultRoot: string;
  generate: (title: string, body: string) => Promise<string>;
}): Promise<TldrDraftResult> {
  const result: TldrDraftResult = { created: [], pending: [], notices: [] };
  const notes = await scanVault(opts.vaultRoot);
  const { primaries } = splitVariants(notes);
  const posts = primaries.filter((n) => n.frontmatter.type === "post");

  for (const post of posts) {
    const tldrRel = post.relPath.replace(/\.md$/, ".tldr.md");
    const abs = path.join(opts.vaultRoot, tldrRel);
    if (await fs.stat(abs).then(() => true, () => false)) continue;

    const title = String(post.frontmatter.title ?? "");
    let text: string;
    try {
      text = await opts.generate(title, post.body);
    } catch (err) {
      if (err instanceof PiMissingError) {
        result.notices.push("TLDR generation skipped: pi is missing");
        break;
      }
      result.notices.push(`${post.relPath}: TLDR generation failed (${(err as Error).message})`);
      continue;
    }

    const draft = matter.stringify(text + "\n", {
      title: `${title} (TLDR)`,
      description: post.frontmatter.description ?? "",
      date: post.frontmatter.date,
      publish: false,
      generated: true,
      parent_slug: slugify(title),
    });
    await fs.writeFile(abs, draft, { flag: "wx" });
    result.created.push(tldrRel);
  }

  result.pending = await awaitingTldrReview(opts.vaultRoot);
  return result;
}
