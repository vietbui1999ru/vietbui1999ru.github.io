import type { Plugin } from "unified";
import type { Root } from "mdast";
import { visit } from "unist-util-visit";
import { stripPrivateComments } from "../publish/strip-comments";

/**
 * Backstop: drops `%% ... %%` comments from prose text at build time. Code spans
 * and code blocks are separate node types and are not touched.
 */
export const remarkStripComments: Plugin<[], Root> = () => (tree) => {
  visit(tree, "text", (node: any) => {
    if (node.value.includes("%%")) node.value = stripPrivateComments(node.value);
  });
};
