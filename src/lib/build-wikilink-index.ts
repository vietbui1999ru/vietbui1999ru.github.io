import fs from "node:fs";
import path from "node:path";
import type { WikilinkIndex, WikilinkTarget } from "@/lib/remark/wikilinks";
import { noteId } from "./note-id";

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

const PREVIEW_CHARS = 280;

/** First ~280 characters of the body: frontmatter and Markdown markers removed. */
export function previewOf(content: string): string {
  const body = content.replace(/^---\r?\n[\s\S]*?\r?\n---/, "");
  return body
    .replace(/%%[\s\S]*?%%/g, "")
    .replace(/[#*_`>[\]!]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, PREVIEW_CHARS);
}

function stringField(value: string | boolean | undefined): string | undefined {
  return typeof value === "string" && value ? value : undefined;
}

function addFolder(
  map: Map<string, WikilinkTarget>,
  dir: string,
  isPublished: (fm: Record<string, string | boolean>) => boolean,
  target: (slug: string, title: string, extra: { preview: string; cover?: string }) => WikilinkTarget,
): void {
  for (const file of markdownFiles(dir)) {
    const content = fs.readFileSync(path.join(dir, file), "utf-8");
    const fm = parseFrontmatter(content);
    if (!isPublished(fm)) continue;
    const slug = noteId(file);
    const title = typeof fm.title === "string" && fm.title ? fm.title : slug;
    map.set(slug, target(slug, title, { preview: previewOf(content), cover: stringField(fm.cover) }));
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
    (slug, title, extra) => ({ kind: "thought", url: `/thoughts#${slug}`, title, ...extra }),
  );
  addFolder(
    index.projects,
    path.join(vaultRoot, "Portfolio", "Projects"),
    (fm) => fm.draft !== true,
    (slug, title, extra) => ({ kind: "project", url: `/projects/${slug}`, title, ...extra }),
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
    const slug = noteId(file);
    const title = typeof fm.title === "string" && fm.title ? fm.title : slug;
    index.posts.set(slug, {
      kind: "blog",
      url: `/blog/${slug}`,
      title,
      preview: previewOf(content),
      cover: stringField(fm.cover),
    });
  }

  return index;
}
