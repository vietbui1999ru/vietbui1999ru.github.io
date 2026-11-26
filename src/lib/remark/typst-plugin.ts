import type { Plugin } from "unified";
import type { Root } from "mdast";
import { visit } from "unist-util-visit";
import { typstSvg } from "./typst";
import { DEFAULT_SVG_CACHE } from "./svg-cache";

export interface TypstOptions {
  cacheDir?: string;
}

// Notes default to Typst math. A note with `math: katex` keeps remark-math's
// output for rehype-katex.
function usesTypstMath(file: { data?: unknown }): boolean {
  const data = (file.data ?? {}) as { astro?: { frontmatter?: { math?: unknown } } };
  return (data.astro?.frontmatter?.math ?? "typst") !== "katex";
}

const svgHtml = (svg: string, cls: string) => ({
  type: "html" as const,
  value: `<span class="${cls}">${svg}</span>`,
});

/**
 * Renders Typst: ```typst fences (block), and $...$ / $$...$$ math when the note
 * is in Typst mode. All output shares the hash-keyed SVG cache.
 */
export const remarkTypst: Plugin<[TypstOptions?], Root> = (opts = {}) => {
  const cacheDir = opts.cacheDir ?? DEFAULT_SVG_CACHE;
  return (tree, file) => {
    const typstMath = usesTypstMath(file as { data?: unknown });
    visit(tree, (node: any, index, parent: any) => {
      if (!parent || index === undefined) return;
      if (node.type === "code" && node.lang === "typst") {
        parent.children[index] = svgHtml(typstSvg(node.value, cacheDir), "typst-block");
        return;
      }
      if (!typstMath) return;
      if (node.type === "inlineMath") {
        parent.children[index] = svgHtml(typstSvg(`$${node.value}$`, cacheDir), "typst-math");
      } else if (node.type === "math") {
        parent.children[index] = svgHtml(typstSvg(`$ ${node.value} $`, cacheDir), "typst-display");
      }
    });
  };
};
