# Remark Pipeline Wiring Design

**Date:** 2026-05-12
**Branch:** `feat/subproject-a-content-pipeline`

---

## Problem

Three remark plugins exist (`remarkPreview`, `remarkEmbeds`, `remarkWikilinks`) but only `remarkPreview` is wired into `astro.config.ts`. The other two require runtime inputs that aren't available yet:

- `remarkEmbeds` needs `copyAsset` / `resolveExcalidraw` callbacks backed by the Obsidian vault's `Attachments/` directory
- `remarkWikilinks` needs a `WikilinkIndex` built from blog frontmatter before Astro processes any markdown

---

## Architecture

### Data flow

```
src/content/blog/**/*.md   ──► buildWikilinkIndex()  ──► WikilinkIndex
~/repos/Obsidian/           ──► getVaultRoot()        ──► attachmentsRoot
                                                           │
astro.config.ts ─────────────────────────────────────────►│
  remarkChain:                                            │
    1. remarkPreview    (auto-generates preview field)    │
    2. remarkEmbeds  ◄── createAssetAdapters(attachmentsRoot, public/, .cache/)
    3. remarkWikilinks ◄── WikilinkIndex (posts map)
```

### Vault access strategy

**Approach:** VAULT_ROOT env var + branch warning

- Read `VAULT_ROOT` from environment; default `~/repos/Obsidian`
- At build start, check `git branch --show-current` on the vault repo
- `console.warn` (not error) if not `main` — the vault has 4 active branches
- `attachmentsRoot` = `${vaultRoot}/Attachments`
- Rationale: matches existing `adapters.ts` filesystem interface; branch warning surfaces the hazard early; low complexity for a personal site

### Wikilink index

Built synchronously at `astro.config.ts` load time (before Astro's content pipeline runs):

- Source: `src/content/blog/**/*.md` (portfolio repo, not vault — `astro-composer` syncs notes here)
- Frontmatter parsing: regex over `---...---` block, extract `title` and `draft`
- Output: `WikilinkIndex.posts` map `slug → { kind: 'blog', url: '/blog/<slug>', title }`
- Dead links: `console.warn` at build, never an error

---

## New Files

### `src/lib/vault.ts`

```typescript
getVaultRoot(): string
  // reads VAULT_ROOT env, expands ~, defaults ~/repos/Obsidian

warnIfNotMain(vaultRoot: string): void
  // git -C vaultRoot branch --show-current
  // console.warn if result !== 'main'
```

### `src/lib/build-wikilink-index.ts`

```typescript
buildWikilinkIndex(blogDir: string): WikilinkIndex
  // fs.readdirSync(blogDir, { recursive: true }) → *.md files
  // per file: parse --- frontmatter block via regex
  // skip if draft: true
  // slug = basename without .md
  // posts.set(slug, { kind: 'blog', url: `/blog/${slug}`, title })
  // returns WikilinkIndex (posts populated, others empty Maps)
```

No new dependencies. Uses Node.js built-ins only.

---

## Updated `astro.config.ts`

```typescript
import { remarkPreview } from "./src/lib/remark/preview";
import { remarkEmbeds } from "./src/lib/remark/embeds";
import { remarkWikilinks } from "./src/lib/remark/wikilinks";
import { createAssetAdapters } from "./src/lib/remark/adapters";
import { getVaultRoot, warnIfNotMain } from "./src/lib/vault";
import { buildWikilinkIndex } from "./src/lib/build-wikilink-index";

const vaultRoot = getVaultRoot();
warnIfNotMain(vaultRoot);

const { copyAsset, resolveExcalidraw } = createAssetAdapters({
  attachmentsRoot: path.join(vaultRoot, "Attachments"),
  publicRoot: path.resolve(__dirname, "public"),
  excalidrawCacheDir: path.resolve(__dirname, ".cache/excalidraw"),
});

const wikilinkIndex = buildWikilinkIndex(path.resolve(__dirname, "src/content/blog"));

// in defineConfig:
markdown: {
  remarkPlugins: [
    remarkPreview,
    [
      remarkEmbeds,
      { attachmentsRoot: path.join(vaultRoot, "Attachments"), copyAsset, resolveExcalidraw },
    ],
    [
      remarkWikilinks,
      {
        index: wikilinkIndex,
        onDead: (slug, file) => console.warn(`[wikilinks] dead: ${slug} in ${file}`),
      },
    ],
  ];
}
```

---

## What Is Not In Scope

- Wikilink index for collections other than `blog` (projects, roles, clippings) — added when those collections exist
- Excalidraw rendering (stub error is correct for now — no renderer installed)
- Vault git-archive approach (deferred — overkill for a personal site with manual branch discipline)

---

## Success Criteria

- `pnpm build` succeeds with all 3 remark plugins active
- `pnpm test` still 38/38 green
- Branch warning appears if vault is not on `main`
- `![[image.png]]` in a blog post copies the asset to `public/blog-assets/<slug>/` at build time
- `[[other-post]]` wikilinks resolve to `/blog/<slug>` links
