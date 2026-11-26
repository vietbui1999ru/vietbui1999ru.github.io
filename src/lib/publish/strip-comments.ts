// Obsidian comments: `%% ... %%`, possibly spanning lines. They never leave the vault.
const COMMENT_RE = /%%[\s\S]*?%%/g;

/** Removes `%% ... %%` comments and collapses the blank lines they leave behind. */
export function stripPrivateComments(body: string): string {
  return body.replace(COMMENT_RE, "").replace(/\n{3,}/g, "\n\n");
}
