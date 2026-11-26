import { LIBRARY_STATUSES, type LibraryStatus, type LibraryType } from "@/content/schemas";

// One status set for every type; each type reads it with its own words.
const LABELS: Record<LibraryType, Partial<Record<LibraryStatus, string>>> = {
  game: { backlog: "backlog", active: "playing", paused: "paused", done: "finished", dropped: "dropped" },
  book: { backlog: "backlog", active: "reading", paused: "paused", done: "read", dropped: "dropped" },
  film: { backlog: "backlog", active: "watching", paused: "paused", done: "watched", dropped: "dropped" },
  recipe: { backlog: "to try", active: "trying", done: "tried", dropped: "not for me" },
};

/** Statuses a type can use, in display order. Recipes have no `paused`. */
export function statusesFor(type: LibraryType): LibraryStatus[] {
  return LIBRARY_STATUSES.filter((status) => LABELS[type][status] !== undefined);
}

export function statusLabel(type: LibraryType, status: LibraryStatus): string {
  const label = LABELS[type][status];
  if (label === undefined) throw new Error(`${type} has no "${status}" status`);
  return label;
}
