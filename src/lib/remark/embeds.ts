import type { Plugin } from "unified";
import type { Root, Text, PhrasingContent } from "mdast";
import { visit, SKIP } from "unist-util-visit";
import path from "node:path";

export interface EmbedOptions {
  attachmentsRoot: string;
  /**
   * Copy an asset into the public directory and return its public URL.
   * Callback is responsible for rejecting path traversal (`..`) in the filename
   * before touching the filesystem — plugin passes filenames through unmodified.
   */
  copyAsset: (filename: string, postSlug: string) => string;
  /**
   * Resolve an excalidraw.md filename to SVG markup (string).
   * Callback is responsible for sanitizing the SVG (strip `<script>`, on*
   * handlers, javascript: URLs) — plugin injects the return value as raw HTML.
   */
  resolveExcalidraw: (filename: string) => string;
  /**
   * Resolve a note name (`![[Other note]]`) to a published page. Undefined means
   * unpublished or unknown, rendered as plain text. Omitted: note embeds fall back
   * to the asset path.
   */
  resolveNote?: (name: string) => NoteCardTarget | undefined;
}

export interface NoteCardTarget {
  url: string;
  title: string;
  preview?: string;
}

const EMBED_REGEX = /!\[\[([^[\]]+)\]\]/g;
const MEDIA_REGEX = /\.(png|jpe?g|gif|webp|avif|svg|pdf|mp4|webm|mov|mp3|wav|ogg)$/i;

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function noteCard(target: NoteCardTarget): string {
  const preview = target.preview
    ? `<span class="note-card-preview">${escapeHtml(target.preview)}</span>`
    : "";
  return (
    `<a class="note-card" href="${escapeHtml(target.url)}">` +
    `<span class="note-card-title">${escapeHtml(target.title)}</span>${preview}</a>`
  );
}

function postSlugFromFilePath(filePath: string | undefined): string {
  if (!filePath) return "unknown";
  const base = path.basename(filePath, path.extname(filePath));
  return base;
}

export const remarkEmbeds: Plugin<[EmbedOptions], Root> = (opts) => {
  const { copyAsset, resolveExcalidraw, resolveNote } = opts;
  return (tree, file) => {
    const postSlug = postSlugFromFilePath(file.path as string | undefined);

    visit(tree, "text", (node: Text, idx, parent) => {
      if (!parent || typeof idx !== "number") return;
      const src = node.value;
      if (!src.includes("![[")) return;

      const out: PhrasingContent[] = [];
      let lastIndex = 0;
      EMBED_REGEX.lastIndex = 0;
      for (const match of src.matchAll(EMBED_REGEX)) {
        const [full, filename] = match;
        const mIdx = match.index ?? 0;
        if (mIdx > lastIndex) out.push({ type: "text", value: src.slice(lastIndex, mIdx) });
        lastIndex = mIdx + full.length;

        if (filename.endsWith(".excalidraw.md")) {
          const svg = resolveExcalidraw(filename);
          // The wrapper lets global.css invert the export in dark mode.
          // html node not typed as PhrasingContent but accepted by mdast AST
          out.push({ type: "html", value: `<figure class="excalidraw-embed">${svg}</figure>` } as any);
          continue;
        }

        // A note embed (not a media file) is a card, never a transclusion.
        if (resolveNote && !MEDIA_REGEX.test(filename)) {
          const target = resolveNote(filename.trim());
          if (target) {
            out.push({ type: "html", value: noteCard(target) } as any);
          } else {
            out.push({ type: "text", value: filename.trim() });
          }
          continue;
        }

        const publicUrl = copyAsset(filename, postSlug);
        out.push({
          type: "image",
          url: publicUrl,
          title: null,
          alt: filename,
        });
      }

      if (lastIndex < src.length) out.push({ type: "text", value: src.slice(lastIndex) });
      if (out.length === 0) return;

      parent.children.splice(idx, 1, ...out);
      return [SKIP, idx + out.length];
    });
  };
};
