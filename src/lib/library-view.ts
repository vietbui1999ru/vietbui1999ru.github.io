import type { LibraryEntry, LibraryStatus, LibraryType } from "@/content/schemas";
import { statusLabel } from "./library-status";

export interface Thumbnail {
  src: string;
  width: number;
  height: number;
}

/** What a card and the collection need; built at build time from a library entry. */
export interface LibraryCardData {
  href: string;
  title: string;
  type: LibraryType;
  status: LibraryStatus;
  statusLabel: string;
  tags: string[];
  /** ISO date of the later of `finished` and `started`, for sorting. */
  date?: string;
  staple: boolean;
  draft: boolean;
  meta: string;
  thumb?: Thumbnail;
}

/** "creator · year · platform · 7/10", skipping fields that are not set. */
export function metaLine(data: LibraryEntry): string {
  const parts = [data.creator, data.year, data.platform, data.rating && `${data.rating}/10`];
  return parts.filter((part) => part !== undefined && part !== "").join(" · ");
}

export function toCardData(id: string, data: LibraryEntry, thumb?: Thumbnail): LibraryCardData {
  const date = data.finished ?? data.started;
  return {
    href: `/library/${id}`,
    title: data.title,
    type: data.type,
    status: data.status,
    statusLabel: statusLabel(data.type, data.status),
    tags: data.tags,
    date: date?.toISOString(),
    staple: data.staple === true,
    draft: data.draft,
    meta: metaLine(data),
    thumb,
  };
}

/** Most recent first; undated items last, by title. */
export function sortByRecent(cards: readonly LibraryCardData[]): LibraryCardData[] {
  return [...cards].sort((a, b) => {
    if (a.date !== b.date) return a.date === undefined ? 1 : b.date === undefined ? -1 : b.date.localeCompare(a.date);
    return a.title.localeCompare(b.title);
  });
}

/** One row of the home `currently` block. */
export interface CurrentlyItem {
  title: string;
  href: string;
  type: LibraryType;
  statusLabel: string;
  progress?: number;
}

/** Active items across types, most recently started first. Production hides drafts and unpublished items. */
export function currentlyItems(
  entries: ReadonlyArray<{ id: string; data: LibraryEntry }>,
  { dev }: { dev: boolean },
): CurrentlyItem[] {
  return entries
    .filter(({ data }) => data.status === "active" && (dev || (data.publish && !data.draft)))
    .toSorted((a, b) => (b.data.started?.valueOf() ?? 0) - (a.data.started?.valueOf() ?? 0))
    .map(({ id, data }) => ({
      title: data.title,
      href: `/library/${id}`,
      type: data.type,
      statusLabel: statusLabel(data.type, data.status),
      progress: data.progress,
    }));
}

export interface CardFilter {
  status: LibraryStatus | "all";
  tag: string | "all";
  staplesOnly: boolean;
}

export function filterCards(cards: readonly LibraryCardData[], filter: CardFilter): LibraryCardData[] {
  return cards.filter(
    (card) =>
      (filter.status === "all" || card.status === filter.status) &&
      (filter.tag === "all" || card.tags.includes(filter.tag)) &&
      (!filter.staplesOnly || card.staple),
  );
}
