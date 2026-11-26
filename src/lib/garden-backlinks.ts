import { resolve, type WikilinkIndex } from "./remark/wikilinks";

export interface BacklinkSource {
  /** The source page's url, as the index names it. */
  url: string;
  title: string;
  /** Raw note body (wikilinks not yet rendered). Pass published notes only. */
  body: string;
}

export interface Backlink {
  url: string;
  title: string;
}

const LINK_REGEX = /\[\[([^[\]|]+)(?:\|[^[\]]+)?\]\]/g;

/** Map from a page url to the published pages that link to it. Self-links are dropped. */
export function buildBacklinks(
  sources: BacklinkSource[],
  index: WikilinkIndex,
): Map<string, Backlink[]> {
  const out = new Map<string, Backlink[]>();
  for (const source of sources) {
    for (const match of source.body.matchAll(LINK_REGEX)) {
      const target = resolve(index, match[1]);
      if (!target || target.url === source.url) continue;
      const list = out.get(target.url) ?? [];
      if (!list.some((b) => b.url === source.url)) {
        list.push({ url: source.url, title: source.title });
      }
      out.set(target.url, list);
    }
  }
  return out;
}
