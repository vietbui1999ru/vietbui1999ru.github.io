import { NodeCompiler } from "@myriaddreamin/typst-ts-node-compiler";
import { cachedSvg, DEFAULT_SVG_CACHE } from "./svg-cache";

// Auto-sized page with no margin, so the SVG is just the formula. Without it the
// compiler returns an A4 page.
const PREAMBLE = "#set page(width: auto, height: auto, margin: 0pt)\n#set text(size: 1em)\n";

let compiler: ReturnType<typeof NodeCompiler.create> | null = null;

/** Renders one Typst math or markup snippet to a standalone SVG string. */
export function renderTypst(source: string): string {
  compiler ??= NodeCompiler.create();
  return compiler.svg({ mainFileContent: PREAMBLE + source });
}

/** Cached: identical source renders once across builds. */
export function typstSvg(source: string, cacheDir: string = DEFAULT_SVG_CACHE): string {
  return cachedSvg(cacheDir, "typst", source, renderTypst);
}
