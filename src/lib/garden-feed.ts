import { publishedNewestFirst } from "./thoughts";
import { toSlug } from "./utils";

export type FeedItem = {
  kind: "blog" | "thought";
  title?: string;
  date: Date;
  href: string;
};

type BlogLike = { id: string; data: { title: string; date: Date; draft: boolean } };
type ThoughtLike = { id: string; data: { date: Date; publish: boolean } };

/** Published posts and thoughts merged newest first, capped at `limit`. */
export function buildFeed(blogs: BlogLike[], thoughts: ThoughtLike[], limit = 8): FeedItem[] {
  const posts: FeedItem[] = blogs
    .filter((b) => !b.data.draft)
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
  return [...posts, ...notes].toSorted((a, b) => b.date.valueOf() - a.date.valueOf()).slice(0, limit);
}
