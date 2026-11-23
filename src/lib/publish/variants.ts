import path from "node:path";

// Obsidian note names: `<stem>.<variant>.md`. The variant is a lowercase word,
// so a dotted title such as "v1.2 notes" is not read as a variant.
const VARIANT_RE = /^(.+)\.([a-z][a-z-]*)\.md$/;

export interface VariantNote {
  relPath: string;
  frontmatter: Record<string, unknown>;
}

export interface SplitResult<T extends VariantNote> {
  primaries: T[];
  tldrs: T[];
  skipped: Array<{ relPath: string; reason: string }>;
}

/**
 * Only `<stem>.tldr.md` publishes, and only beside a published `<stem>.md`.
 * Any other `<stem>.<word>.md` is a persona variant and is never routed.
 */
export function splitVariants<T extends VariantNote>(notes: T[]): SplitResult<T> {
  const bySlot = new Set(notes.map((n) => n.relPath));
  const result: SplitResult<T> = { primaries: [], tldrs: [], skipped: [] };

  for (const note of notes) {
    const base = path.posix.basename(note.relPath);
    const match = VARIANT_RE.exec(base);
    if (!match) {
      result.primaries.push(note);
      continue;
    }
    const [, stem, kind] = match;
    if (kind !== "tldr") {
      result.skipped.push({ relPath: note.relPath, reason: "persona variant" });
      continue;
    }
    const parent = path.posix.join(path.posix.dirname(note.relPath), `${stem}.md`);
    if (bySlot.has(parent)) {
      result.tldrs.push(note);
    } else {
      result.skipped.push({ relPath: note.relPath, reason: "parent not published" });
    }
  }
  return result;
}

/** Target path of a TLDR, beside its parent's target path. */
export function tldrTargetPath(parentTarget: string): string {
  return parentTarget.replace(/\.md$/, ".tldr.md");
}
