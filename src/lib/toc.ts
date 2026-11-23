/** Defaults shared by the TOC block schema and its component. */
export const TOC_DEFAULTS = { minHeadings: 3, maxDepth: 3 } as const;

/** A heading as Astro's render(entry).headings reports it. */
export type TocHeading = { depth: number; slug: string; text: string };

export type TocEntry = TocHeading;

/** Headings that get a TOC line: h2 down to maxDepth. The page title (h1) is skipped. */
export function tocEntries(
  headings: TocHeading[],
  maxDepth: number = TOC_DEFAULTS.maxDepth,
): TocEntry[] {
  return headings
    .filter((h) => h.depth >= 2 && h.depth <= maxDepth)
    .map(({ depth, slug, text }) => ({ depth, slug, text }));
}

/** A TOC shows only when it has at least minHeadings lines and at least one. */
export function tocVisible(
  entries: TocEntry[],
  minHeadings: number = TOC_DEFAULTS.minHeadings,
): boolean {
  return entries.length > 0 && entries.length >= minHeadings;
}
