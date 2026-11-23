import fs from "node:fs";
import path from "node:path";
import type { WikilinkIndex, WikilinkTarget } from "@/lib/remark/wikilinks";

/** Every `.md` file under `dir` (recursive), or [] when the folder is missing. */
function markdownFiles(dir: string): string[] {
  try {
    return (fs.readdirSync(dir, { recursive: true, encoding: "utf-8" }) as string[]).filter((f) =>
      f.endsWith(".md"),
    );
  } catch {
    return [];
  }
}

function addFolder(
  map: Map<string, WikilinkTarget>,
  dir: string,
  isPublished: (fm: Record<string, string | boolean>) => boolean,
  target: (slug: string, title: string) => WikilinkTarget,
): void {
  for (const file of markdownFiles(dir)) {
    const fm = parseFrontmatter(fs.readFileSync(path.join(dir, file), "utf-8"));
    if (!isPublished(fm)) continue;
    const slug = path.basename(file, ".md");
    const title = typeof fm.title === "string" && fm.title ? fm.title : slug;
    map.set(slug, target(slug, title));
  }
}

/**
 * One index over every published type: blog posts, thoughts and projects. Links
 * to anything not indexed render as plain text.
 */
export function buildSiteWikilinkIndex(vaultRoot: string): WikilinkIndex {
  const index = buildWikilinkIndex(path.join(vaultRoot, "Blogs"));
  addFolder(
    index.thoughts,
    path.join(vaultRoot, "Thoughts"),
    (fm) => fm.publish === true,
    (slug, title) => ({ kind: "thought", url: `/thoughts#${slug}`, title }),
  );
  addFolder(
    index.projects,
    path.join(vaultRoot, "Portfolio", "Projects"),
    (fm) => fm.draft !== true,
    (slug, title) => ({ kind: "project", url: `/projects/${slug}`, title }),
  );
  return index;
}

function parseFrontmatter(content: string): Record<string, string | boolean> {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  const fm: Record<string, string | boolean> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const kv = line.match(/^(\w+):\s*(.+)$/);
    if (!kv) continue;
    const [, key, raw] = kv;
    const val = raw.trim();
    fm[key] = val === "true" ? true : val === "false" ? false : val.replace(/^["']|["']$/g, "");
  }
  return fm;
}

export function buildWikilinkIndex(blogDir: string): WikilinkIndex {
  const index: WikilinkIndex = {
    posts: new Map(),
    thoughts: new Map(),
    projects: new Map(),
    roles: new Map(),
    education: new Map(),
    gallery: new Map(),
    clippings: new Map(),
  };

  let files: string[];
  try {
    files = (fs.readdirSync(blogDir, { recursive: true, encoding: "utf-8" }) as string[]).filter(
      (f) => f.endsWith(".md"),
    );
  } catch {
    return index;
  }

  for (const file of files) {
    const content = fs.readFileSync(path.join(blogDir, file), "utf-8");
    const fm = parseFrontmatter(content);
    if (fm.publish !== true) continue;
    const slug = path.basename(file, ".md");
    const title = typeof fm.title === "string" && fm.title ? fm.title : slug;
    index.posts.set(slug, { kind: "blog", url: `/blog/${slug}`, title });
  }

  return index;
}
