import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";

export interface VaultNote {
  /** Absolute path of the note. */
  path: string;
  /** Path relative to the vault root, POSIX separators. */
  relPath: string;
  frontmatter: Record<string, unknown>;
  body: string;
}

const SKIP_DIRS = new Set([".obsidian", ".git", ".trash", "node_modules"]);

/** Absolute paths of every file under `dir` (sorted) that `keep` accepts. */
export async function walkFiles(dir: string, keep: (name: string) => boolean): Promise<string[]> {
  const out: string[] = [];
  const visit = async (current: string): Promise<void> => {
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith(".") || SKIP_DIRS.has(entry.name)) continue;
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) await visit(full);
      else if (entry.isFile() && keep(entry.name)) out.push(full);
    }
  };
  await visit(dir);
  return out.sort();
}

/** Every `.md` note under `root` whose frontmatter has `publish: true`. */
export async function scanVault(root: string): Promise<VaultNote[]> {
  const files = await walkFiles(root, (name) => name.endsWith(".md"));

  const notes: VaultNote[] = [];
  for (const file of files) {
    const raw = await fs.readFile(file, "utf8");
    const parsed = matter(raw);
    if (parsed.data.publish !== true) continue;
    notes.push({
      path: file,
      relPath: path.relative(root, file).split(path.sep).join("/"),
      frontmatter: parsed.data,
      body: parsed.content,
    });
  }
  return notes;
}
