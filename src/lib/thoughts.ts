type ThoughtLike = {
  data: {
    date: Date;
    publish: boolean;
  };
};

export function publishedNewestFirst<T extends ThoughtLike>(entries: T[]): T[] {
  return entries
    .filter((entry) => entry.data.publish)
    .toSorted((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}
