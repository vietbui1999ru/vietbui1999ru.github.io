// Note `type` -> PortfolioVault folder. Spec D open question: this is the default
// layout; change it here, not at call sites.
export const TYPE_FOLDERS: Record<string, string> = {
  post: "Blogs",
  thought: "Thoughts",
  site: "Site",
  gallery: "Gallery",
  project: "Portfolio/Projects",
};

export function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export interface RoutableNote {
  relPath: string;
  frontmatter: Record<string, unknown>;
}

/** PortfolioVault path (POSIX, relative to its root) for a note. Throws on a bad type. */
export function routeNote(note: RoutableNote): string {
  const type = note.frontmatter.type;
  if (typeof type !== "string" || type === "") {
    throw new Error(`${note.relPath}: missing "type" in frontmatter`);
  }
  const folder = TYPE_FOLDERS[type];
  if (!folder) {
    throw new Error(`${note.relPath}: unknown type "${type}"`);
  }
  const title = String(note.frontmatter.title ?? "");
  const slug = slugify(title);
  if (!slug) {
    throw new Error(`${note.relPath}: title does not produce a slug`);
  }
  return `${folder}/${slug}.md`;
}
