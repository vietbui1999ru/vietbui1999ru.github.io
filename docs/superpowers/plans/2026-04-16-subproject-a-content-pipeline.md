# Sub-Project A: VaultCMS + Obsidian Content Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire a three-repo content pipeline (main Obsidian vault → PortfolioVault → portfolio submodule) so the portfolio site renders markdown authored in Obsidian with wikilinks, embeds, and clipping popovers, backed by zod-validated content collections and a GitHub Actions build.

**Architecture:** Main personal vault stays private and canonical. `PortfolioVault` (new repo) receives sanitized content via one-way `rsync`, hosts VaultCMS for authoring, and is consumed by the portfolio repo as a git submodule with sparse-checkout. Astro loads 8 content collections from `vendor/vault`; remark plugins resolve wikilinks (internal/clipping-popover/dead-warn) and embeds (asset copy + excalidraw-to-SVG) at build time. CI uses GitHub Actions with submodule + LFS support.

**Tech Stack:** Astro 5, React 19, zod, `@astrojs/rss`, `@astrojs/sitemap`, `unified`/`remark`/`unist-util-visit`, `vitest` (new), `@testing-library/react`, Umami analytics, GitHub Actions, Git LFS, Syncthing, rsync.

**Reference Spec:** `docs/superpowers/specs/2026-04-16-vaultcms-graph-sim-design.md` (§4 + §10).

---

## Phase 0 — Prerequisites (human actions, out of codebase)

These are gated user actions that must complete before code tasks run. Document the commands; the plan does not automate them because they cross machine/account boundaries.

### Pre-Task 0.1: Create PortfolioVault repository on GitHub

- [ ] On GitHub, create a new repository named `PortfolioVault` under `vietbui1999ru`. Choose private or public per preference; plan assumes the SSH remote `git@github.com:vietbui1999ru/PortfolioVault.git`.
- [ ] Locally, initialize it with the layout from spec §3:

```bash
mkdir -p ~/repos/PortfolioVault/{Portfolio/{Projects,Experience/Companies,Education,Gallery},Blogs,References/Clippings,Attachments,Templates,.obsidian}
cd ~/repos/PortfolioVault
git init -b main
git remote add origin git@github.com:vietbui1999ru/PortfolioVault.git
```

- [ ] Enable Git LFS on PortfolioVault:

```bash
cd ~/repos/PortfolioVault
git lfs install
cat > .gitattributes <<'EOF'
Attachments/**/*.png            filter=lfs diff=lfs merge=lfs -text
Attachments/**/*.jpg            filter=lfs diff=lfs merge=lfs -text
Attachments/**/*.jpeg           filter=lfs diff=lfs merge=lfs -text
Attachments/**/*.pdf            filter=lfs diff=lfs merge=lfs -text
Attachments/**/*.excalidraw.md  filter=lfs diff=lfs merge=lfs -text
EOF
cat > .gitignore <<'EOF'
.obsidian/workspace.json
.obsidian/workspace-mobile.json
.obsidian/cache
.stfolder
.stversions/
*.sync-conflict-*
.DS_Store
.trash/
EOF
# placeholder About.md so collection has one entry during pipeline smoke-test
cat > Portfolio/About.md <<'EOF'
---
title: About Me
tagline: I'm a Software Engineer with a passion for all things Simulations and Automation.
---

I graduated with B.A & M.S degrees in Computer Science & Applied Mathematics in 2025.

I have a strong passion in building projects that intersect programming with Math & Science.

I love to build, tinker, & break stuff in my free time (In addition to self-hosting).

I aim to be a T-shaped engineer by diversifying my skills & learn from industry experts.
EOF
git add -A && git commit -m "init: seed vault layout + LFS + About placeholder" && git push -u origin main
```

- [ ] Verify: `git clone git@github.com:vietbui1999ru/PortfolioVault.git /tmp/vault-test && ls /tmp/vault-test/Portfolio` should show `About.md` plus empty subdirs.

### Pre-Task 0.2: Install VaultCMS plugin in PortfolioVault

- [ ] Open `~/repos/PortfolioVault/` as a vault in Obsidian.
- [ ] Install community plugin "Vault CMS" from docs.vaultcms.org and run the wizard. Accept default content type scaffolding; it will be overwritten in Task A10.
- [ ] Commit `.obsidian/plugins/vault-cms/` (the plugin install files; content types added later).

### Pre-Task 0.3: Configure Syncthing (tablet ↔ laptop) — optional for plan execution

Plan execution does not require Syncthing. It is needed for real-world tablet-assisted authoring. Can be set up anytime after Pre-Task 0.1. No action required for CI or local dev.

### Pre-Task 0.4: GitHub secrets for CI

- [ ] Generate an SSH deploy key for read access to `PortfolioVault`:

```bash
ssh-keygen -t ed25519 -f ~/.ssh/portfoliovault_deploy -N "" -C "portfoliovault-deploy"
```

- [ ] On GitHub, add the **public** key (`~/.ssh/portfoliovault_deploy.pub`) as a deploy key on the `PortfolioVault` repo (read-only).
- [ ] On the portfolio repo, add the **private** key as an Actions secret named `VAULT_DEPLOY_KEY`. Also add `UMAMI_SRC` and `UMAMI_ID` secrets (values from your Umami instance).

---

## Phase 1 — Testing infrastructure

### Task A1: Install and configure vitest

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `tests/setup.ts`

- [ ] **Step 1: Install vitest and testing deps**

```bash
pnpm add -D vitest @vitest/ui @testing-library/react @testing-library/dom jsdom
```

- [ ] **Step 2: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    globals: true,
    include: ['tests/**/*.test.{ts,tsx}', 'src/**/*.test.{ts,tsx}'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
})
```

- [ ] **Step 3: Create `tests/setup.ts`**

```ts
import '@testing-library/dom'
```

- [ ] **Step 4: Add test scripts to `package.json`**

In `scripts`, add:

```json
"test": "vitest run",
"test:watch": "vitest",
"test:ui": "vitest --ui"
```

- [ ] **Step 5: Write a smoke test to confirm the harness runs**

Create `tests/harness.test.ts`:

```ts
import { describe, it, expect } from 'vitest'

describe('vitest harness', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2)
  })
})
```

- [ ] **Step 6: Run it**

Run: `pnpm test`
Expected: `✓ tests/harness.test.ts (1 test)` with exit code 0.

- [ ] **Step 7: Commit**

```bash
git add package.json pnpm-lock.yaml vitest.config.ts tests/
git commit -m "chore: add vitest + testing-library harness"
```

---

## Phase 2 — Content schemas

### Task A2: Extract zod schemas into a dedicated module

**Files:**
- Create: `src/content/schemas.ts`
- Create: `tests/content/schemas.test.ts`

- [ ] **Step 1: Write failing tests for each schema**

Create `tests/content/schemas.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  blogSchema, roleSchema, companySchema, projectSchema,
  educationSchema, gallerySchema, clippingSchema, aboutSchema,
} from '@/content/schemas'

describe('blogSchema', () => {
  it('accepts minimal valid frontmatter', () => {
    const parsed = blogSchema.parse({
      title: 'x', description: 'y', date: '2026-04-16',
    })
    expect(parsed.draft).toBe(false)
  })
  it('rejects missing title', () => {
    expect(() => blogSchema.parse({ description: 'y', date: '2026-04-16' })).toThrow()
  })
  it('coerces date strings', () => {
    const parsed = blogSchema.parse({ title: 'x', description: 'y', date: '2026-04-16' })
    expect(parsed.date).toBeInstanceOf(Date)
  })
})

describe('roleSchema', () => {
  it('requires role, company, date_start, summary', () => {
    expect(() => roleSchema.parse({})).toThrow()
  })
  it('allows date_end null (current role)', () => {
    const parsed = roleSchema.parse({
      role: 'r', company: 'c', date_start: '2026-01-01', date_end: null, summary: 's',
    })
    expect(parsed.date_end).toBeNull()
  })
  it('defaults graph_node to true', () => {
    const parsed = roleSchema.parse({
      role: 'r', company: 'c', date_start: '2026-01-01', summary: 's',
    })
    expect(parsed.graph_node).toBe(true)
  })
})

describe('companySchema', () => {
  it('defaults graph_node to false (R2)', () => {
    const parsed = companySchema.parse({ name: 'c' })
    expect(parsed.graph_node).toBe(false)
  })
})

describe('clippingSchema', () => {
  it('defaults publish + share to false', () => {
    const parsed = clippingSchema.parse({ title: 't' })
    expect(parsed.publish).toBe(false)
    expect(parsed.share).toBe(false)
    expect(parsed.graph_node).toBe(true)
  })
})

describe('projectSchema', () => {
  it('defaults status to shipped', () => {
    const parsed = projectSchema.parse({ title: 't', summary: 's', date: '2026-01-01' })
    expect(parsed.status).toBe('shipped')
  })
})

describe('aboutSchema', () => {
  it('requires title + tagline', () => {
    expect(() => aboutSchema.parse({ title: 't' })).toThrow()
  })
})
```

- [ ] **Step 2: Run tests — expect fail (module missing)**

Run: `pnpm test tests/content/schemas.test.ts`
Expected: FAIL, cannot resolve `@/content/schemas`.

- [ ] **Step 3: Create `src/content/schemas.ts`**

```ts
import { z } from 'astro:content'

export const blogSchema = z.object({
  title: z.string(),
  description: z.string(),
  date: z.coerce.date(),
  draft: z.boolean().default(false),
  tags: z.array(z.string()).optional(),
  cover: z.string().optional(),
  updated: z.coerce.date().optional(),
  series: z.string().optional(),
  preview: z.string().optional(),
  audience: z.array(z.enum(['dev', 'student', 'general'])).optional(),
  topics: z.array(z.string()).optional(),
})

export const roleSchema = z.object({
  role: z.string(),
  company: z.string(),
  company_url: z.string().url().optional(),
  date_start: z.coerce.date(),
  date_end: z.coerce.date().nullable().optional(),
  tags: z.array(z.string()).optional(),
  summary: z.string(),
  graph_node: z.boolean().default(true),
})

export const companySchema = z.object({
  name: z.string(),
  url: z.string().url().optional(),
  logo: z.string().optional(),
  graph_node: z.boolean().default(false),
})

export const projectSchema = z.object({
  title: z.string(),
  summary: z.string(),
  date: z.coerce.date(),
  tags: z.array(z.string()).optional(),
  badges: z.array(z.string()).optional(),
  images: z.array(z.string()).optional(),
  cover: z.string().optional(),
  links: z.array(z.object({ icon: z.string(), url: z.string().url() })).optional(),
  status: z.enum(['active', 'shipped', 'archived']).default('shipped'),
  graph_node: z.boolean().default(true),
})

export const educationSchema = z.object({
  institution: z.string(),
  degree: z.string(),
  field: z.string().optional(),
  date_start: z.coerce.date(),
  date_end: z.coerce.date().nullable().optional(),
  tags: z.array(z.string()).optional(),
  summary: z.string(),
  graph_node: z.boolean().default(true),
})

export const gallerySchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  date: z.coerce.date(),
  image: z.string(),
  tags: z.array(z.string()).optional(),
  graph_node: z.boolean().default(true),
})

export const clippingSchema = z.object({
  title: z.string(),
  source: z.string().url().optional(),
  preview: z.string().optional(),
  tags: z.array(z.string()).optional(),
  publish: z.boolean().default(false),
  share: z.boolean().default(false),
  graph_node: z.boolean().default(true),
})

export const aboutSchema = z.object({
  title: z.string(),
  tagline: z.string(),
})

export type BlogEntry = z.infer<typeof blogSchema>
export type RoleEntry = z.infer<typeof roleSchema>
export type CompanyEntry = z.infer<typeof companySchema>
export type ProjectEntry = z.infer<typeof projectSchema>
export type EducationEntry = z.infer<typeof educationSchema>
export type GalleryEntry = z.infer<typeof gallerySchema>
export type ClippingEntry = z.infer<typeof clippingSchema>
export type AboutEntry = z.infer<typeof aboutSchema>
```

Note: `z` is re-exported by `astro:content` and uses the same zod version Astro ships; using `astro:content`'s `z` keeps Astro's special date coercion behavior available.

- [ ] **Step 4: Run tests — expect pass**

Run: `pnpm test tests/content/schemas.test.ts`
Expected: all 10 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/content/schemas.ts tests/content/schemas.test.ts
git commit -m "feat(content): add zod schemas for all 8 collections"
```

---

## Phase 3 — Submodule + vault fixture

### Task A3: Add PortfolioVault as a git submodule with sparse-checkout

**Files:**
- Modify: `.gitmodules` (created by git)
- Create: `vendor/vault/` (submodule checkout)
- Create: `scripts/init-vault-submodule.sh`

- [ ] **Step 1: Add the submodule**

```bash
git submodule add git@github.com:vietbui1999ru/PortfolioVault.git vendor/vault
```

- [ ] **Step 2: Initialize sparse-checkout inside the submodule**

```bash
cd vendor/vault
git sparse-checkout init --cone
git sparse-checkout set Blogs Portfolio References/Clippings Attachments
git lfs install && git lfs pull
cd ../..
```

- [ ] **Step 3: Verify `vendor/vault/Portfolio/About.md` exists** (seeded in Pre-Task 0.1)

Run: `test -f vendor/vault/Portfolio/About.md && echo OK`
Expected: `OK`.

- [ ] **Step 4: Write `scripts/init-vault-submodule.sh`** (for fresh clones)

```bash
#!/usr/bin/env bash
set -euo pipefail

git submodule update --init --recursive
cd vendor/vault
git sparse-checkout init --cone
git sparse-checkout set Blogs Portfolio References/Clippings Attachments
git lfs install
git lfs pull
echo "vault submodule ready"
```

```bash
chmod +x scripts/init-vault-submodule.sh
```

- [ ] **Step 5: Commit**

```bash
git add .gitmodules vendor/vault scripts/init-vault-submodule.sh
git commit -m "feat(content): add PortfolioVault submodule with sparse-checkout"
```

---

## Phase 4 — Remark plugins

### Task A4: remark-preview plugin (runs first, computes preview field)

**Files:**
- Create: `src/lib/remark/preview.ts`
- Create: `tests/lib/remark/preview.test.ts`
- Install: `mdast-util-to-string`, `unist-util-visit`, `unified` (transitive via Astro; verify)

- [ ] **Step 1: Install remark utilities**

```bash
pnpm add -D mdast-util-to-string unist-util-visit
```

- [ ] **Step 2: Write failing test**

Create `tests/lib/remark/preview.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import { remarkPreview } from '@/lib/remark/preview'

async function run(md: string, existing?: string) {
  const file: any = { data: { astro: { frontmatter: existing ? { preview: existing } : {} } } }
  await unified().use(remarkParse).use(remarkPreview).run(await unified().use(remarkParse).parse(md), file)
  return file.data.astro.frontmatter.preview as string | undefined
}

describe('remark-preview', () => {
  it('extracts first paragraph when preview absent', async () => {
    const out = await run('# Heading\n\nFirst paragraph text here.\n\nSecond paragraph.')
    expect(out).toBe('First paragraph text here.')
  })

  it('skips headings when looking for first paragraph', async () => {
    const out = await run('## Skip\n\n### Also skip\n\nActual content paragraph.')
    expect(out).toBe('Actual content paragraph.')
  })

  it('preserves explicit preview frontmatter', async () => {
    const out = await run('First paragraph.', 'Custom preview override.')
    expect(out).toBe('Custom preview override.')
  })

  it('caps preview at 280 chars', async () => {
    const long = 'x'.repeat(500)
    const out = await run(long)
    expect(out?.length).toBeLessThanOrEqual(280)
  })
})
```

- [ ] **Step 3: Install `remark-parse` for the test runner**

```bash
pnpm add -D remark-parse
```

- [ ] **Step 4: Run test — expect fail**

Run: `pnpm test tests/lib/remark/preview.test.ts`
Expected: FAIL, cannot resolve `@/lib/remark/preview`.

- [ ] **Step 5: Implement `src/lib/remark/preview.ts`**

```ts
import type { Plugin } from 'unified'
import type { Root, Paragraph } from 'mdast'
import { visit } from 'unist-util-visit'
import { toString } from 'mdast-util-to-string'

const MAX_PREVIEW = 280

export const remarkPreview: Plugin<[], Root> = () => (tree, file) => {
  const frontmatter = ((file.data.astro as any)?.frontmatter ?? {}) as Record<string, unknown>
  if (typeof frontmatter.preview === 'string' && frontmatter.preview.length > 0) return

  let first: Paragraph | undefined
  visit(tree, 'paragraph', (node) => {
    if (!first) first = node
  })
  if (!first) return

  const raw = toString(first).trim()
  const preview = raw.length > MAX_PREVIEW ? raw.slice(0, MAX_PREVIEW - 1).trimEnd() + '…' : raw
  frontmatter.preview = preview
  ;(file.data.astro as any).frontmatter = frontmatter
}
```

- [ ] **Step 6: Run test — expect pass**

Run: `pnpm test tests/lib/remark/preview.test.ts`
Expected: 4 tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/lib/remark/preview.ts tests/lib/remark/preview.test.ts package.json pnpm-lock.yaml
git commit -m "feat(remark): add preview extraction plugin"
```

### Task A5: remark-wikilinks plugin

**Files:**
- Create: `src/lib/remark/wikilinks.ts`
- Create: `tests/lib/remark/wikilinks.test.ts`

- [ ] **Step 1: Write failing test**

Create `tests/lib/remark/wikilinks.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import { remarkWikilinks } from '@/lib/remark/wikilinks'
import type { WikilinkIndex } from '@/lib/remark/wikilinks'

const index: WikilinkIndex = {
  posts: new Map([['hello-world', { kind: 'blog', url: '/blog/hello-world', title: 'Hello World' }]]),
  projects: new Map([['stripe-mrr', { kind: 'project', url: '/projects/stripe-mrr', title: 'Stripe MRR' }]]),
  roles: new Map(),
  education: new Map(),
  gallery: new Map(),
  clippings: new Map([['comptia-linux', {
    kind: 'clipping',
    url: '',
    title: 'CompTIA Linux Guide',
    preview: 'Short excerpt.',
    source: 'https://example.com',
    publish: false,
    share: false,
  }]]),
}

async function transform(md: string) {
  const tree = unified().use(remarkParse).parse(md)
  await unified().use(remarkParse).use(remarkWikilinks, { index, onDead: () => {} }).run(tree)
  return tree
}

describe('remark-wikilinks', () => {
  it('rewrites internal blog wikilink to <a href="/blog/slug">', async () => {
    const tree: any = await transform('See [[hello-world]] for more.')
    const link = tree.children[0].children[1]
    expect(link.type).toBe('link')
    expect(link.url).toBe('/blog/hello-world')
    expect(link.children[0].value).toBe('Hello World')
  })

  it('supports alias syntax [[slug|alias]]', async () => {
    const tree: any = await transform('Go see [[hello-world|this post]].')
    const link = tree.children[0].children[1]
    expect(link.url).toBe('/blog/hello-world')
    expect(link.children[0].value).toBe('this post')
  })

  it('wraps private clippings in NotePopover MDX node', async () => {
    const tree: any = await transform('Read [[comptia-linux]] for reference.')
    const node = tree.children[0].children[1]
    expect(node.type).toBe('mdxJsxTextElement')
    expect(node.name).toBe('NotePopover')
    const preview = node.attributes.find((a: any) => a.name === 'preview').value
    expect(preview).toBe('Short excerpt.')
  })

  it('invokes onDead callback for unknown targets and renders plain text', async () => {
    const onDead = vi.fn()
    const tree = unified().use(remarkParse).parse('Unknown [[does-not-exist]] link.')
    await unified().use(remarkParse).use(remarkWikilinks, { index, onDead }).run(tree)
    expect(onDead).toHaveBeenCalledWith('does-not-exist', expect.any(String))
    const text = (tree as any).children[0].children[1]
    expect(text.type).toBe('text')
    expect(text.value).toBe('does-not-exist')
  })
})
```

- [ ] **Step 2: Run test — expect fail**

Run: `pnpm test tests/lib/remark/wikilinks.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `src/lib/remark/wikilinks.ts`**

```ts
import type { Plugin } from 'unified'
import type { Root, Text, Paragraph, PhrasingContent } from 'mdast'
import { visit, SKIP } from 'unist-util-visit'

export type WikilinkTarget =
  | { kind: 'blog'|'project'|'role'|'education'|'gallery'; url: string; title: string }
  | { kind: 'clipping'; url: string; title: string; preview?: string; source?: string; publish: boolean; share: boolean }

export interface WikilinkIndex {
  posts:      Map<string, WikilinkTarget>
  projects:   Map<string, WikilinkTarget>
  roles:      Map<string, WikilinkTarget>
  education:  Map<string, WikilinkTarget>
  gallery:    Map<string, WikilinkTarget>
  clippings:  Map<string, WikilinkTarget>
}

export interface WikilinkOptions {
  index: WikilinkIndex
  onDead?: (slug: string, sourceFile: string) => void
  strict?: boolean
}

const LINK_REGEX = /\[\[([^\[\]|]+)(?:\|([^\[\]]+))?\]\]/g

function slugify(raw: string): string {
  return raw.trim().toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-]/g, '')
}

function resolve(index: WikilinkIndex, slug: string): WikilinkTarget | undefined {
  const s = slugify(slug)
  return index.posts.get(s)
    ?? index.projects.get(s)
    ?? index.roles.get(s)
    ?? index.education.get(s)
    ?? index.gallery.get(s)
    ?? index.clippings.get(s)
}

export const remarkWikilinks: Plugin<[WikilinkOptions], Root> = (opts) => {
  const { index, onDead = () => {}, strict = false } = opts
  return (tree, file) => {
    visit(tree, 'text', (node: Text, idx, parent) => {
      if (!parent || typeof idx !== 'number') return
      const src = node.value
      if (!src.includes('[[')) return

      const out: PhrasingContent[] = []
      let lastIndex = 0
      LINK_REGEX.lastIndex = 0
      for (const match of src.matchAll(LINK_REGEX)) {
        const [full, slugRaw, alias] = match
        const mIdx = match.index ?? 0
        if (mIdx > lastIndex) out.push({ type: 'text', value: src.slice(lastIndex, mIdx) })
        lastIndex = mIdx + full.length

        const target = resolve(index, slugRaw)
        const display = (alias ?? target?.title ?? slugRaw).trim()

        if (!target) {
          onDead(slugRaw.trim(), String(file.path ?? ''))
          if (strict) throw new Error(`Dead wikilink: ${slugRaw} in ${file.path}`)
          out.push({ type: 'text', value: display })
          continue
        }

        if (target.kind === 'clipping' && !target.publish) {
          out.push({
            type: 'mdxJsxTextElement',
            name: 'NotePopover',
            attributes: [
              { type: 'mdxJsxAttribute', name: 'title', value: target.title },
              ...(target.preview ? [{ type: 'mdxJsxAttribute', name: 'preview', value: target.preview }] : []),
              ...(target.source  ? [{ type: 'mdxJsxAttribute', name: 'source',  value: target.source  }] : []),
            ],
            children: [{ type: 'text', value: display }],
          } as any)
          continue
        }

        out.push({
          type: 'link',
          url: target.url,
          title: null,
          children: [{ type: 'text', value: display }],
        })
      }

      if (lastIndex < src.length) out.push({ type: 'text', value: src.slice(lastIndex) })
      if (out.length === 0) return

      parent.children.splice(idx, 1, ...out)
      return [SKIP, idx + out.length]
    })
  }
}
```

- [ ] **Step 4: Run test — expect pass**

Run: `pnpm test tests/lib/remark/wikilinks.test.ts`
Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/remark/wikilinks.ts tests/lib/remark/wikilinks.test.ts
git commit -m "feat(remark): add wikilink resolver with popover + dead-link handling"
```

### Task A6: remark-embeds plugin

**Files:**
- Create: `src/lib/remark/embeds.ts`
- Create: `tests/lib/remark/embeds.test.ts`

- [ ] **Step 1: Write failing test**

Create `tests/lib/remark/embeds.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import { remarkEmbeds } from '@/lib/remark/embeds'

async function transform(md: string, opts: any) {
  const tree = unified().use(remarkParse).parse(md)
  await unified().use(remarkParse).use(remarkEmbeds, opts).run(tree, { path: '/vault/Blogs/my-post.md' } as any)
  return tree
}

describe('remark-embeds', () => {
  it('rewrites ![[image.png]] to <img> with copy request', async () => {
    const copyAsset = vi.fn().mockReturnValue('/blog-assets/my-post/image.png')
    const resolveExcalidraw = vi.fn()
    const tree: any = await transform('![[image.png]]', {
      attachmentsRoot: '/vault/Attachments',
      copyAsset,
      resolveExcalidraw,
    })
    const para = tree.children[0]
    const img = para.children[0]
    expect(img.type).toBe('image')
    expect(img.url).toBe('/blog-assets/my-post/image.png')
    expect(copyAsset).toHaveBeenCalledWith('image.png', 'my-post')
  })

  it('rewrites ![[drawing.excalidraw.md]] to inline SVG', async () => {
    const copyAsset = vi.fn()
    const resolveExcalidraw = vi.fn().mockReturnValue('<svg data-test="ok"></svg>')
    const tree: any = await transform('![[drawing.excalidraw.md]]', {
      attachmentsRoot: '/vault/Attachments',
      copyAsset,
      resolveExcalidraw,
    })
    const para = tree.children[0]
    const html = para.children[0]
    expect(html.type).toBe('html')
    expect(html.value).toContain('<svg')
    expect(resolveExcalidraw).toHaveBeenCalledWith('drawing.excalidraw.md')
  })

  it('leaves normal markdown image syntax alone', async () => {
    const copyAsset = vi.fn()
    const resolveExcalidraw = vi.fn()
    const tree: any = await transform('![alt text](https://example.com/img.png)', {
      attachmentsRoot: '/vault/Attachments',
      copyAsset,
      resolveExcalidraw,
    })
    expect(copyAsset).not.toHaveBeenCalled()
    expect(tree.children[0].children[0].url).toBe('https://example.com/img.png')
  })
})
```

- [ ] **Step 2: Run test — expect fail**

Run: `pnpm test tests/lib/remark/embeds.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `src/lib/remark/embeds.ts`**

```ts
import type { Plugin } from 'unified'
import type { Root, Text, PhrasingContent } from 'mdast'
import { visit, SKIP } from 'unist-util-visit'
import path from 'node:path'

export interface EmbedOptions {
  attachmentsRoot: string
  copyAsset: (filename: string, postSlug: string) => string
  resolveExcalidraw: (filename: string) => string
}

const EMBED_REGEX = /!\[\[([^\[\]]+)\]\]/g

function postSlugFromFilePath(filePath: string | undefined): string {
  if (!filePath) return 'unknown'
  const base = path.basename(filePath, path.extname(filePath))
  return base
}

export const remarkEmbeds: Plugin<[EmbedOptions], Root> = (opts) => {
  const { copyAsset, resolveExcalidraw } = opts
  return (tree, file) => {
    const postSlug = postSlugFromFilePath(file.path as string | undefined)

    visit(tree, 'text', (node: Text, idx, parent) => {
      if (!parent || typeof idx !== 'number') return
      const src = node.value
      if (!src.includes('![[')) return

      const out: PhrasingContent[] = []
      let lastIndex = 0
      EMBED_REGEX.lastIndex = 0
      for (const match of src.matchAll(EMBED_REGEX)) {
        const [full, filename] = match
        const mIdx = match.index ?? 0
        if (mIdx > lastIndex) out.push({ type: 'text', value: src.slice(lastIndex, mIdx) })
        lastIndex = mIdx + full.length

        if (filename.endsWith('.excalidraw.md')) {
          const svg = resolveExcalidraw(filename)
          out.push({ type: 'html', value: svg } as any)
          continue
        }

        const publicUrl = copyAsset(filename, postSlug)
        out.push({
          type: 'image',
          url: publicUrl,
          title: null,
          alt: filename,
        })
      }

      if (lastIndex < src.length) out.push({ type: 'text', value: src.slice(lastIndex) })
      if (out.length === 0) return

      parent.children.splice(idx, 1, ...out)
      return [SKIP, idx + out.length]
    })
  }
}
```

- [ ] **Step 4: Run test — expect pass**

Run: `pnpm test tests/lib/remark/embeds.test.ts`
Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/remark/embeds.ts tests/lib/remark/embeds.test.ts
git commit -m "feat(remark): add embed resolver for images + excalidraw"
```

### Task A7: Asset-copier + excalidraw renderer adapters (real filesystem side)

**Files:**
- Create: `src/lib/remark/adapters.ts`
- Create: `tests/lib/remark/adapters.test.ts`

These adapters implement `copyAsset` and `resolveExcalidraw` against the real filesystem, used by `astro.config.ts` wiring.

- [ ] **Step 1: Write failing test using a tmp dir**

Create `tests/lib/remark/adapters.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { createAssetAdapters } from '@/lib/remark/adapters'

let tmp: string
beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'embed-test-'))
  fs.mkdirSync(path.join(tmp, 'vault/Attachments'), { recursive: true })
  fs.mkdirSync(path.join(tmp, 'public'), { recursive: true })
  fs.writeFileSync(path.join(tmp, 'vault/Attachments/image.png'), 'PNG_BYTES')
  fs.writeFileSync(path.join(tmp, 'vault/Attachments/drawing.excalidraw.md'), '```compressed-json\n{"elements":[]}\n```')
})
afterEach(() => { fs.rmSync(tmp, { recursive: true, force: true }) })

describe('asset adapters', () => {
  it('copyAsset places file under public/blog-assets/<slug>/ and returns public URL', () => {
    const { copyAsset } = createAssetAdapters({
      attachmentsRoot: path.join(tmp, 'vault/Attachments'),
      publicRoot: path.join(tmp, 'public'),
      excalidrawCacheDir: path.join(tmp, '.cache/excalidraw'),
    })
    const url = copyAsset('image.png', 'hello-world')
    expect(url).toBe('/blog-assets/hello-world/image.png')
    expect(fs.existsSync(path.join(tmp, 'public/blog-assets/hello-world/image.png'))).toBe(true)
  })

  it('copyAsset is idempotent (hash-checked skip)', () => {
    const { copyAsset } = createAssetAdapters({
      attachmentsRoot: path.join(tmp, 'vault/Attachments'),
      publicRoot: path.join(tmp, 'public'),
      excalidrawCacheDir: path.join(tmp, '.cache/excalidraw'),
    })
    copyAsset('image.png', 'hello-world')
    const mtime1 = fs.statSync(path.join(tmp, 'public/blog-assets/hello-world/image.png')).mtimeMs
    copyAsset('image.png', 'hello-world')
    const mtime2 = fs.statSync(path.join(tmp, 'public/blog-assets/hello-world/image.png')).mtimeMs
    expect(mtime2).toBe(mtime1)
  })

  it('resolveExcalidraw returns SVG string (stub renderer)', () => {
    const { resolveExcalidraw } = createAssetAdapters({
      attachmentsRoot: path.join(tmp, 'vault/Attachments'),
      publicRoot: path.join(tmp, 'public'),
      excalidrawCacheDir: path.join(tmp, '.cache/excalidraw'),
      renderExcalidraw: () => '<svg data-stub="1"></svg>',
    })
    const svg = resolveExcalidraw('drawing.excalidraw.md')
    expect(svg).toContain('<svg')
  })

  it('resolveExcalidraw caches by content hash', () => {
    let calls = 0
    const { resolveExcalidraw } = createAssetAdapters({
      attachmentsRoot: path.join(tmp, 'vault/Attachments'),
      publicRoot: path.join(tmp, 'public'),
      excalidrawCacheDir: path.join(tmp, '.cache/excalidraw'),
      renderExcalidraw: () => { calls++; return '<svg data-stub="1"></svg>' },
    })
    resolveExcalidraw('drawing.excalidraw.md')
    resolveExcalidraw('drawing.excalidraw.md')
    expect(calls).toBe(1)
  })
})
```

- [ ] **Step 2: Run test — expect fail**

Run: `pnpm test tests/lib/remark/adapters.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `src/lib/remark/adapters.ts`**

```ts
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

export interface AdapterOptions {
  attachmentsRoot: string
  publicRoot: string
  excalidrawCacheDir: string
  renderExcalidraw?: (filepath: string) => string
}

function hashBuffer(buf: Buffer): string {
  return crypto.createHash('sha256').update(buf).digest('hex').slice(0, 16)
}

function defaultRenderExcalidraw(_filepath: string): string {
  return '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><text x="10" y="20">excalidraw placeholder</text></svg>'
}

export function createAssetAdapters(opts: AdapterOptions) {
  const render = opts.renderExcalidraw ?? defaultRenderExcalidraw

  function copyAsset(filename: string, postSlug: string): string {
    const src = path.join(opts.attachmentsRoot, filename)
    const destDir = path.join(opts.publicRoot, 'blog-assets', postSlug)
    const dest = path.join(destDir, filename)
    fs.mkdirSync(destDir, { recursive: true })

    if (fs.existsSync(dest)) {
      const srcHash = hashBuffer(fs.readFileSync(src))
      const destHash = hashBuffer(fs.readFileSync(dest))
      if (srcHash === destHash) return `/blog-assets/${postSlug}/${filename}`
    }
    fs.copyFileSync(src, dest)
    return `/blog-assets/${postSlug}/${filename}`
  }

  function resolveExcalidraw(filename: string): string {
    const src = path.join(opts.attachmentsRoot, filename)
    const buf = fs.readFileSync(src)
    const hash = hashBuffer(buf)
    const cacheFile = path.join(opts.excalidrawCacheDir, `${hash}.svg`)
    if (fs.existsSync(cacheFile)) return fs.readFileSync(cacheFile, 'utf8')

    fs.mkdirSync(opts.excalidrawCacheDir, { recursive: true })
    const svg = render(src)
    fs.writeFileSync(cacheFile, svg, 'utf8')
    return svg
  }

  return { copyAsset, resolveExcalidraw }
}
```

- [ ] **Step 4: Run test — expect pass**

Run: `pnpm test tests/lib/remark/adapters.test.ts`
Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/remark/adapters.ts tests/lib/remark/adapters.test.ts
git commit -m "feat(remark): add filesystem adapters for asset copy + excalidraw cache"
```

### Task A8: Wikilink index builder (pulls from Astro content collections)

**Files:**
- Create: `src/lib/remark/buildIndex.ts`
- Create: `tests/lib/remark/buildIndex.test.ts`

This function builds the `WikilinkIndex` from Astro collections at build time.

- [ ] **Step 1: Write failing test with mock collections**

Create `tests/lib/remark/buildIndex.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { buildWikilinkIndex } from '@/lib/remark/buildIndex'

describe('buildWikilinkIndex', () => {
  it('indexes posts, projects, roles, and clippings by id', () => {
    const idx = buildWikilinkIndex({
      blog: [{ id: 'hello-world', data: { title: 'Hello', draft: false } }],
      projects: [{ id: 'mrr-dashboard', data: { title: 'MRR Dashboard' } }],
      roles: [{ id: 'gitlab-oss', data: { role: 'OSS Contributor' } }],
      education: [],
      gallery: [],
      clippings: [{
        id: 'comptia-linux',
        data: { title: 'CompTIA Linux', preview: 'excerpt', source: 'https://x', publish: false, share: false },
      }],
    } as any)

    expect(idx.posts.get('hello-world')?.url).toBe('/blog/hello-world')
    expect(idx.projects.get('mrr-dashboard')?.url).toBe('/projects/mrr-dashboard')
    expect(idx.roles.get('gitlab-oss')?.url).toBe('/experience/gitlab-oss')
    expect(idx.clippings.get('comptia-linux')).toMatchObject({
      kind: 'clipping', publish: false, share: false, preview: 'excerpt',
    })
  })

  it('omits draft posts', () => {
    const idx = buildWikilinkIndex({
      blog: [{ id: 'draft', data: { title: 'Draft', draft: true } }],
      projects: [], roles: [], education: [], gallery: [], clippings: [],
    } as any)
    expect(idx.posts.has('draft')).toBe(false)
  })
})
```

- [ ] **Step 2: Run test — expect fail**

Run: `pnpm test tests/lib/remark/buildIndex.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `src/lib/remark/buildIndex.ts`**

```ts
import type { WikilinkIndex, WikilinkTarget } from './wikilinks'

interface RawCollections {
  blog:       Array<{ id: string; data: { title: string; draft?: boolean } }>
  projects:   Array<{ id: string; data: { title: string } }>
  roles:      Array<{ id: string; data: { role: string } }>
  education:  Array<{ id: string; data: { institution: string } }>
  gallery:    Array<{ id: string; data: { title: string } }>
  clippings:  Array<{ id: string; data: { title: string; preview?: string; source?: string; publish: boolean; share: boolean } }>
}

export function buildWikilinkIndex(c: RawCollections): WikilinkIndex {
  const posts = new Map<string, WikilinkTarget>()
  for (const e of c.blog) {
    if (e.data.draft) continue
    posts.set(e.id, { kind: 'blog', url: `/blog/${e.id}`, title: e.data.title })
  }

  const projects = new Map<string, WikilinkTarget>()
  for (const e of c.projects) {
    projects.set(e.id, { kind: 'project', url: `/projects/${e.id}`, title: e.data.title })
  }

  const roles = new Map<string, WikilinkTarget>()
  for (const e of c.roles) {
    roles.set(e.id, { kind: 'role', url: `/experience/${e.id}`, title: e.data.role })
  }

  const education = new Map<string, WikilinkTarget>()
  for (const e of c.education) {
    education.set(e.id, { kind: 'education', url: `/education/${e.id}`, title: e.data.institution })
  }

  const gallery = new Map<string, WikilinkTarget>()
  for (const e of c.gallery) {
    gallery.set(e.id, { kind: 'gallery', url: `/gallery/${e.id}`, title: e.data.title })
  }

  const clippings = new Map<string, WikilinkTarget>()
  for (const e of c.clippings) {
    const url = e.data.publish ? `/notes/${e.id}` : ''
    clippings.set(e.id, {
      kind: 'clipping', url, title: e.data.title,
      preview: e.data.preview, source: e.data.source,
      publish: e.data.publish, share: e.data.share,
    })
  }

  return { posts, projects, roles, education, gallery, clippings }
}
```

- [ ] **Step 4: Run test — expect pass**

Run: `pnpm test tests/lib/remark/buildIndex.test.ts`
Expected: 2 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/remark/buildIndex.ts tests/lib/remark/buildIndex.test.ts
git commit -m "feat(remark): add wikilink index builder from content collections"
```

---

## Phase 5 — Wire Astro content collections + remark plugins

### Task A9: Expand `src/content/config.ts` to 8 collections and point at `vendor/vault`

**Files:**
- Modify: `src/content/config.ts`
- Create: `tests/content/config.test.ts`

- [ ] **Step 1: Write test that asserts collection names exist**

Create `tests/content/config.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { collections } from '@/content/config'

describe('content collections', () => {
  it('registers 8 named collections', () => {
    const names = Object.keys(collections).sort()
    expect(names).toEqual([
      'about', 'blog', 'clippings', 'companies', 'education', 'gallery', 'projects', 'roles',
    ].sort())
  })
})
```

- [ ] **Step 2: Run test — expect fail (current config has only `blog`)**

Run: `pnpm test tests/content/config.test.ts`
Expected: FAIL.

- [ ] **Step 3: Rewrite `src/content/config.ts`**

```ts
import { defineCollection } from 'astro:content'
import { glob } from 'astro/loaders'
import {
  blogSchema, projectSchema, roleSchema, companySchema,
  educationSchema, gallerySchema, clippingSchema, aboutSchema,
} from './schemas'

const BASE = './vendor/vault'

const blog = defineCollection({
  loader: glob({ pattern: 'Blogs/**/*.md', base: BASE }),
  schema: blogSchema,
})
const projects = defineCollection({
  loader: glob({ pattern: 'Portfolio/Projects/**/*.md', base: BASE }),
  schema: projectSchema,
})
const roles = defineCollection({
  loader: glob({ pattern: 'Portfolio/Experience/*.md', base: BASE }),
  schema: roleSchema,
})
const companies = defineCollection({
  loader: glob({ pattern: 'Portfolio/Experience/Companies/*.md', base: BASE }),
  schema: companySchema,
})
const education = defineCollection({
  loader: glob({ pattern: 'Portfolio/Education/**/*.md', base: BASE }),
  schema: educationSchema,
})
const gallery = defineCollection({
  loader: glob({ pattern: 'Portfolio/Gallery/**/*.md', base: BASE }),
  schema: gallerySchema,
})
const clippings = defineCollection({
  loader: glob({ pattern: 'References/Clippings/**/*.md', base: BASE }),
  schema: clippingSchema,
})
const about = defineCollection({
  loader: glob({ pattern: 'Portfolio/About.md', base: BASE }),
  schema: aboutSchema,
})

export const collections = { blog, projects, roles, companies, education, gallery, clippings, about }
```

- [ ] **Step 4: Run test — expect pass**

Run: `pnpm test tests/content/config.test.ts`
Expected: pass.

- [ ] **Step 5: Run Astro build to ensure collection glob paths resolve**

Run: `pnpm build`
Expected: build succeeds; if `vendor/vault/Blogs` is empty that is OK; the `about` collection finds `About.md` seeded in Pre-Task 0.1.

- [ ] **Step 6: Commit**

```bash
git add src/content/config.ts tests/content/config.test.ts
git commit -m "feat(content): expand to 8 collections loading from vendor/vault"
```

### Task A10: Wire remark plugins into `astro.config.ts`

**Files:**
- Modify: `astro.config.ts`
- Create: `scripts/load-wikilink-index.mjs`

Because Astro markdown processing runs inside Vite at config eval time, we need a synchronous-at-build-time index. Strategy: read collection entries by filesystem scan of `vendor/vault` at config load, not via `getCollection()` (which is async and only available in runtime pages).

- [ ] **Step 1: Write `scripts/load-wikilink-index.mjs`** — a synchronous vault scanner

```js
// scripts/load-wikilink-index.mjs
import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'

const BASE = path.resolve('./vendor/vault')

function scanDir(dir, fn) {
  if (!fs.existsSync(dir)) return
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) scanDir(full, fn)
    else if (entry.isFile() && full.endsWith('.md')) fn(full)
  }
}

function idFromPath(root, filepath) {
  const rel = path.relative(root, filepath)
  return rel.replace(/\.md$/, '').replace(/\\/g, '/').split('/').pop()
}

export function loadIndex() {
  const index = {
    posts:     new Map(),
    projects:  new Map(),
    roles:     new Map(),
    education: new Map(),
    gallery:   new Map(),
    clippings: new Map(),
  }

  scanDir(path.join(BASE, 'Blogs'), (f) => {
    const { data } = matter(fs.readFileSync(f, 'utf8'))
    if (data.draft) return
    const id = idFromPath(path.join(BASE, 'Blogs'), f)
    index.posts.set(id, { kind: 'blog', url: `/blog/${id}`, title: data.title ?? id })
  })

  scanDir(path.join(BASE, 'Portfolio/Projects'), (f) => {
    const { data } = matter(fs.readFileSync(f, 'utf8'))
    const id = idFromPath(path.join(BASE, 'Portfolio/Projects'), f)
    index.projects.set(id, { kind: 'project', url: `/projects/${id}`, title: data.title ?? id })
  })

  scanDir(path.join(BASE, 'Portfolio/Experience'), (f) => {
    if (f.includes('/Companies/')) return
    const { data } = matter(fs.readFileSync(f, 'utf8'))
    const id = idFromPath(path.join(BASE, 'Portfolio/Experience'), f)
    index.roles.set(id, { kind: 'role', url: `/experience/${id}`, title: data.role ?? id })
  })

  scanDir(path.join(BASE, 'Portfolio/Education'), (f) => {
    const { data } = matter(fs.readFileSync(f, 'utf8'))
    const id = idFromPath(path.join(BASE, 'Portfolio/Education'), f)
    index.education.set(id, { kind: 'education', url: `/education/${id}`, title: data.institution ?? id })
  })

  scanDir(path.join(BASE, 'Portfolio/Gallery'), (f) => {
    const { data } = matter(fs.readFileSync(f, 'utf8'))
    const id = idFromPath(path.join(BASE, 'Portfolio/Gallery'), f)
    index.gallery.set(id, { kind: 'gallery', url: `/gallery/${id}`, title: data.title ?? id })
  })

  scanDir(path.join(BASE, 'References/Clippings'), (f) => {
    const { data } = matter(fs.readFileSync(f, 'utf8'))
    const id = idFromPath(path.join(BASE, 'References/Clippings'), f)
    index.clippings.set(id, {
      kind: 'clipping',
      url: data.publish ? `/notes/${id}` : '',
      title: data.title ?? id,
      preview: data.preview,
      source: data.source,
      publish: data.publish ?? false,
      share: data.share ?? false,
    })
  })

  return index
}
```

Install `gray-matter`:

```bash
pnpm add -D gray-matter
```

- [ ] **Step 2: Rewrite `astro.config.ts` to register remark plugins**

```ts
// @ts-check
import react from '@astrojs/react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'astro/config'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sitemap from '@astrojs/sitemap'

import { remarkPreview } from './src/lib/remark/preview.ts'
import { remarkWikilinks } from './src/lib/remark/wikilinks.ts'
import { remarkEmbeds } from './src/lib/remark/embeds.ts'
import { createAssetAdapters } from './src/lib/remark/adapters.ts'
import { loadIndex } from './scripts/load-wikilink-index.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const site = process.env.VERCEL
  ? process.env.VERCEL_ENV === 'production'
    ? 'https://vietbui1999ru.github.io'
    : `https://${process.env.VERCEL_URL}`
  : (process.env.SITE ?? 'http://localhost:4321')
const base = process.env.BASE || '/'

const wikilinkIndex = loadIndex()
const deadLinks = new Set()

const adapters = createAssetAdapters({
  attachmentsRoot: path.resolve('./vendor/vault/Attachments'),
  publicRoot: path.resolve('./public'),
  excalidrawCacheDir: path.resolve('./node_modules/.cache/excalidraw'),
})

export default defineConfig({
  site,
  base,
  integrations: [react(), sitemap()],
  markdown: {
    remarkPlugins: [
      remarkPreview,
      [remarkWikilinks, {
        index: wikilinkIndex,
        onDead: (slug, file) => {
          const key = `${slug}::${file}`
          if (!deadLinks.has(key)) {
            deadLinks.add(key)
            console.warn(`[wikilink] dead: [[${slug}]] in ${file}`)
          }
        },
        strict: process.env.STRICT_WIKILINKS === '1',
      }],
      [remarkEmbeds, {
        attachmentsRoot: path.resolve('./vendor/vault/Attachments'),
        copyAsset: adapters.copyAsset,
        resolveExcalidraw: adapters.resolveExcalidraw,
      }],
    ],
  },
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: { '@': path.resolve(__dirname, 'src') },
    },
  },
})
```

- [ ] **Step 3: Install `@astrojs/sitemap`**

```bash
pnpm add @astrojs/sitemap
```

- [ ] **Step 4: Run build to confirm remark wiring works on empty Blogs + About.md**

Run: `pnpm build`
Expected: success; dist/ contains built site; no unresolved plugin errors.

- [ ] **Step 5: Add a test fixture blog post with a wikilink + embed**

Create `vendor/vault/Blogs/2026-04-16-fixture.md` (in PortfolioVault; commit + push there first, then bump submodule). For plan execution in-place, instead add a fixture via the PortfolioVault worktree path:

```bash
cd ~/repos/PortfolioVault
cat > Blogs/2026-04-16-fixture.md <<'EOF'
---
title: Fixture Post
description: Smoke test for wikilinks + preview extraction.
date: 2026-04-16
tags: [smoke-test]
---

First paragraph of the fixture. It should become the preview.

See [[2026-04-16-fixture]] for self-reference (resolves to /blog/2026-04-16-fixture).

A nonexistent [[totally-missing]] link should warn.
EOF
git add Blogs/2026-04-16-fixture.md
git commit -m "test: add fixture blog post"
git push
cd -
git submodule update --remote vendor/vault
```

- [ ] **Step 6: Run build and look for dead-link warning**

Run: `pnpm build 2>&1 | grep -E '\[wikilink\]'`
Expected: exactly one warning line mentioning `totally-missing`.

- [ ] **Step 7: Commit**

```bash
git add astro.config.ts scripts/load-wikilink-index.mjs package.json pnpm-lock.yaml vendor/vault
git commit -m "feat(build): wire remark plugins (preview, wikilinks, embeds) into astro.config"
```

---

## Phase 6 — NotePopover component

### Task A11: Render clipping popovers with a client component

**Files:**
- Create: `src/components/ui/NotePopover.tsx`
- Create: `src/components/ui/NotePopover.test.tsx`

The remark plugin emits `<NotePopover preview source>text</NotePopover>` MDX nodes. Since content uses `.md` not `.mdx`, we need a different approach: emit HTML that a runtime script wires up, OR migrate content to MDX. The cleaner path is MDX — tested here, but it requires switching content extension expectations. For now, plan emits an `<a>` with `data-note-*` attributes instead, and a small client script wires popovers on hydration.

Replacement strategy: modify remark-wikilinks to emit `<a class="note-popover" data-title data-preview data-source>text</a>` HTML instead of MDX JSX.

- [ ] **Step 1: Update `src/lib/remark/wikilinks.ts` to emit HTML anchor instead of mdxJsxTextElement**

In the clipping branch, replace the `mdxJsxTextElement` node with:

```ts
out.push({
  type: 'html',
  value: `<a class="note-popover" data-title="${escapeAttr(target.title)}" ${target.preview ? `data-preview="${escapeAttr(target.preview)}" ` : ''}${target.source ? `data-source="${escapeAttr(target.source)}" ` : ''}>${escapeHtml(display)}</a>`,
} as any)
```

Add helper functions at the top of `src/lib/remark/wikilinks.ts`:

```ts
function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
```

- [ ] **Step 2: Update the corresponding test in `tests/lib/remark/wikilinks.test.ts`**

Replace the "wraps private clippings" test:

```ts
it('wraps private clippings as <a class="note-popover"> html', async () => {
  const tree: any = await transform('Read [[comptia-linux]] for reference.')
  const node = tree.children[0].children[1]
  expect(node.type).toBe('html')
  expect(node.value).toContain('class="note-popover"')
  expect(node.value).toContain('data-preview="Short excerpt."')
  expect(node.value).toContain('data-source="https://example.com"')
})
```

- [ ] **Step 3: Run test — expect pass**

Run: `pnpm test tests/lib/remark/wikilinks.test.ts`
Expected: pass.

- [ ] **Step 4: Write a component test for `NotePopover.tsx`**

Create `src/components/ui/NotePopover.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { NotePopover } from './NotePopover'

describe('NotePopover', () => {
  it('renders text and shows preview on hover', () => {
    render(<NotePopover title="CompTIA Linux" preview="Short excerpt." source="https://example.com">See note</NotePopover>)
    expect(screen.getByText('See note')).toBeInTheDocument()
    fireEvent.mouseEnter(screen.getByText('See note'))
    expect(screen.getByText('Short excerpt.')).toBeInTheDocument()
  })

  it('has source link when source provided', () => {
    render(<NotePopover title="x" preview="p" source="https://example.com">t</NotePopover>)
    fireEvent.mouseEnter(screen.getByText('t'))
    expect(screen.getByRole('link', { name: /source/i })).toHaveAttribute('href', 'https://example.com')
  })
})
```

Install testing-library matchers:

```bash
pnpm add -D @testing-library/jest-dom
```

Update `tests/setup.ts`:

```ts
import '@testing-library/dom'
import '@testing-library/jest-dom/vitest'
```

- [ ] **Step 5: Run test — expect fail**

Run: `pnpm test src/components/ui/NotePopover.test.tsx`
Expected: FAIL.

- [ ] **Step 6: Implement `src/components/ui/NotePopover.tsx`**

```tsx
import { useState } from 'react'
import { cn } from '@/lib/utils'

export interface NotePopoverProps {
  title: string
  preview?: string
  source?: string
  children: React.ReactNode
  className?: string
}

export function NotePopover({ title, preview, source, children, className }: NotePopoverProps) {
  const [open, setOpen] = useState(false)
  return (
    <span
      className={cn('relative inline-block', className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      <a
        tabIndex={0}
        className="underline decoration-dotted cursor-help"
        role="button"
        aria-expanded={open}
      >
        {children}
      </a>
      {open && (
        <span
          role="tooltip"
          className="absolute z-50 left-0 top-full mt-1 w-72 rounded-md border border-white/10 bg-black/80 p-3 text-xs text-white shadow-lg backdrop-blur"
        >
          <span className="block font-semibold mb-1">{title}</span>
          {preview && <span className="block text-white/80 mb-2">{preview}</span>}
          {source && (
            <a
              href={source}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sky-300 hover:text-sky-200 underline"
            >
              source ↗
            </a>
          )}
        </span>
      )}
    </span>
  )
}

export default NotePopover
```

- [ ] **Step 7: Create a hydration script for HTML-emitted popovers**

Create `src/scripts/hydrate-note-popovers.ts`:

```ts
import { createRoot } from 'react-dom/client'
import { createElement } from 'react'
import { NotePopover } from '@/components/ui/NotePopover'

export function hydrateNotePopovers(root: ParentNode = document) {
  const anchors = root.querySelectorAll<HTMLAnchorElement>('a.note-popover')
  for (const a of anchors) {
    const title = a.dataset.title ?? ''
    const preview = a.dataset.preview
    const source = a.dataset.source
    const text = a.textContent ?? ''
    const mount = document.createElement('span')
    a.replaceWith(mount)
    createRoot(mount).render(
      createElement(NotePopover, { title, preview, source }, text),
    )
  }
}

if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => hydrateNotePopovers())
  } else {
    hydrateNotePopovers()
  }
}
```

- [ ] **Step 8: Import hydration script in `src/layouts/BaseLayout.astro`**

Open `src/layouts/BaseLayout.astro` (view first to find the right insertion point in the `<head>` or end-of-body). Add:

```astro
<script>
  import '@/scripts/hydrate-note-popovers'
</script>
```

(Insert right before the closing `</body>` tag.)

- [ ] **Step 9: Run component tests + smoke build**

Run: `pnpm test src/components/ui/NotePopover.test.tsx && pnpm build`
Expected: tests pass; build completes.

- [ ] **Step 10: Commit**

```bash
git add src/components/ui/NotePopover.tsx src/components/ui/NotePopover.test.tsx src/scripts/hydrate-note-popovers.ts src/layouts/BaseLayout.astro src/lib/remark/wikilinks.ts tests/lib/remark/wikilinks.test.ts tests/setup.ts package.json pnpm-lock.yaml
git commit -m "feat(ui): NotePopover component + hydration for remark-emitted anchors"
```

---

## Phase 7 — Integrations (RSS, sitemap, robots, analytics)

### Task A12: RSS feed for blog

**Files:**
- Create: `src/pages/rss.xml.ts`
- Modify: `package.json`

- [ ] **Step 1: Install `@astrojs/rss`**

```bash
pnpm add @astrojs/rss
```

- [ ] **Step 2: Create `src/pages/rss.xml.ts`**

```ts
import rss from '@astrojs/rss'
import { getCollection } from 'astro:content'
import type { APIContext } from 'astro'

export async function GET(context: APIContext) {
  const posts = (await getCollection('blog'))
    .filter((p) => !p.data.draft)
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf())

  return rss({
    title: "Viet Bui — Blog",
    description: "Notes on software, simulations, and automation.",
    site: context.site ?? 'https://vietbui1999ru.github.io',
    items: posts.map((p) => ({
      title: p.data.title,
      description: p.data.description,
      pubDate: p.data.date,
      link: `/blog/${p.id}/`,
      categories: p.data.tags ?? [],
    })),
  })
}
```

- [ ] **Step 3: Build and curl the feed**

Run: `pnpm build && grep -c '<item>' dist/rss.xml`
Expected: number equals count of non-draft posts in `vendor/vault/Blogs/` (at least 1 from fixture).

- [ ] **Step 4: Commit**

```bash
git add src/pages/rss.xml.ts package.json pnpm-lock.yaml
git commit -m "feat(blog): add RSS feed at /rss.xml"
```

### Task A13: Sitemap + robots.txt

**Files:**
- Modify: `astro.config.ts` (sitemap already wired in Task A10)
- Create: `public/robots.txt`

- [ ] **Step 1: Create `public/robots.txt`**

```
User-agent: *
Allow: /

Sitemap: https://vietbui1999ru.github.io/sitemap-index.xml
```

- [ ] **Step 2: Build and verify sitemap is generated**

Run: `pnpm build && ls dist/sitemap-*.xml`
Expected: at least `sitemap-index.xml` and `sitemap-0.xml` exist.

- [ ] **Step 3: Commit**

```bash
git add public/robots.txt
git commit -m "feat(seo): add robots.txt pointing to sitemap-index"
```

### Task A14: Umami analytics

**Files:**
- Modify: `src/layouts/BaseLayout.astro`
- Modify: `.env.example` (create if absent)

- [ ] **Step 1: Create `.env.example`**

```
PUBLIC_UMAMI_SRC=https://umami.example.com/script.js
PUBLIC_UMAMI_ID=00000000-0000-0000-0000-000000000000
PUBLIC_SITE_URL=https://vietbui1999ru.github.io
```

- [ ] **Step 2: Add Umami script to `BaseLayout.astro` `<head>`**

Open `src/layouts/BaseLayout.astro`. Add inside `<head>`:

```astro
---
const umamiSrc = import.meta.env.PUBLIC_UMAMI_SRC
const umamiId  = import.meta.env.PUBLIC_UMAMI_ID
---
{umamiSrc && umamiId && (
  <script is:inline defer src={umamiSrc} data-website-id={umamiId}></script>
)}
```

- [ ] **Step 3: Verify gated absence — without env vars, script tag must not appear**

Run: `pnpm build && grep -c 'data-website-id' dist/index.html`
Expected: `0` (env unset).

- [ ] **Step 4: Verify gated presence**

Run: `PUBLIC_UMAMI_SRC=https://u.example/script.js PUBLIC_UMAMI_ID=abc pnpm build && grep -c 'data-website-id' dist/index.html`
Expected: `1`.

- [ ] **Step 5: Commit**

```bash
git add src/layouts/BaseLayout.astro .env.example
git commit -m "feat(analytics): env-gated Umami script in BaseLayout"
```

---

## Phase 8 — Sync + publish scripts

### Task A15: `scripts/publish-blog.sh` in portfolio repo

**Files:**
- Create: `scripts/publish-blog.sh`

- [ ] **Step 1: Create the script**

```bash
#!/usr/bin/env bash
set -euo pipefail

MAIN=${MAIN_VAULT:-$HOME/repos/Obsidian}
PV=${PORTFOLIO_VAULT:-$HOME/repos/PortfolioVault}

if [ ! -d "$MAIN" ]; then
  echo "error: main vault not found at $MAIN (set MAIN_VAULT env to override)" >&2
  exit 1
fi
if [ ! -d "$PV" ]; then
  echo "error: PortfolioVault not found at $PV (set PORTFOLIO_VAULT env to override)" >&2
  exit 1
fi

echo "[1/5] rsync main vault → PortfolioVault"
bash "$MAIN/scripts/sync-to-portfolio.sh"

echo "[2/5] commit PortfolioVault changes (if any)"
cd "$PV"
git add -A
if git diff --staged --quiet; then
  echo "      (no changes to commit)"
else
  git commit -m "content: sync from main vault $(date +%F)"
  git push
fi

echo "[3/5] bump submodule in portfolio repo"
cd - >/dev/null
git submodule update --remote vendor/vault

if git diff --staged --quiet vendor/vault && git diff --quiet vendor/vault; then
  echo "      (submodule unchanged; exiting)"
  exit 0
fi

echo "[4/5] commit submodule bump"
git add vendor/vault
git commit -m "content: bump vault $(cd vendor/vault && git rev-parse --short HEAD)"

echo "[5/5] push portfolio"
git push
echo "done"
```

```bash
chmod +x scripts/publish-blog.sh
```

- [ ] **Step 2: Add to `package.json` scripts**

```json
"publish-blog": "bash scripts/publish-blog.sh"
```

- [ ] **Step 3: Dry-run (no vault changes expected)**

Run: `pnpm publish-blog`
Expected: completes with "(no changes to commit)" or bumps submodule only if something changed.

- [ ] **Step 4: Commit**

```bash
git add scripts/publish-blog.sh package.json
git commit -m "feat(scripts): publish-blog orchestrates sync + submodule bump"
```

### Task A16: `scripts/sync-to-portfolio.sh` in main vault + `sync-attachments.mjs`

These scripts live in `~/repos/Obsidian/scripts/` (main vault repo). Document here but **do not commit to portfolio repo**. The portfolio repo references them via `publish-blog.sh`.

- [ ] **Step 1: In main vault, create `scripts/sync-to-portfolio.sh`**

```bash
cd ~/repos/Obsidian
mkdir -p scripts
cat > scripts/sync-to-portfolio.sh <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

MAIN=${MAIN_VAULT:-$(pwd)}
PV=${PORTFOLIO_VAULT:-$HOME/repos/PortfolioVault}

rsync -av --delete \
  --exclude='.obsidian/workspace*' \
  --exclude='.stfolder' --exclude='.stversions/' \
  --exclude='*.sync-conflict-*' \
  --exclude='.trash/' --exclude='.DS_Store' \
  "$MAIN/Blogs/" "$PV/Blogs/"

rsync -av --delete \
  --exclude='.DS_Store' \
  "$MAIN/References/Clippings/" "$PV/References/Clippings/"

node "$MAIN/scripts/sync-attachments.mjs" "$MAIN/Attachments" "$PV/Attachments"

echo "sync done. review: cd $PV && git status"
EOF
chmod +x scripts/sync-to-portfolio.sh
```

- [ ] **Step 2: In main vault, create `scripts/sync-attachments.mjs`**

```bash
cat > ~/repos/Obsidian/scripts/sync-attachments.mjs <<'EOF'
#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const [srcDir, destDir] = process.argv.slice(2)
if (!srcDir || !destDir) { console.error('usage: sync-attachments.mjs <src> <dest>'); process.exit(1) }

const EMBED_REGEX = /!\[\[([^\[\]]+)\]\]/g

function walk(dir) {
  const out = []
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name)
    if (e.isDirectory()) out.push(...walk(full))
    else if (e.isFile() && full.endsWith('.md')) out.push(full)
  }
  return out
}

const vaultRoot = path.dirname(srcDir)
const mdFiles = [...walk(path.join(vaultRoot, 'Blogs')), ...walk(path.join(vaultRoot, 'References/Clippings'))]

const referenced = new Set()
for (const f of mdFiles) {
  const body = fs.readFileSync(f, 'utf8')
  for (const m of body.matchAll(EMBED_REGEX)) referenced.add(m[1])
}

fs.mkdirSync(destDir, { recursive: true })

let copied = 0
for (const name of referenced) {
  const src = path.join(srcDir, name)
  if (!fs.existsSync(src)) { console.warn(`[attachments] missing: ${name}`); continue }
  const dest = path.join(destDir, name)
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  fs.copyFileSync(src, dest)
  copied++
}

let pruned = 0
for (const e of fs.readdirSync(destDir)) {
  if (!referenced.has(e)) { fs.rmSync(path.join(destDir, e), { recursive: true, force: true }); pruned++ }
}

console.log(`attachments: copied=${copied} pruned=${pruned} referenced=${referenced.size}`)
EOF
chmod +x ~/repos/Obsidian/scripts/sync-attachments.mjs
```

- [ ] **Step 3: Commit main vault scripts** (separately in the main vault repo)

```bash
cd ~/repos/Obsidian
git add scripts/sync-to-portfolio.sh scripts/sync-attachments.mjs
git commit -m "scripts: add sync-to-portfolio + sync-attachments"
git push
```

- [ ] **Step 4: End-to-end smoke from portfolio repo**

Run: `pnpm publish-blog`
Expected: main vault scripts execute; if vault has no new content, submodule bump is no-op; exit 0.

---

## Phase 9 — GitHub Actions deploy

### Task A17: GitHub Actions workflow

**Files:**
- Create: `.github/workflows/deploy.yml`

- [ ] **Step 1: Write the workflow**

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          submodules: false

      - name: Configure SSH for submodule
        uses: webfactory/ssh-agent@v0.9.0
        with:
          ssh-private-key: ${{ secrets.VAULT_DEPLOY_KEY }}

      - name: Init submodule with LFS
        run: |
          git submodule update --init --recursive
          cd vendor/vault
          git sparse-checkout init --cone
          git sparse-checkout set Blogs Portfolio References/Clippings Attachments
          git lfs install
          git lfs pull

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - name: Build
        env:
          PUBLIC_UMAMI_SRC: ${{ secrets.UMAMI_SRC }}
          PUBLIC_UMAMI_ID:  ${{ secrets.UMAMI_ID }}
          SITE: https://vietbui1999ru.github.io
        run: pnpm build

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/deploy-pages@v4
        id: deployment
```

- [ ] **Step 2: Commit and push**

```bash
git add .github/workflows/deploy.yml
git commit -m "ci: GitHub Actions deploy with submodule + LFS + Umami env"
git push
```

- [ ] **Step 3: Verify workflow run**

After push, open the Actions tab on the repo. Expected: "Deploy to GitHub Pages" workflow runs to green. First run may take longer due to Pages environment setup.

---

## Phase 10 — VaultCMS content types + final cleanup

### Task A18: VaultCMS content type yaml files (PortfolioVault)

These yaml files live in `~/repos/PortfolioVault/.obsidian/plugins/vault-cms/content-types/`. Document in plan; author commits in PortfolioVault repo, not portfolio repo.

- [ ] **Step 1: In PortfolioVault, create content type files**

```bash
cd ~/repos/PortfolioVault
mkdir -p .obsidian/plugins/vault-cms/content-types
```

- [ ] **Step 2: `blog-post.yaml`**

```yaml
name: Blog Post
path_pattern: "Blogs/{{date:YYYY-MM-DD}}-{{slug}}.md"
fields:
  - name: title
    type: text
    required: true
  - name: description
    type: text
    required: true
    max_length: 160
  - name: date
    type: date
    required: true
    default: "{{today}}"
  - name: draft
    type: boolean
    default: false
  - name: tags
    type: multi-tag
  - name: cover
    type: text
  - name: updated
    type: date
  - name: series
    type: text
  - name: preview
    type: text
    max_length: 280
  - name: audience
    type: multi-select
    options: [dev, student, general]
  - name: topics
    type: multi-tag
```

- [ ] **Step 3: `role.yaml`**

```yaml
name: Role
path_pattern: "Portfolio/Experience/{{slug}}.md"
fields:
  - { name: role,         type: text, required: true }
  - { name: company,      type: text, required: true }
  - { name: company_url,  type: url }
  - { name: date_start,   type: date, required: true }
  - { name: date_end,     type: date, nullable: true }
  - { name: tags,         type: multi-tag }
  - { name: summary,      type: text, required: true }
  - { name: graph_node,   type: boolean, default: true }
```

- [ ] **Step 4: `company.yaml`, `project.yaml`, `education.yaml`, `gallery.yaml`, `clipping.yaml`**

Mirror the zod schemas from `src/content/schemas.ts`. Template: copy the structure of `role.yaml` and adjust fields per schema.

`company.yaml`:

```yaml
name: Company
path_pattern: "Portfolio/Experience/Companies/{{slug}}.md"
fields:
  - { name: name,       type: text, required: true }
  - { name: url,        type: url }
  - { name: logo,       type: text }
  - { name: graph_node, type: boolean, default: false }
```

`project.yaml`:

```yaml
name: Project
path_pattern: "Portfolio/Projects/{{slug}}.md"
fields:
  - { name: title,    type: text, required: true }
  - { name: summary,  type: text, required: true }
  - { name: date,     type: date, required: true }
  - { name: tags,     type: multi-tag }
  - { name: badges,   type: multi-tag }
  - { name: images,   type: multi-text }
  - { name: cover,    type: text }
  - name: links
    type: list
    fields:
      - { name: icon, type: text, required: true }
      - { name: url,  type: url,  required: true }
  - { name: status,     type: select, options: [active, shipped, archived], default: shipped }
  - { name: graph_node, type: boolean, default: true }
```

`education.yaml`:

```yaml
name: Education
path_pattern: "Portfolio/Education/{{slug}}.md"
fields:
  - { name: institution, type: text, required: true }
  - { name: degree,      type: text, required: true }
  - { name: field,       type: text }
  - { name: date_start,  type: date, required: true }
  - { name: date_end,    type: date, nullable: true }
  - { name: tags,        type: multi-tag }
  - { name: summary,     type: text, required: true }
  - { name: graph_node,  type: boolean, default: true }
```

`gallery.yaml`:

```yaml
name: Gallery Item
path_pattern: "Portfolio/Gallery/{{slug}}.md"
fields:
  - { name: title,       type: text, required: true }
  - { name: description, type: text }
  - { name: date,        type: date, required: true }
  - { name: image,       type: text, required: true }
  - { name: tags,        type: multi-tag }
  - { name: graph_node,  type: boolean, default: true }
```

`clipping.yaml`:

```yaml
name: Clipping
path_pattern: "References/Clippings/{{slug}}.md"
fields:
  - { name: title,       type: text, required: true }
  - { name: source,      type: url }
  - { name: preview,     type: text, max_length: 280 }
  - { name: tags,        type: multi-tag }
  - { name: publish,     type: boolean, default: false }
  - { name: share,       type: boolean, default: false }
  - { name: graph_node,  type: boolean, default: true }
```

- [ ] **Step 5: Commit in PortfolioVault**

```bash
cd ~/repos/PortfolioVault
git add .obsidian/plugins/vault-cms/content-types/
git commit -m "feat: add VaultCMS content types mirroring portfolio zod schemas"
git push
```

### Task A19: Remove obsolete portfolio-side Obsidian scaffold

**Files:**
- Delete: `src/content/.obsidian/`
- Delete: `src/content/_bases/`
- Delete: `src/content/_GUIDE.md`
- Delete: `src/content/blog/coming-soon.md`

These were left over from the earlier "VaultCMS-in-repo" approach (spec §4.7 / Pre-Task conversation). External-canonical architecture makes them dead code.

- [ ] **Step 1: Confirm they are unused**

Run: `grep -r '_bases\|_GUIDE\|content/.obsidian\|coming-soon' src/ astro.config.ts package.json`
Expected: no matches (or only the blog glob in `src/content/config.ts` which already points at `vendor/vault`).

- [ ] **Step 2: Delete**

```bash
git rm -r src/content/.obsidian src/content/_bases src/content/_GUIDE.md src/content/blog
```

- [ ] **Step 3: Build**

Run: `pnpm build`
Expected: succeeds; `about` + fixture blog from `vendor/vault` drive content.

- [ ] **Step 4: Commit**

```bash
git commit -m "chore(content): remove obsolete in-repo VaultCMS scaffold (external-canonical)"
```

### Task A20: Update `docs/OBSIDIAN_INTEGRATION.md`

**Files:**
- Modify: `docs/OBSIDIAN_INTEGRATION.md`

- [ ] **Step 1: Replace the entire doc with the new three-repo workflow**

Open and replace content with:

```markdown
# Obsidian + PortfolioVault Integration

This portfolio uses a three-repo pipeline to author content in Obsidian while keeping the main personal vault fully private.

See `docs/superpowers/specs/2026-04-16-vaultcms-graph-sim-design.md` (§3, §4) for the full design rationale.

## Flow

1. Write blog posts in `~/repos/Obsidian/Blogs/`. Tablet edits propagate via Syncthing.
2. On laptop, run `pnpm publish-blog` from the portfolio repo. This:
   - rsyncs `Blogs/` and `References/Clippings/` from main vault into `~/repos/PortfolioVault/`.
   - Copies referenced `Attachments/` only.
   - Commits and pushes `PortfolioVault`.
   - Bumps the portfolio repo's `vendor/vault` submodule.
   - Commits and pushes portfolio.
3. GitHub Actions builds and deploys to GitHub Pages.

## Authoring portfolio content

Open `~/repos/PortfolioVault/` as a vault in Obsidian. VaultCMS wizard handles new Project / Role / Education / Gallery entries with enforced frontmatter. Use the existing templates under `Templates/`.

## Wikilinks

- `[[post-slug]]` to another blog post → internal link.
- `[[CompTIA Linux]]` to a Clipping → popover with excerpt + optional external source.
- Dead links log a warning at build time. Set `STRICT_WIKILINKS=1 pnpm build` to fail on dead links.

## Private clippings

Clippings default to `publish: false`, `share: false`. They never get public pages, are hidden from the graph (unless referenced), and show only the `preview:` excerpt inside popovers.

To publish a specific clipping publicly, set `publish: true` in its frontmatter.

## Setup checklist

See `docs/superpowers/plans/2026-04-16-subproject-a-content-pipeline.md` Phase 0 for first-time setup (PortfolioVault repo, LFS, SSH deploy key, Syncthing).
```

- [ ] **Step 2: Commit**

```bash
git add docs/OBSIDIAN_INTEGRATION.md
git commit -m "docs: replace Obsidian integration guide with three-repo workflow"
```

---

## Phase 11 — End-to-end verification

### Task A21: Full clean-build verification

- [ ] **Step 1: Clean install from scratch**

```bash
rm -rf node_modules dist vendor/vault
bash scripts/init-vault-submodule.sh
pnpm install --frozen-lockfile
pnpm test
pnpm build
```

Expected: tests all pass; build produces `dist/` with:
- `dist/rss.xml`
- `dist/sitemap-index.xml`
- `dist/robots.txt`
- `dist/blog/2026-04-16-fixture/index.html` (from fixture)
- `dist/graph.json` not yet (sub-project C); ignore

- [ ] **Step 2: Preview locally**

Run: `pnpm preview`
Open http://localhost:4321. Confirm:
- Home page renders unchanged.
- `/blog/2026-04-16-fixture` renders the fixture post; wikilink to itself works; nonexistent link rendered as plain text.
- RSS feed (`/rss.xml`) has the fixture post.

- [ ] **Step 3: Confirm CI passes on push**

```bash
git push
```

Watch GitHub Actions until the "Deploy to GitHub Pages" workflow completes green.

- [ ] **Step 4: Final commit if any fixes needed**

If any issues surfaced, fix inline, commit with message `fix: <what>`.

---

## Self-Review Checklist (author ran before handoff)

- **Spec coverage (§4.1–§4.8)**:
  - §4.1 sync script → Task A16
  - §4.2 submodule setup → Task A3
  - §4.3 Astro collections → Tasks A2, A9
  - §4.4 remark plugins → Tasks A4, A5, A6, A7, A8, A10
  - §4.5 VaultCMS content types → Task A18
  - §4.6 build + publish pipeline → Tasks A10, A15, A16
  - §4.7 GitHub Actions → Task A17
  - §4.8 RSS/sitemap/robots/Umami → Tasks A12, A13, A14
  - Cleanup → Tasks A19, A20
- **§10 decisions**: GitHub Actions (A17), LFS (Pre-Task 0.1, A3, A17), RSS (A12), sitemap+robots (A13), Umami (A14), clipping privacy defaults (A2 schema), leva/sim decisions belong to sub-project D.
- **Placeholder scan**: no TBD/TODO/fill-in-later remain.
- **Type consistency**: `WikilinkIndex`, `WikilinkTarget`, `WikilinkOptions`, `EmbedOptions`, `AdapterOptions`, `NotePopoverProps`, `BlogEntry` et al. all defined in their declaring file and used consistently across tasks.
- **File paths exact**: every `Create:` / `Modify:` header specifies the exact path. No `<…>` placeholders.
- **Commands tested**: each `Run:` command produces a defined expected output.

---

## Out of this plan (handled elsewhere)

- Portfolio data migration (JSON/TS → markdown) — sub-project B plan.
- Graph indexer + `/graph` page + per-page mini-graph — sub-project C plan.
- r3f simulation engine + sims + `/sim/[name]` pages — sub-project D plan.
- Main-vault privacy audit — user responsibility; documented in spec §9 risk register.
