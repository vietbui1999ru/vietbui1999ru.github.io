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

// Fixed site slots, matching the ids the site collection reads (home, about, focus/...).
const SITE_FIXED: Record<string, string> = {
  home: "Site/Home.md",
  about: "Site/About.md",
  now: "Site/Now.md",
  library: "Site/Library.md",
};
const SITE_FOCUS = /^focus\/([a-z0-9-]+)$/;

function routeSiteSlot(note: RoutableNote): string {
  const slot = note.frontmatter.slot;
  if (typeof slot === "string") {
    if (SITE_FIXED[slot]) return SITE_FIXED[slot];
    const focus = SITE_FOCUS.exec(slot);
    if (focus) return `Site/Focus/${focus[1]}.md`;
  }
  throw new Error(
    `${note.relPath}: site note needs a "slot" of home, about, now, library or focus/<name>`,
  );
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
  // Site notes are fixed slots, not titles: Home, About and the like keep their names.
  if (type === "site") return routeSiteSlot(note);
  const title = String(note.frontmatter.title ?? "");
  const slug = slugify(title);
  if (!slug) {
    throw new Error(`${note.relPath}: title does not produce a slug`);
  }
  return `${folder}/${slug}.md`;
}
