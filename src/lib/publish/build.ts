import fs from "node:fs/promises";
import matter from "gray-matter";
import { collectAttachments } from "./attachments";
import { scanVault, type VaultNote } from "./scan";
import { stripPrivateComments } from "./strip-comments";
import { routeNote } from "./route";
import { splitVariants, tldrTargetPath } from "./variants";
import { validateNotes } from "./validate";
import type { Content } from "./sync";

export interface BuildResult {
  /** Target path -> file content, for every file this run publishes. */
  desired: Record<string, Content>;
  skipped: Array<{ relPath: string; reason: string }>;
}

const stemOf = (relPath: string) => relPath.replace(/\.md$/, "");

function render(note: VaultNote): string {
  return matter.stringify(stripPrivateComments(note.body), note.frontmatter);
}

/**
 * Scan the personal vault and build the target file set. Validation runs over
 * everything before a single file is produced, so one bad note stops the run.
 */
export async function buildDesired(vaultRoot: string): Promise<BuildResult> {
  const notes = await scanVault(vaultRoot);
  const { primaries, tldrs, skipped } = splitVariants(notes);

  // A TLDR is a post variant, so it is checked against the post schema.
  const tldrsAsPosts = tldrs.map((n) => ({
    relPath: n.relPath,
    frontmatter: { ...n.frontmatter, type: "post" },
  }));
  validateNotes([...primaries, ...tldrsAsPosts]);

  const desired: Record<string, Content> = {};
  const targetByStem = new Map<string, string>();
  for (const note of primaries) {
    const target = routeNote(note);
    targetByStem.set(stemOf(note.relPath), target);
    desired[target] = render(note);
  }
  const published = [...primaries];
  for (const tldr of tldrs) {
    const parent = targetByStem.get(stemOf(tldr.relPath).replace(/\.tldr$/, ""));
    if (!parent) continue;
    desired[tldrTargetPath(parent)] = render(tldr);
    published.push(tldr);
  }

  // Embeds come from the text that is published, so private comments add no attachments.
  const attachments = await collectAttachments(
    vaultRoot,
    published.map((note) => ({
      body: stripPrivateComments(note.body),
      frontmatter: note.frontmatter,
    })),
  );
  for (const att of attachments) {
    desired[att.target] = await fs.readFile(att.source);
  }
  return { desired, skipped };
}
