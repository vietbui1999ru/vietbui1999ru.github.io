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

async function walk(dir: string, out: string[]): Promise<void> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith(".") || SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(full, out);
    else if (entry.isFile() && entry.name.endsWith(".md")) out.push(full);
  }
}

/** Every `.md` note under `root` whose frontmatter has `publish: true`. */
export async function scanVault(root: string): Promise<VaultNote[]> {
  const files: string[] = [];
  await walk(root, files);
  files.sort();

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
