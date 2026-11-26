import type { Plugin } from "unified";
import type { Root } from "mdast";
import { visit } from "unist-util-visit";
import { render } from "pele";
import { cachedSvg, DEFAULT_SVG_CACHE } from "./svg-cache";

export interface MermaidOptions {
  cacheDir?: string;
}

/** Mermaid source to SVG via pele. Colours come from CSS variables set by the site. */
export function renderMermaid(source: string): string {
  return render(source, { responsive: true }).svg;
}

/** Rewrites ```mermaid fences to cached inline SVG at build time. */
export const remarkMermaid: Plugin<[MermaidOptions?], Root> = (opts = {}) => {
  const cacheDir = opts.cacheDir ?? DEFAULT_SVG_CACHE;
  return (tree) => {
    visit(tree, "code", (node: any, index, parent: any) => {
      if (!parent || index === undefined || node.lang !== "mermaid") return;
      const svg = cachedSvg(cacheDir, "mermaid", node.value, renderMermaid);
      parent.children[index] = {
        type: "html",
        value: `<figure class="mermaid-diagram">${svg}</figure>`,
      };
    });
  };
};
