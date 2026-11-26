import type { Plugin } from "unified";
import type { Root } from "mdast";
import { visit } from "unist-util-visit";

export interface VideoRef {
  provider: "youtube" | "vimeo";
  id: string;
}

// The card is a link to the privacy-enhanced host. No iframe and no request to
// the video host happen at page load, so nothing is fetched until a reader clicks.
export function videoRef(url: string): VideoRef | null {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^www\./, "");
  if (host === "youtu.be") {
    const id = u.pathname.slice(1);
    return /^[\w-]{6,}$/.test(id) ? { provider: "youtube", id } : null;
  }
  if (host === "youtube.com" || host === "m.youtube.com") {
    const v = u.searchParams.get("v");
    const short = /^\/(?:shorts|embed)\/([\w-]{6,})$/.exec(u.pathname);
    const id = v ?? short?.[1] ?? null;
    return id && /^[\w-]{6,}$/.test(id) ? { provider: "youtube", id } : null;
  }
  if (host === "vimeo.com") {
    const m = /^\/(\d+)$/.exec(u.pathname);
    return m ? { provider: "vimeo", id: m[1] } : null;
  }
  return null;
}

function card(ref: VideoRef): string {
  const href =
    ref.provider === "youtube"
      ? `https://www.youtube-nocookie.com/watch?v=${ref.id}`
      : `https://vimeo.com/${ref.id}`;
  const label = ref.provider === "youtube" ? "Watch on YouTube" : "Watch on Vimeo";
  return `<p class="video-card" data-provider="${ref.provider}" data-id="${ref.id}"><a href="${href}" rel="noopener noreferrer" target="_blank">${label}</a></p>`;
}

/** A YouTube or Vimeo link alone on its line becomes a card. Other links are untouched. */
export const remarkVideo: Plugin<[], Root> = () => (tree) => {
  visit(tree, "paragraph", (node: any, index, parent: any) => {
    if (!parent || index === undefined || node.children.length !== 1) return;
    const only = node.children[0];
    // A bare URL is plain text here (no GFM autolinks), so accept either form.
    const url = only.type === "link" ? only.url : only.type === "text" ? only.value.trim() : "";
    const ref = url ? videoRef(url) : null;
    if (ref) parent.children[index] = { type: "html", value: card(ref) };
  });
};
