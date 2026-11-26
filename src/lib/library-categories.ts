import { LIBRARY_TYPES, type LibraryEntry, type LibraryType } from "@/content/schemas";

export interface LibraryItem {
  id: string;
  data: LibraryEntry;
}

export interface CategorySetting {
  type: LibraryType;
  enabled: boolean;
}

export interface LibraryCategory {
  type: LibraryType;
  label: string;
  enabled: boolean;
  items: LibraryItem[];
}

const LABELS: Record<LibraryType, string> = { game: "games", book: "books", film: "films", recipe: "recipes" };

/** Production shows published, non-draft items. A local dev build shows every item. */
export function isVisibleItem(item: LibraryItem, dev: boolean): boolean {
  return dev || (item.data.publish && !item.data.draft);
}

/**
 * Categories in the order `Site/Library.md` lists them; unlisted types follow,
 * enabled, in the default order. Production drops disabled and empty categories.
 * Dev keeps them all, so the owner sees everything locally.
 */
export function libraryCategories(
  items: readonly LibraryItem[],
  settings: readonly CategorySetting[] = [],
  { dev }: { dev: boolean },
): LibraryCategory[] {
  const listed = settings.map((s) => s.type);
  const order = [...settings, ...LIBRARY_TYPES.filter((t) => !listed.includes(t)).map((type) => ({ type, enabled: true }))];
  return order
    .map(({ type, enabled }) => ({
      type,
      label: LABELS[type],
      enabled,
      items: items.filter((item) => item.data.type === type && isVisibleItem(item, dev)),
    }))
    .filter((category) => dev || (category.enabled && category.items.length > 0));
}
