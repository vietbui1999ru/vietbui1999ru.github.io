import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const COVER_RE = /\.(png|jpe?g|gif|webp|avif)$/i;

/** File name of a cover property: `a.jpg`, `[[a.jpg]]` or `dir/a.jpg`; null when not an image. */
export function coverFileName(cover: unknown): string | null {
  if (typeof cover !== "string") return null;
  const name = path.posix.basename(cover.replace(/^\[\[|\]\]$/g, "").trim());
  return COVER_RE.test(name) ? name : null;
}

/**
 * Note ids (file basenames) of library items a production build must not show:
 * drafts and unpublished items. Astro still renders their bodies, so the asset
 * adapter uses this list to skip copying their embedded images into public/.
 */
export function hiddenLibraryNotes(vaultRoot: string, { dev }: { dev: boolean }): Set<string> {
  const hidden = new Set<string>();
  const library = path.join(vaultRoot, "Library");
  if (dev || !fs.existsSync(library)) return hidden;
  for (const type of fs.readdirSync(library)) {
    const dir = path.join(library, type);
    if (!fs.statSync(dir).isDirectory()) continue;
    for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".md"))) {
      const { data } = matter(fs.readFileSync(path.join(dir, file), "utf-8"));
      if (data.publish !== true || data.draft === true) hidden.add(file.replace(/\.md$/, ""));
    }
  }
  return hidden;
}

/**
 * Copy the cover of every library item from the vault's Attachments/ into
 * `destDir`, so Astro's image pipeline can import and resize them. Runs at
 * config load, before the build reads `src/`. Returns the copied file names.
 */
export function copyLibraryCovers(vaultRoot: string, destDir: string, { dev }: { dev: boolean }): string[] {
  // Start empty each run, so a cover copied by an earlier dev run never reaches a production build.
  fs.rmSync(destDir, { recursive: true, force: true });
  const library = path.join(vaultRoot, "Library");
  if (!fs.existsSync(library)) return [];
  const copied: string[] = [];
  for (const type of fs.readdirSync(library)) {
    const dir = path.join(library, type);
    if (!fs.statSync(dir).isDirectory()) continue;
    for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".md"))) {
      const { data } = matter(fs.readFileSync(path.join(dir, file), "utf-8"));
      // Same rule as the pages: production copies covers of published, non-draft items only.
      if (!dev && (data.publish !== true || data.draft === true)) continue;
      const name = coverFileName(data.cover);
      const source = name && path.join(vaultRoot, "Attachments", name);
      if (!name || !source || !fs.existsSync(source)) continue;
      fs.mkdirSync(destDir, { recursive: true });
      fs.copyFileSync(source, path.join(destDir, name));
      copied.push(name);
    }
  }
  return copied;
}
