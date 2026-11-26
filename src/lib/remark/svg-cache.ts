import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

// One hash-keyed SVG cache for every build-time renderer (Typst, Mermaid).
// Key = kind + source, so identical source renders once across builds.
export const DEFAULT_SVG_CACHE = path.resolve(process.cwd(), ".cache/svg");

export function svgCacheKey(kind: string, source: string): string {
  return crypto.createHash("sha256").update(`${kind}\0${source}`).digest("hex").slice(0, 24);
}

/** Returns cached SVG for (kind, source), rendering and storing it on a miss. */
export function cachedSvg(
  cacheDir: string,
  kind: string,
  source: string,
  render: (source: string) => string,
): string {
  const file = path.join(cacheDir, `${kind}-${svgCacheKey(kind, source)}.svg`);
  if (fs.existsSync(file)) return fs.readFileSync(file, "utf8");
  const svg = render(source);
  fs.mkdirSync(cacheDir, { recursive: true });
  fs.writeFileSync(file, svg);
  return svg;
}
