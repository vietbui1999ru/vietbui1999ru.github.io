import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { walkFiles } from "./scan";
import { isVariantName } from "./variants";

// Inline `$...$` or `$$...$$` math in a post body.
const MATH_RE = /\$[^$\n]+\$/;

export interface MigrationChange {
  relPath: string;
  /** Frontmatter lines to add, e.g. `publish: true`. */
  add: string[];
}

interface Pending extends MigrationChange {
  abs: string;
  raw: string;
}

const hasKey = (fm: string, key: string) => new RegExp(`^${key}:`, "m").test(fm);

/** Frontmatter text between the opening and closing `---` fences, or "". */
function frontmatterText(raw: string): string {
  const match = /^---\n([\s\S]*?)\n---/.exec(raw);
  return match ? match[1] : "";
}

/** Insert `lines` before the closing fence; add a fenced block if there is none. */
export function insertFrontmatterLines(raw: string, lines: string[]): string {
  const block = lines.map((l) => `${l}\n`).join("");
  if (raw.startsWith("---\n")) {
    const close = raw.indexOf("\n---", 4);
    if (close !== -1) {
      return raw.slice(0, close + 1) + block + raw.slice(close + 1);
    }
  }
  return `---\n${block}---\n${raw}`;
}

async function collect(vaultRoot: string): Promise<Pending[]> {
  const blogs = path.join(vaultRoot, "Blogs");
  const files = await walkFiles(blogs, (name) => name.endsWith(".md")).catch(() => []);
  const pending: Pending[] = [];
  for (const abs of files) {
    if (isVariantName(path.basename(abs))) continue;
    const raw = await fs.readFile(abs, "utf8");
    const parsed = matter(raw);
    const fm = frontmatterText(raw);
    const add: string[] = [];
    // A post that was a draft under the old flag stays unpublished.
    if (!hasKey(fm, "publish") && parsed.data.draft !== true) add.push("publish: true");
    if (!hasKey(fm, "type")) add.push("type: post");
    if (!hasKey(fm, "math") && MATH_RE.test(parsed.content)) add.push("math: katex");
    if (add.length > 0) {
      pending.push({
        abs,
        raw,
        relPath: path.relative(vaultRoot, abs).split(path.sep).join("/"),
        add,
      });
    }
  }
  return pending;
}

/** The migration's changes, without writing anything. */
export async function planMigration(vaultRoot: string): Promise<MigrationChange[]> {
  return (await collect(vaultRoot)).map(({ relPath, add }) => ({ relPath, add }));
}

/**
 * One-time migration of existing posts. Dry run unless `apply` is set, so the
 * default never writes to the personal vault.
 */
export async function runMigration(
  vaultRoot: string,
  opts: { apply?: boolean } = {},
): Promise<MigrationChange[]> {
  const pending = await collect(vaultRoot);
  if (opts.apply) {
    for (const p of pending) {
      await fs.writeFile(p.abs, insertFrontmatterLines(p.raw, p.add));
    }
  }
  return pending.map(({ relPath, add }) => ({ relPath, add }));
}
