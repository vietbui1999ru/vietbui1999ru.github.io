# Gallery Vault Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hardcoded `gallery.json` with vault-driven gallery items — one frontmatter-only `.md` file per item in `~/repos/Obsidian/gallery/`, synced through PortfolioVault and served via an Astro content collection.

**Architecture:** Gallery items live in the personal Obsidian vault (`gallery/`), synced to `PortfolioVault/Gallery/` via rsync (same pipeline as blog posts). The Astro build reads them via a `gallery` content collection; `copyAsset` resolves each item's `image` filename to a public URL at build time. `index.astro` fetches and resolves items, then passes a serialisable `GalleryItem[]` prop to the `Gallery` React island, which adds single-select tag filter chips.

**Tech Stack:** Astro content collections (glob loader), Zod schemas, `createAssetAdapters`/`copyAsset` (existing), rsync, framer-motion (existing)

---

## File Map

| Action | Path                                            | Responsibility                                                       |
| ------ | ----------------------------------------------- | -------------------------------------------------------------------- |
| Modify | `src/content/schemas.ts`                        | Add `order`, `href` to `gallerySchema`; make `date`/`image` optional |
| Modify | `src/content/config.ts`                         | Register `gallery` collection from `vendor/vault/Gallery`            |
| Create | `vendor/vault/Gallery/sample.md`                | Seed item for local build testing                                    |
| Modify | `src/data/galleryData.ts`                       | Update `GalleryItem` type; remove JSON/GALLERY_ITEMS exports         |
| Modify | `src/components/sections/Gallery.tsx`           | Accept `items` prop; add tag filter chips                            |
| Modify | `src/pages/index.astro`                         | Fetch gallery collection, resolve images, pass props                 |
| Modify | `~/repos/Obsidian/scripts/sync-to-portfolio.sh` | Add `gallery/` rsync target                                          |
| Modify | `~/repos/Obsidian/scripts/sync-attachments.mjs` | Add `Gallery/` to scan roots                                         |
| Create | `~/repos/Obsidian/gallery/.gitkeep`             | Seed the personal vault folder                                       |
| Delete | `src/data/gallery.json`                         | Replaced by vault collection                                         |

---

## Task 1: Update gallerySchema

**Files:**

- Modify: `src/content/schemas.ts`

`gallerySchema` already exists but is missing `order` and `href`. Update it in-place — the `GalleryEntry` type alias at the bottom updates automatically.

- [ ] **Step 1: Replace gallerySchema**

In `src/content/schemas.ts`, replace the existing `gallerySchema` block:

```ts
export const gallerySchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  image: z.string().optional(),
  order: z.number().int(),
  date: z.coerce.date().optional(),
  href: z.string().optional(),
  tags: z.array(z.string()).optional(),
  graph_node: z.boolean().default(true),
});
```

- [ ] **Step 2: Verify types compile**

```bash
cd /Users/vietquocbui/repos/VsCode/vietbui1999ru/Portfolio/vietbui1999ru.github.io
pnpm tsc --noEmit 2>&1 | grep -E "error|schemas"
```

Expected: no output (no errors).

- [ ] **Step 3: Commit**

```bash
git add src/content/schemas.ts
git commit -m "feat(gallery): add order, href to gallerySchema; make date/image optional"
```

---

## Task 2: Register gallery content collection

**Files:**

- Modify: `src/content/config.ts`

- [ ] **Step 1: Add gallery collection**

Replace the entire content of `src/content/config.ts`:

```ts
import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { blogSchema, gallerySchema } from "@/content/schemas";

const blog = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./vendor/vault/Blogs" }),
  schema: blogSchema,
});

const gallery = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./vendor/vault/Gallery" }),
  schema: gallerySchema,
});

export const collections = { blog, gallery };
```

- [ ] **Step 2: Verify types compile**

```bash
pnpm tsc --noEmit 2>&1 | grep error
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/content/config.ts
git commit -m "feat(gallery): register gallery content collection from vendor/vault/Gallery"
```

---

## Task 3: Seed local Gallery folder for testing

**Files:**

- Create: `vendor/vault/Gallery/sample.md`

The `glob` loader will silently return zero items if the directory doesn't exist, but it needs the directory to be present before the first build. Create a real sample item so the collection, schema, and image pipeline can all be tested end-to-end.

- [ ] **Step 1: Create Gallery directory and sample item**

```bash
mkdir -p vendor/vault/Gallery
```

Create `vendor/vault/Gallery/sample.md` with this content:

```markdown
---
title: "Sample Gallery Item"
description: "Seed item for local development — replace with real content."
order: 1
tags: [sample]
---
```

(No `image` or `href` — optional fields, safe to omit for the smoke test.)

- [ ] **Step 2: Run dev build to verify collection loads**

```bash
pnpm build 2>&1 | grep -E "error|gallery|Gallery" | head -20
```

Expected: build completes, no schema validation errors. If `glob` emits a warning about missing directory, confirm the directory was created.

- [ ] **Step 3: Commit sample item in submodule then update parent pointer**

```bash
# Commit inside the submodule
cd vendor/vault
git add Gallery/sample.md
git commit -m "feat: add Gallery collection with seed item"
git push
cd ../..

# Update parent repo's submodule pointer
git add vendor/vault
git commit -m "chore: bump vendor/vault — add Gallery collection"
```

---

## Task 4: Update GalleryItem type and galleryData.ts

**Files:**

- Modify: `src/data/galleryData.ts`

The `Gallery.tsx` component will receive a `GalleryItem[]` prop. Update the type to match the new schema and remove the JSON-based data exports.

- [ ] **Step 1: Replace galleryData.ts**

Overwrite `src/data/galleryData.ts` with:

```ts
export const GALLERY_SECTION_SUBTITLE = "Photos and visual projects.";

export type GalleryItem = {
  id: string;
  title: string;
  description?: string;
  /** Resolved public URL (e.g. /gallery-assets/image.jpg). Undefined if no image. */
  image?: string;
  href?: string;
  tags?: string[];
  order: number;
};
```

- [ ] **Step 2: Verify types compile**

```bash
pnpm tsc --noEmit 2>&1 | grep error
```

Expected: errors about `Gallery.tsx` still importing `GALLERY_ITEMS` — those get fixed in Task 5.

- [ ] **Step 3: No commit yet** — Task 5 fixes the compile errors; commit both together.

---

## Task 5: Refactor Gallery.tsx — accept props + tag filter chips

**Files:**

- Modify: `src/components/sections/Gallery.tsx`

Replace self-import of `GALLERY_ITEMS` with an `items` prop. Add `activeTag` state and filter chips above the 3D marquee.

- [ ] **Step 1: Update imports and props**

Replace the top of `Gallery.tsx` up to and including the component signature:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AppleHelloGalleryEffect } from "@/components/ui/apple-hello-effect";
import { Marquee3D, type Marquee3DImage } from "@/components/ui/Marquee3D";
import { GALLERY_SECTION_SUBTITLE, type GalleryItem } from "@/data/galleryData";
import { Card3D } from "@/components/ui/Card3D";
import { X, ExternalLink } from "lucide-react";
import { useOnClickOutside } from "@/hooks/useOnClickOutside";
import { cn } from "@/lib/utils";

interface GalleryProps {
  items: GalleryItem[];
}

const Gallery = ({ items }: GalleryProps) => {
```

- [ ] **Step 2: Add activeTag state after existing useState calls**

After the existing `useState` declarations (around line 14–16 in the original), add:

```tsx
const [activeTag, setActiveTag] = useState<string | null>(null);
```

- [ ] **Step 3: Replace GALLERY_ITEMS usage with filtered items**

Replace the `marqueeImages` derivation (was using `GALLERY_ITEMS`):

```tsx
const allTags = Array.from(new Set(items.flatMap((item) => item.tags ?? []))).sort();

const filteredItems =
  activeTag === null ? items : items.filter((item) => item.tags?.includes(activeTag));

const marqueeImages: Marquee3DImage[] = filteredItems
  .filter((item) => item.image)
  .map((item) => ({
    id: item.id,
    src: item.image!,
    alt: item.title ?? item.id,
    title: item.title,
    description: item.description,
    href: item.href,
  }));
```

- [ ] **Step 4: Add tag filter chips to the render — insert after `<header>` closing tag**

```tsx
{
  allTags.length > 0 && (
    <div className="flex flex-wrap gap-2 justify-center mb-8">
      <button
        type="button"
        onClick={() => setActiveTag(null)}
        className={cn(
          "px-3 py-1 rounded-full text-sm border transition-colors",
          activeTag === null
            ? "bg-primary text-primary-foreground border-primary"
            : "bg-background text-foreground border-border hover:bg-muted",
        )}
      >
        All
      </button>
      {allTags.map((tag) => (
        <button
          key={tag}
          type="button"
          onClick={() => setActiveTag((prev) => (prev === tag ? null : tag))}
          className={cn(
            "px-3 py-1 rounded-full text-sm border transition-colors",
            activeTag === tag
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-background text-foreground border-border hover:bg-muted",
          )}
        >
          {tag}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Verify types compile**

```bash
pnpm tsc --noEmit 2>&1 | grep error
```

Expected: errors in `index.astro` about missing `items` prop on `<Gallery>` — fixed in Task 6.

- [ ] **Step 6: Commit galleryData + Gallery component together**

```bash
git add src/data/galleryData.ts src/components/sections/Gallery.tsx
git commit -m "feat(gallery): accept items prop; add single-select tag filter chips"
```

---

## Task 6: Wire index.astro — fetch, resolve images, pass props

**Files:**

- Modify: `src/pages/index.astro`

Fetch the `gallery` collection, resolve each `image` filename to a public URL via `copyAsset`, sort by `order`, and pass the result to `<Gallery items={...} client:load />`.

- [ ] **Step 1: Add imports to index.astro frontmatter**

Add these imports below the existing `getCollection` import:

```ts
import path from "node:path";
import { createAssetAdapters } from "@/lib/remark/adapters";
import type { GalleryItem } from "@/data/galleryData";
```

- [ ] **Step 2: Add gallery data fetch below blogPosts**

```ts
const { copyAsset } = createAssetAdapters({
  attachmentsRoot: path.join(process.cwd(), "vendor", "vault", "Attachments"),
  publicRoot: path.join(process.cwd(), "public"),
  excalidrawCacheDir: path.join(process.cwd(), ".cache", "excalidraw"),
});

const galleryItems: GalleryItem[] = (await getCollection("gallery"))
  .sort((a, b) => a.data.order - b.data.order)
  .map((item) => {
    let image: string | undefined;
    if (item.data.image) {
      try {
        image = copyAsset(item.data.image, "gallery");
      } catch {
        console.warn(`[gallery] image not found in Attachments: ${item.data.image}`);
      }
    }
    return {
      id: item.id,
      title: item.data.title,
      description: item.data.description,
      image,
      href: item.data.href,
      tags: item.data.tags,
      order: item.data.order,
    };
  });
```

- [ ] **Step 3: Pass items prop to Gallery**

Replace:

```astro
  <Gallery client:load />
```

With:

```astro
  <Gallery client:load items={galleryItems} />
```

- [ ] **Step 4: Verify full build passes**

```bash
pnpm build 2>&1 | tail -20
```

Expected: build succeeds, no TypeScript errors, no schema validation errors.

- [ ] **Step 5: Commit**

```bash
git add src/pages/index.astro
git commit -m "feat(gallery): fetch vault collection, resolve images, pass items to Gallery island"
```

---

## Task 7: Update sync pipeline + seed personal vault folder

**Files:**

- Modify: `~/repos/Obsidian/scripts/sync-to-portfolio.sh`
- Modify: `~/repos/Obsidian/scripts/sync-attachments.mjs`
- Create: `~/repos/Obsidian/gallery/.gitkeep`

- [ ] **Step 1: Create gallery folder in personal vault**

```bash
mkdir -p ~/repos/Obsidian/gallery
touch ~/repos/Obsidian/gallery/.gitkeep
```

- [ ] **Step 2: Add gallery rsync to sync-to-portfolio.sh**

After the Clippings rsync block, add:

```bash
echo "==> Syncing Gallery: $MAIN/gallery/ → $PV/Gallery/"
rsync -av --delete \
  --exclude='.gitkeep' \
  --exclude='.DS_Store' \
  "$MAIN/gallery/" "$PV/Gallery/"
```

- [ ] **Step 3: Add Gallery to scan roots in sync-attachments.mjs**

In `sync-attachments.mjs`, replace:

```js
const scanRoots = [path.join(vaultDir, "Blogs"), path.join(vaultDir, "References", "Clippings")];
```

With:

```js
const scanRoots = [
  path.join(vaultDir, "Blogs"),
  path.join(vaultDir, "References", "Clippings"),
  path.join(vaultDir, "Gallery"),
];
```

- [ ] **Step 4: Commit sync scripts in the Obsidian vault repo**

```bash
cd ~/repos/Obsidian
git add gallery/.gitkeep scripts/sync-to-portfolio.sh scripts/sync-attachments.mjs
git commit -m "feat(gallery): add gallery sync target and attachment scan root"
git push
```

---

## Task 8: Delete gallery.json and final cleanup

**Files:**

- Delete: `src/data/gallery.json`

- [ ] **Step 1: Delete gallery.json**

```bash
cd /Users/vietquocbui/repos/VsCode/vietbui1999ru/Portfolio/vietbui1999ru.github.io
rm src/data/gallery.json
```

- [ ] **Step 2: Full typecheck + build**

```bash
pnpm tsc --noEmit 2>&1 | grep error
pnpm build 2>&1 | tail -10
```

Expected: no errors, build succeeds.

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "chore(gallery): delete gallery.json — replaced by vault content collection"
git pull --rebase && git push
```

---

## Verification checklist

After all tasks complete:

- [ ] `pnpm tsc --noEmit` — zero errors
- [ ] `pnpm build` — succeeds
- [ ] `pnpm dev` — gallery section renders with the seed item
- [ ] Add a real `.md` item with an `image:` field to `~/repos/Obsidian/gallery/`, run `sync-full.sh`, rebuild — image appears in gallery
- [ ] Add two items with different `tags:`, rebuild — tag chips appear above the marquee, clicking a chip filters the grid
