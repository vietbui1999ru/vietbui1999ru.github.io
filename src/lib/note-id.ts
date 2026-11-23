import { toSlug } from "./utils";

/**
 * The one id a note gets everywhere: content collection ids, page routes, the
 * wikilink index and backlinks. Built from the file's basename, so folders do
 * not matter and `Q&A notes.md` becomes `q-a-notes`.
 */
export function noteId(relPath: string): string {
  return toSlug(relPath.replace(/^.*[\\/]/, "").replace(/\.md$/, ""));
}
