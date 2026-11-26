import fs from "node:fs/promises";
import path from "node:path";
import { walkFiles, type VaultNote } from "./scan";

// `![[target]]`, `![[target|alias]]`, `![[target#heading]]`
const EMBED_RE = /!\[\[([^\]|#]+)(?:[|#][^\]]*)?\]\]/g;
const MEDIA_RE = /\.(png|jpe?g|gif|webp|avif|svg|pdf|mp4|webm|mov|mp3|wav|ogg)$/i;
const DRAWING_RE = /\.excalidraw(\.md|\.svg)?$/i;

export interface Attachment {
  /** Absolute path in the personal vault. */
  source: string;
  /** Path in the target repo, POSIX, relative to its root. */
  target: string;
}

export function findEmbeds(body: string): string[] {
  return [...body.matchAll(EMBED_RE)].map((m) => m[1].trim());
}

/**
 * Attachments embedded by published notes only. A drawing embed uses its
 * `<name>.excalidraw.svg` export, which must exist and be no older than the drawing.
 * A missing or stale export stops the run with an error naming the drawing.
 */
export async function collectAttachments(
  vaultRoot: string,
  notes: Pick<VaultNote, "body">[],
): Promise<Attachment[]> {
  const files = await walkFiles(vaultRoot, () => true);
  const byName = new Map<string, string>();
  for (const file of files) byName.set(path.basename(file), file);

  const wanted = new Set<string>();
  for (const note of notes) {
    for (const embed of findEmbeds(note.body)) wanted.add(embed);
  }

  const found = new Map<string, Attachment>();
  for (const embed of wanted) {
    if (DRAWING_RE.test(embed)) {
      const stem = embed.replace(DRAWING_RE, "");
      const svgName = `${stem}.excalidraw.svg`;
      const svg = byName.get(svgName);
      if (!svg) throw new Error(`drawing ${embed}: missing export ${svgName}`);
      const drawing = byName.get(`${stem}.excalidraw.md`);
      if (drawing) {
        const [svgStat, drawingStat] = await Promise.all([fs.stat(svg), fs.stat(drawing)]);
        if (svgStat.mtimeMs < drawingStat.mtimeMs) {
          throw new Error(`drawing ${embed}: ${svgName} is older than the drawing`);
        }
      }
      found.set(svgName, { source: svg, target: `Attachments/${svgName}` });
    } else if (MEDIA_RE.test(embed)) {
      const file = byName.get(path.basename(embed));
      if (!file) throw new Error(`embedded attachment ${embed}: not found in the vault`);
      found.set(path.basename(file), {
        source: file,
        target: `Attachments/${path.basename(file)}`,
      });
    }
    // Any other embed is a note embed, handled by the site, not copied.
  }
  return [...found.values()].sort((a, b) => a.target.localeCompare(b.target));
}
