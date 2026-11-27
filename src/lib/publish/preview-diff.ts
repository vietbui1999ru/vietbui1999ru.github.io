import { buildDesired } from "./build";
import { planSync, readManifest } from "./sync";

export type PreviewStatus = "new" | "changed" | "removed";

export interface PreviewEntry {
  target: string;
  status: PreviewStatus;
  /** Rendered page under `astro dev`, or null when the type has no page yet. */
  url: string | null;
}

/** Blog posts render at /blog/<slug>, library items at /library/<type>/<slug>. */
export function pageUrlFor(target: string): string | null {
  const post = /^Blogs\/([^/]+)\.md$/.exec(target);
  if (post) return `/blog/${post[1]}`;
  const item = /^Library\/(game|book|film|recipe)\/([^/]+)\.md$/.exec(target);
  return item ? `/library/${item[1]}/${item[2]}` : null;
}

/** What a publish would change, without writing anything. */
export async function previewDiff(opts: {
  vaultRoot: string;
  targetRoot: string;
}): Promise<PreviewEntry[]> {
  const { desired } = await buildDesired(opts.vaultRoot);
  const previous = await readManifest(opts.targetRoot);
  const plan = await planSync(opts.targetRoot, desired, previous);
  const entries: PreviewEntry[] = [
    ...plan.created.map((t) => ({ target: t, status: "new" as const })),
    ...plan.changed.map((t) => ({ target: t, status: "changed" as const })),
    ...plan.removed.map((t) => ({ target: t, status: "removed" as const })),
  ];
  return entries
    .map((e) => ({ ...e, url: e.status === "removed" ? null : pageUrlFor(e.target) }))
    .sort((a, b) => a.target.localeCompare(b.target));
}
