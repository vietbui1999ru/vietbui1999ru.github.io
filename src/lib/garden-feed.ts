import { publishedNewestFirst } from "./thoughts";
import { toSlug } from "./utils";

export type FeedSource = "blog" | "thought" | "library";

export type FeedItem = {
  kind: FeedSource;
  title?: string;
  date: Date;
  href: string;
};

type BlogLike = { id: string; data: { title: string; date: Date; publish: boolean } };
type ThoughtLike = { id: string; data: { date: Date; publish: boolean } };
type LibraryLike = {
  id: string;
  body?: string;
  data: { title: string; publish: boolean; draft: boolean; started?: Date; finished?: Date };
};

/** Library items enter the feed only when published, not drafts, dated, and written about. */
function libraryFeedItems(items: LibraryLike[]): FeedItem[] {
  return items.flatMap((item) => {
    const date = item.data.finished ?? item.data.started;
    const written = (item.body ?? "").trim() !== "";
    if (!item.data.publish || item.data.draft || !date || !written) return [];
    return [{ kind: "library" as const, title: item.data.title, date, href: `/library/${item.id}` }];
  });
}

/** Published posts, thoughts and written-up library items, newest first, capped at `limit`. */
export function buildFeed(
  blogs: BlogLike[],
  thoughts: ThoughtLike[],
  limit = 8,
  library: LibraryLike[] = [],
): FeedItem[] {
  const posts: FeedItem[] = blogs
    .filter((b) => b.data.publish)
    .map((b) => ({
      kind: "blog",
      title: b.data.title,
      date: b.data.date,
      href: `/blog/${toSlug(b.id)}`,
    }));
  const notes: FeedItem[] = publishedNewestFirst(thoughts).map((t) => ({
    kind: "thought",
    date: t.data.date,
    href: `/thoughts#${toSlug(t.id)}`,
  }));
  return [...posts, ...notes, ...libraryFeedItems(library)]
    .toSorted((a, b) => b.date.valueOf() - a.date.valueOf())
    .slice(0, limit);
}
