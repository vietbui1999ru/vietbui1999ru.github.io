# Design: VaultCMS + Obsidian Pipeline, Graph View, and Math-Authentic Simulation Engine

**Date:** 2026-04-16
**Status:** Approved (brainstorm complete, awaiting plan)
**Scope:** One umbrella design covering four independently shippable sub-projects (A, B, C, D). Each sub-project gets its own implementation plan after this spec.

---

## 1. Motivation

Transform the portfolio site from a single-page static showcase into a content-driven system with:

- **Obsidian-native authoring** for blog posts and portfolio content, via VaultCMS running in a dedicated vault repository.
- **Privacy firewall** so the author's main personal vault (containing private notes, daily journal, tokens) never touches public CI.
- **Graph view** linking blog posts, projects, experience roles, education, gallery items, and saved clippings into a navigable knowledge map.
- **Math-authentic simulation engine** replacing the current single decorative shader. Numerical integration of ODEs and PDEs with configurable symmetry constraints, perf-tiered to avoid lagging visitors' machines.

---

## 2. Sub-Project Decomposition

| # | Sub-project | Depends on | Ships when |
|---|-------------|-----------|-----------|
| **A** | VaultCMS + content pipeline | — | `vendor/vault/` populated; blog renders from submodule |
| **B** | Portfolio data migration (JSON/TS → markdown) | A | Projects/Experience/Education/Gallery/About render from markdown collections |
| **C** | Graph view (r3f) + `/graph` page + per-page mini-graph | A, B | `/graph` live; mini-graph widget on post/project pages |
| **D** | Simulation engine + 4 new sims (Magnetic, Lorenz, Gray-Scott, Kuramoto-Sivashinsky) + Singularity port from `react-shaders` to r3f | — | Engine + sims + `/sim/[name]` playgrounds live; Home hero renders ported Singularity (Magnetic swap later) |

A and D run in parallel (no shared files). B starts after A is merged. C starts after B is merged.

---

## 3. Repository Topology

```
~/repos/Obsidian/                    PRIVATE — canonical writing surface
  Blogs/                             author writes here (tablet + laptop via Syncthing)
  References/Clippings/
  Attachments/
  Daily/ Trackers/ Tokens.md ...     NEVER synced outward
                 │
                 │ sync-to-portfolio.sh (rsync, one-way, laptop-only)
                 │ filters: *.sync-conflict-*, .obsidian/workspace*,
                 │          .stfolder, .stversions, .trash
                 ▼
~/repos/PortfolioVault/              PUBLIC-ready, clean history
  .obsidian/plugins/vault-cms/       VaultCMS wizard lives here
  Portfolio/                         authored natively in this vault
    Projects/*.md
    Experience/*.md                  one file per role (E2)
    Experience/Companies/*.md        stubs (R2, graph_node: false)
    Education/*.md
    Gallery/*.md
    About.md
  Blogs/                             rsynced from main vault
  References/Clippings/              rsynced from main vault
  Attachments/                       rsynced (referenced assets only)
  Templates/                         VaultCMS content types
                 │
                 │ git submodule + sparse-checkout
                 │ Astro content loaders point into vendor/vault
                 ▼
<portfolio>/                         this repo
  vendor/vault/                      submodule → PortfolioVault
  src/content/config.ts              registers 7 collections
  src/scenes/                        NEW — r3f sim engine
  src/graph/                         NEW — graph view + mini-graph
  src/components/sections/*          bind to content collections
```

**Privacy boundaries:**

| Boundary | What crosses | What doesn't |
|----------|-------------|--------------|
| Main Obsidian → PortfolioVault | Blog files matching `.stignore` whitelist; referenced attachments | Personal notes, Daily/, Tokens.md, Trackers/ |
| PortfolioVault → Astro CI | Full PortfolioVault tree (public-safe by construction) | Zero access to main vault |
| Clippings → public site | Frontmatter `preview` field only (popover excerpt) | Full clipping body stays private unless `publish: true` |

Defaults: `publish: false`, `share: false` on every clipping. Public exposure is opt-in per clipping.

---

## 4. Sub-Project A — Content Pipeline

### 4.1 Sync script

`scripts/sync-to-portfolio.sh` (lives in main Obsidian repo):

```bash
#!/usr/bin/env bash
set -euo pipefail
MAIN=~/repos/Obsidian
PV=~/repos/PortfolioVault

rsync -av --delete \
  --exclude='.obsidian/workspace*' \
  --exclude='.stfolder' --exclude='.stversions/' \
  --exclude='*.sync-conflict-*' \
  --exclude='.trash/' --exclude='.DS_Store' \
  "$MAIN/Blogs/" "$PV/Blogs/"

rsync -av --delete \
  --exclude='.DS_Store' \
  "$MAIN/References/Clippings/" "$PV/References/Clippings/"

node scripts/sync-attachments.mjs "$MAIN/Attachments" "$PV/Attachments"

echo "sync done. review: cd $PV && git status"
```

`sync-attachments.mjs` scans `Blogs/` and `References/Clippings/` markdown bodies for `![[...]]` references and copies only referenced assets. Prunes unreferenced entries from `$PV/Attachments/`.

### 4.2 Submodule setup

In the portfolio repo, one-time:

```bash
git submodule add git@github.com:vietbui1999ru/PortfolioVault.git vendor/vault
cd vendor/vault
git sparse-checkout init --cone
git sparse-checkout set Blogs Portfolio References/Clippings Attachments
git lfs install && git lfs pull
```

Vault `.gitattributes`:

```
Attachments/**/*.png  filter=lfs diff=lfs merge=lfs -text
Attachments/**/*.jpg  filter=lfs diff=lfs merge=lfs -text
Attachments/**/*.pdf  filter=lfs diff=lfs merge=lfs -text
Attachments/**/*.excalidraw.md  filter=lfs diff=lfs merge=lfs -text
```

### 4.3 Astro content collections

`src/content/config.ts` registers seven collections, all loading from `vendor/vault`:

```ts
import { defineCollection, z } from 'astro:content'
import { glob } from 'astro/loaders'

const BASE = './vendor/vault'

const blogSchema = z.object({
  title: z.string(),
  description: z.string(),
  date: z.coerce.date(),
  draft: z.boolean().default(false),
  tags: z.array(z.string()).optional(),
  cover: z.string().optional(),
  updated: z.coerce.date().optional(),
  series: z.string().optional(),
  preview: z.string().optional(),
  audience: z.array(z.enum(['dev','student','general'])).optional(),
  topics: z.array(z.string()).optional(),
})

const roleSchema = z.object({
  role: z.string(),
  company: z.string(),
  company_url: z.string().url().optional(),
  date_start: z.coerce.date(),
  date_end: z.coerce.date().nullable().optional(),
  tags: z.array(z.string()).optional(),
  summary: z.string(),
  graph_node: z.boolean().default(true),
})

const companySchema = z.object({
  name: z.string(),
  url: z.string().url().optional(),
  logo: z.string().optional(),
  graph_node: z.boolean().default(false),
})

const projectSchema = z.object({
  title: z.string(),
  summary: z.string(),
  date: z.coerce.date(),
  tags: z.array(z.string()).optional(),
  badges: z.array(z.string()).optional(),
  images: z.array(z.string()).optional(),
  cover: z.string().optional(),
  links: z.array(z.object({ icon: z.string(), url: z.string().url() })).optional(),
  status: z.enum(['active','shipped','archived']).default('shipped'),
  graph_node: z.boolean().default(true),
})

const educationSchema = z.object({
  institution: z.string(),
  degree: z.string(),
  field: z.string().optional(),
  date_start: z.coerce.date(),
  date_end: z.coerce.date().nullable().optional(),
  tags: z.array(z.string()).optional(),
  summary: z.string(),
  graph_node: z.boolean().default(true),
})

const gallerySchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  date: z.coerce.date(),
  image: z.string(),
  tags: z.array(z.string()).optional(),
  graph_node: z.boolean().default(true),
})

const clippingSchema = z.object({
  title: z.string(),
  source: z.string().url().optional(),
  preview: z.string().optional(),
  tags: z.array(z.string()).optional(),
  publish: z.boolean().default(false),
  share: z.boolean().default(false),
  graph_node: z.boolean().default(true),
})

const aboutSchema = z.object({
  title: z.string(),
  tagline: z.string(),
})

export const collections = {
  blog:      defineCollection({ loader: glob({ pattern: 'Blogs/**/*.md',                      base: BASE }), schema: blogSchema }),
  projects:  defineCollection({ loader: glob({ pattern: 'Portfolio/Projects/**/*.md',          base: BASE }), schema: projectSchema }),
  roles:     defineCollection({ loader: glob({ pattern: 'Portfolio/Experience/*.md',           base: BASE }), schema: roleSchema }),
  companies: defineCollection({ loader: glob({ pattern: 'Portfolio/Experience/Companies/*.md', base: BASE }), schema: companySchema }),
  education: defineCollection({ loader: glob({ pattern: 'Portfolio/Education/**/*.md',         base: BASE }), schema: educationSchema }),
  gallery:   defineCollection({ loader: glob({ pattern: 'Portfolio/Gallery/**/*.md',           base: BASE }), schema: gallerySchema }),
  clippings: defineCollection({ loader: glob({ pattern: 'References/Clippings/**/*.md',        base: BASE }), schema: clippingSchema }),
  about:     defineCollection({ loader: glob({ pattern: 'Portfolio/About.md',                  base: BASE }), schema: aboutSchema }),
}
```

### 4.4 Remark plugins

Three build-time plugins, registered in `astro.config.ts`:

- `remark-wikilinks.ts` — resolves `[[slug]]` and `[[slug|alias]]`:
  - Match against blog/projects/roles/education/gallery/clippings collection IDs.
  - Internal post → `<a href="/<kind>/<slug>">alias</a>`.
  - Clipping with `publish: true` → standalone `/notes/<slug>` page.
  - Clipping with `publish: false` → inline `<NotePopover preview source>alias</NotePopover>` (C3).
  - Dead link (target in no collection) → `console.warn` + render plain alias text. Strict mode flag fails build.

- `remark-embeds.ts` — resolves `![[file]]`:
  - Images → copy to `public/blog-assets/<post-slug>/<file>` + rewrite `src`.
  - `.excalidraw.md` → run obsidian-export SVG render as pre-build step, cache by content hash, embed inline SVG.

- `remark-preview.ts` — computes `preview` field if missing from frontmatter. Extracts first paragraph after stripping headings. Used for card subtitles and popover text.

### 4.5 VaultCMS content types

Mirror zod schemas in `~/repos/PortfolioVault/.obsidian/plugins/vault-cms/content-types/`:

```
content-types/
  blog-post.yaml
  project.yaml
  role.yaml
  company.yaml
  education.yaml
  gallery-item.yaml
  clipping.yaml
```

Required fields enforced by VaultCMS wizard at write time. Tag autocomplete draws from existing tags across all content types.

### 4.6 Build + publish pipeline

Scripts in portfolio repo `package.json`:

```json
{
  "scripts": {
    "dev":          "astro dev",
    "build":        "astro build",
    "preview":      "astro preview",
    "publish-blog": "bash scripts/publish-blog.sh",
    "sync-graph":   "tsx scripts/build-graph-index.ts"
  }
}
```

`scripts/publish-blog.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail
MAIN=~/repos/Obsidian
PV=~/repos/PortfolioVault

( cd "$MAIN" && git status --short )
bash "$MAIN/scripts/sync-to-portfolio.sh"

( cd "$PV" && git add -A && git diff --staged --quiet || git commit -m "content: sync from main vault $(date +%F)" )
( cd "$PV" && git push )

git submodule update --remote vendor/vault
git add vendor/vault
git commit -m "content: bump vault $(cd vendor/vault && git rev-parse --short HEAD)"
git push
```

Build pipeline order:
1. `git submodule update --init --recursive`
2. `git lfs pull` (both portfolio and vendor/vault)
3. `pnpm install`
4. excalidraw-to-svg pre-step (cached)
5. graph indexer (`tsx scripts/build-graph-index.ts` → `public/graph.json`)
6. `astro build` (remark plugins run here)

### 4.7 CI — GitHub Actions

`.github/workflows/deploy.yml`:

- Trigger: push to `main` in portfolio repo.
- Steps: checkout with `submodules: recursive` + `lfs: true`, setup Node + pnpm, install, build, deploy to GitHub Pages.
- Secret: SSH deploy key for `PortfolioVault` submodule read access.
- `PortfolioVault` stays public or uses deploy-key-auth private repo; either works.

### 4.8 Additional integrations

- **RSS**: `@astrojs/rss` over `blog` collection. Route: `/rss.xml`.
- **Sitemap**: `@astrojs/sitemap`. Route: `/sitemap-index.xml`.
- **Robots**: static `public/robots.txt` pointing at sitemap.
- **Analytics**: Umami script injected in `BaseLayout`, env-gated (`PUBLIC_UMAMI_SRC`, `PUBLIC_UMAMI_ID`).

---

## 5. Sub-Project B — Portfolio Data Migration

### 5.1 Scope

Migrates narrative portfolio content from `src/data/*.json` + `src/data/*.ts` into markdown notes under `~/repos/PortfolioVault/Portfolio/`.

**Migrates:**
- `projects.json` + `projectsData.ts` → `Portfolio/Projects/<slug>.md` (one per project)
- `experience.json` + `experienceData.ts` → `Portfolio/Experience/<slug>.md` (E2: one per role) + `Portfolio/Experience/Companies/<slug>.md` (R2: one per company)
- `educationData.ts` → `Portfolio/Education/<slug>.md`
- `gallery.json` + `galleryData.ts` → `Portfolio/Gallery/<slug>.md`
- `aboutData.ts` → `Portfolio/About.md` (title + tagline in frontmatter; 4 paragraphs as body)

**Stays as code:**
- `homeData.ts` (shader tuning constants, gradients, taglines)
- `navigationData.ts` (routing config)
- `skillIcons.json` + `skillIcons.ts` (icon registry)
- `skillsData.json` (skill taxonomy — structured, frequently updated, benefits from typed enum)
- `contactData.ts` + `contact.json` (small contact links)
- `src/imports/*.ts` (SVG path data for icons/logos)

### 5.2 Migration order

Each step independently testable:

1. **About** — smoke test collection path with trivial content.
2. **Projects** — validates list pattern.
3. **Experience** — E2 + R2 is the most complex shape.
4. **Education** — mirrors Projects.
5. **Gallery** — validates attachment pipeline (image assets).

### 5.3 Migration script

`scripts/migrate-data-to-vault.ts`:

- Flags: `--kind <projects|experience|education|gallery|about|all>`, `--dry-run`, `--force`, `--vault-path <path>`.
- Reads source JSON/TS via dynamic import.
- Generates kebab-case slug from title/role.
- Writes YAML frontmatter (zod-valid) + narrative body.
- Idempotent: skips existing files unless `--force`.
- Exits non-zero on any schema validation failure.
- Prints summary table of created/skipped/failed entries.

### 5.4 Example: role markdown (E2)

`Portfolio/Experience/gitlab-oss-contributor.md`:

```markdown
---
role: GitLab Community-Edition Open-Source Contributor
company: GitLab - CodePath
company_url: https://gitlab.com
date_start: 2026-02-01
date_end: null
tags: [gitlab, codepath, ruby, git, golang, ansible, terraform, cicd, llm]
summary: Mentored by GitLab + CodePath senior devs, contributing to GitLab CE codebase + docs.
---

Currently volunteering and being mentored by GitLab and CodePath experienced Developers to help contribute to the open-source codebase of GitLab Community-Edition. Working on the GitLab Community-Edition's documentation, and contributing to the GitLab Community-Edition's codebase.
```

Corresponding company stub `Portfolio/Experience/Companies/gitlab-codepath.md`:

```markdown
---
name: GitLab - CodePath
url: https://gitlab.com
graph_node: false
---
```

### 5.5 Section component refactor

- `Experience.tsx`: `getCollection('roles')` + `getCollection('companies')`; groups roles by `company` field; sorts roles desc by `date_start`; companies ordered by most-recent role.
- `Projects.tsx`, `Education.tsx`, `Gallery.tsx`: `getCollection('<kind>')` + sort + render.
- `About.tsx`: `getEntry('about', 'About')`; body via Astro `<Content />`.
- Section anchor IDs (`#home`, `#about`, `#projects`, ...) preserved — homepage single-page flow unchanged.

### 5.6 Cleanup

After migration verified:
- Delete `src/data/projects.json`, `projectsData.ts`, `experience.json`, `experienceData.ts`, `educationData.ts`, `gallery.json`, `galleryData.ts`, `aboutData.ts`.
- Delete `src/content/.obsidian/`, `src/content/_bases/`, `src/content/_GUIDE.md` (obsolete VaultCMS-in-repo scaffold).
- Delete `src/content/blog/coming-soon.md` (replaced by vault Blogs).

---

## 6. Sub-Project C — Graph View

### 6.1 Graph data pipeline

`scripts/build-graph-index.ts` (build-time pre-step):

- Reads all 7 collections via Astro content loader.
- Extracts nodes + edges:

```ts
type Node = {
  id: string                 // '<kind>/<slug>'
  kind: 'blog'|'project'|'role'|'education'|'gallery'|'clipping'
  title: string
  tags: string[]
  date?: string              // ISO
  url: string                // routing target
  preview?: string           // for popover
}

type Edge = {
  source: string
  target: string
  type: 'wikilink'|'shared-tag'|'manual'
  weight: number
  tag?: string               // for shared-tag edges
}
```

**Edge rules:**

- `wikilink` (directed, weight 1): parsed from markdown bodies via regex + frontmatter validation.
- `shared-tag` (undirected, weight = count of shared tags): emitted between every pair sharing ≥1 tag. Pruned below minimum weight threshold (default 2) to avoid hairballs.
- `manual` (directed, weight 2): `related: [[x], [y]]` frontmatter field.
- Edges to nodes with `graph_node: false` (companies per R2) omitted from final `graph.json`.

**Node exclusion:**

- `graph_node: false`.
- `draft: true` blog posts.
- Clippings with `publish: false` AND `share: false` AND no inbound wikilink from another node.
- Inbound wikilink forces clipping inclusion as a titleless opaque node (id `clipping-<hash>`) so edges don't dangle.

Output: `public/graph.json` (committed to repo for static serving; regenerated every build).

### 6.2 r3f engine

Directory layout:

```
src/graph/
  engine/
    GraphScene.tsx         r3f subtree, 2D ortho camera
    forceSimulation.ts     bridge to worker
    workerBridge.ts        postMessage protocol + types
    graph.worker.ts        d3-force tick loop
  render/
    Nodes.tsx              InstancedMesh — shape by kind
    Edges.tsx              LineSegments, alpha = weight
    Labels.tsx             drei <Html> overlay, LOD by zoom
    Highlight.tsx          hover → 1-hop neighborhood glow
    Shapes.ts              node shape geometry by kind
    Colors.ts              tag-cluster k-means at build time
  ui/
    GraphControls.tsx      filters, search, legend
    NodePopover.tsx        hover preview (shares C3 popover component)
    MiniGraph.tsx          embedded subgraph for post/project pages
```

### 6.3 Rendering strategy

- **Scene**: 2D orthographic camera within app-wide r3f Canvas (shared with D).
- **Nodes**: single `InstancedMesh` per shape kind (circle, diamond, hex, triangle, square, pill). Node size by inbound degree. Color by dominant tag cluster.
- **Edges**: `LineSegments` geometry, batched. Alpha proportional to normalized weight.
- **Labels**: drei `<Html>` overlay. Visible only when zoom level ≥ threshold. On full `/graph` page, labels appear for nodes within viewport bounds.
- **Hover**: 1-hop neighborhood brightens, other nodes/edges dim to 15% alpha. `NodePopover` renders title + preview + tags near cursor.
- **Click**: navigate to node's `url`.

### 6.4 Force simulation

d3-force in a dedicated web worker:

- Forces: `forceManyBody` (repulsion), `forceLink` (spring, link distance = edge weight), `forceCenter`, `forceCollide` (prevent node overlap).
- Optional tag-cluster force: nodes sharing dominant tag receive weak attraction.
- 300 ticks at mount, alpha decays to 0, then static.
- User drag re-heats alpha to 0.3.
- Worker isolates compute from render thread.

### 6.5 `/graph` page

Route `src/pages/graph.astro`:

- Full-viewport r3f Canvas.
- Left panel: kind checkboxes, tag multi-select, date range, search.
- Search: fuzzy match on title; selecting a result pans camera to node + triggers focus highlight.
- URL state: `/graph?tags=ruby,python&kinds=blog,project&focus=<id>`.
- Legend in corner: shape ↔ kind, color ↔ tag cluster.

### 6.6 Per-page mini-graph

`MiniGraph.tsx` component embedded on post/project/role/education/gallery detail pages:

- Renders current node + 1-hop neighbors (cap 15 nodes).
- Pre-computed static layout from build-time index (avoids worker round-trip for small views).
- Click any node → navigate to full `/graph?focus=<id>`.

### 6.7 Privacy guarantees

- Clippings with both `publish: false` AND `share: false` appear (if at all) as titleless opaque nodes. Popover shows nothing. No URL exposed.
- Private clippings excluded entirely from `graph.json` when they have no inbound wikilink.

---

## 7. Sub-Project D — Simulation Engine

### 7.1 Architecture

**D2 (single app-wide canvas)**. One `<Canvas>` mounted in `BaseLayout`:

- Scene registry maps route patterns and scroll slots to scene IDs.
- `SceneRouter` subscribes to route changes + `IntersectionObserver` events; activates/deactivates scenes.
- Shared camera, post-processing stack, GPU compute context.
- Scene switch = crossfade transition (~300ms) or instant cut (config per scene).

### 7.2 Directory layout

```
src/scenes/
  engine/
    Canvas.tsx             app-wide <Canvas> root
    SceneRegistry.ts       Map<SceneId, SceneModule>
    SceneRouter.tsx        intersection + route → activeScene
    PerfController.ts      GPU-tier detect, adaptive substep/grid
    Presets.ts             load/save/export JSON presets
    UrlState.ts            leva schema ⇄ URL hash
    Symmetry.ts            constrained-IC generators (C_n, D_n)
  solvers/
    rk4.ts                 classical 4-stage explicit
    verlet.ts              velocity-Verlet (symplectic)
    etdrk4.ts              exponential time differencing RK4
    fft.ts                 GPU 1D + 2D real FFT (ping-pong)
    gpuCompute.ts          GPUComputationRenderer wrapper
  sims/
    singularity/           existing shader, ported to r3f ShaderMaterial
    magnetic/              4-point field + Lorentz force on particles
    lorenz/                3 ODE, trailed particles
    grayScott/             2D reaction-diffusion, GPU ping-pong
    kuramotoSivashinsky/   1D PDE (stretch: 2D), ETDRK4 pseudospectral
  ui/
    LevaPanel.tsx          collapsible bottom-right, keyboard `L` toggle
    PresetMenu.tsx         load/save/share presets
    HelpOverlay.tsx        press `?` — math summary per sim
```

### 7.3 Sim contract

```ts
interface Sim<Config = unknown, State = unknown> {
  id: string
  title: string
  description: string                                  // rendered in HelpOverlay
  defaults: Config
  presets: Record<string, Partial<Config>>
  schema: LevaSchema
  Scene: React.FC<{
    config: Config
    perf: 'low'|'mid'|'high'
    symmetry: SymmetryConfig
  }>
  init(config: Config, perf: PerfTier): State
  step(state: State, dt: number): void
  dispose(state: State): void
  symmetryApplies(type: 'C'|'D'|'none', order: number): boolean
}

type SymmetryConfig = { type: 'none'|'C'|'D'; order: number }
```

### 7.4 Symmetry — constrained initial conditions

Per-sim IC generators enforce symmetry at state initialization:

- **Lorenz**: N particles placed on `C_n` ring near unstable fixed point; chaos breaks symmetry visibly over simulated time.
- **Magnetic**: field sources replicated in `C_n` or `D_n` arrangement; particles seeded on symmetric radii.
- **Gray-Scott**: initial V-perturbation mask generated as `C_n`/`D_n`-symmetric pattern; pattern-formation preserves symmetry absent noise.
- **Kuramoto-Sivashinsky**: IC as symmetric sum of Fourier modes compatible with requested group.

Sliders expose `order` (1–12) and `type` (C/D/none). Per-sim `symmetryApplies()` disables invalid combos in leva.

### 7.5 Per-sim details

#### Magnetic field

- **Physics**: particles in multi-pole magnetic field. Lorentz force `F = qv × B`. Velocity-Verlet integration (symplectic → long-run stable).
- **Compute**: CPU for `particleCount ≤ 2000`; GPU (position/velocity in RGBA32F textures updated by fragment shader) for more.
- **Config**: `sources[]` (position + magnetic moment), `particleCount`, `mass`, `charge`, `B0`, `dt`, `trailLength`, `symmetry`.
- **Presets**: `dipole`, `quadrupole`, `hexapole`, `ring-trap`, `tokamak-2d`.
- **Visual**: glowing trails, optional field-line contour overlay (LIC).

#### Lorenz attractor

- **Physics**: `dx/dt = σ(y-x)`, `dy/dt = x(ρ-z)-y`, `dz/dt = xy-βz`.
- **Compute**: CPU RK4; N trailed particles (default 500).
- **Config**: `sigma=10, rho=28, beta=8/3, particleCount=500, dt=0.005, trailLength=800, symmetry`.
- **Presets**: `classic σ=10 ρ=28 β=8/3`, `periodic ρ=99.96`, `double-scroll`.
- **Visual**: colored trails (speed colormap), depth fade, optional 3D camera orbit.

#### Gray-Scott reaction-diffusion

- **Physics**: `∂U/∂t = Du∇²U - UV² + F(1-U)`, `∂V/∂t = Dv∇²V + UV² - (F+k)V`.
- **Compute**: GPU ping-pong, 2D fragment shader, Laplacian via 3×3 convolution, `substeps=4` per frame.
- **Config**: `F, k, Du=0.16, Dv=0.08, gridSize, symmetry, substeps`.
- **Presets**: `spots F=0.03 k=0.062`, `stripes F=0.025 k=0.055`, `maze F=0.029 k=0.057`, `spiral F=0.014 k=0.054`, `coral F=0.062 k=0.062`.
- **Visual**: texture-mapped plane, selectable colormap (viridis/magma/grayscale/custom).

#### Kuramoto-Sivashinsky

- **Physics**: `∂u/∂t + u∂u/∂x + ∂²u/∂x² + ν∂⁴u/∂x⁴ = 0` (1D first; 2D variant as stretch goal).
- **Compute**: pseudo-spectral — FFT of `u`, linear term integrated in Fourier space via ETDRK4 (stiff-aware), nonlinear `uu_x` computed in real space. GPU FFT via ping-pong.
- **Config**: `L (domain length), N (Fourier modes), nu=1.0, dt=0.05, symmetry`.
- **Presets**: `classic L=32π N=512`, `turbulent L=200`, `quasi-periodic L=18π`.
- **Visual**: space-time plot (x-axis = space, y-axis = scrolling time) for 1D; heightfield for 2D variant.

#### Singularity (ported)

- Existing fragment shader ported from `react-shaders` to r3f `ShaderMaterial`.
- Used as home-page hero default initially (keep current aesthetic during D rollout).
- Config-exposed uniforms match current `Home.tsx` scroll-driven values.
- Magnetic becomes home default after its polish phase.

### 7.6 Perf plan

1. **GPU-tier detect** (`detect-gpu`) → `low`/`mid`/`high` preset at boot.
2. **Pause-on-offscreen** — `IntersectionObserver` halts scene when section out of viewport.
3. **Pause-on-blur** — `document.visibilitychange` pauses canvas.
4. **Code-split per sim** — dynamic `import()` when section scrolls near.
5. **Adaptive grid / particle count**:
   - `low`: RD 128², KS 256 pts, Lorenz 100 particles, Magnetic 500 particles.
   - `mid`: RD 256², KS 512 pts, Lorenz 500, Magnetic 2000.
   - `high`: RD 384², KS 1024 pts, Lorenz 2000, Magnetic 10000.
6. **All 2D PDEs stay on GPU** via fragment-shader ping-pong. Never touch CPU.
7. **`RGBA16F` fallback** when `EXT_color_buffer_float` unavailable.
8. **Fixed dt substepping** — never shrink below stability threshold; drop substeps if frame budget blown. Target 60fps, min 30fps.
9. **`prefers-reduced-motion: reduce`** → static snapshot per sim, no compute loop.
10. **leva rerenders gated** with `startTransition`; URL hash writes debounced.
11. **LCP guard** — sims wait until `document.readyState === 'complete'` + first idle frame.
12. **Texture pool** — unused textures disposed on scene switch; capped count.

Per-sim mid-tier budget estimate:

| Sim | Compute/frame | Notes |
|-----|--------------|-------|
| Magnetic (GPU particles 2k) | ~0.8ms | |
| Lorenz (CPU 500 trails) | ~0.3ms | |
| Gray-Scott (GPU 256² × 4 sub) | ~1.2ms | |
| Kuramoto-Sivashinsky (GPU 512 pts × 4 sub ETDRK4) | ~1.5ms | |
| Rendering overhead (shared) | ~2–3ms | |
| **Total active (1 sim)** | **~4–5ms** | 11ms headroom at 60fps |

Low tier halves every budget. Safe on older iGPUs and mobile.

### 7.7 Leva integration

- Mounted globally; schema composes from active scene.
- Keyboard `L` toggles visibility.
- Hidden by default on mobile (viewport width < 768px).
- Folders: `Solver` / `Physics` / `Visuals` / `Symmetry` / `Presets`.
- URL hash sync: reading sim state from URL on mount; writing on change (debounced).
- Dev-only "Export preset" button copies current config as JSON to clipboard.

### 7.8 `/sim/[name]` playground pages

One route per sim. Shipped as part of sub-project D:

- Full-viewport Canvas (not shared with section scene).
- Leva panel expanded by default.
- Math description in collapsible help overlay (`?` keyboard).
- "Share this config" button → copies current URL.
- Preset menu.
- Linked from each section when relevant (e.g. About section mentions simulation interest, links to `/sim/lorenz`).

---

## 8. Testing & Verification

### 8.1 Sub-project A

- **Unit**: zod schemas reject malformed frontmatter (fixtures in `tests/fixtures/vault/`).
- **Unit**: remark-wikilinks resolves internal/clipping/dead correctly (snapshot tests).
- **Unit**: remark-embeds copies assets + rewrites paths; excalidraw SVG cache hit on unchanged content.
- **Integration**: clean-checkout `pnpm build` matches pre-migration `dist/` (hash-compare) before any collection replaces JSON data.
- **Smoke**: rsync filter invariants — no `.sync-conflict-*`, `.stfolder`, `.obsidian/workspace*` reach PortfolioVault.
- **Manual**: publish ritual end-to-end.

### 8.2 Sub-project B

- **Per-entry HTML snapshot diff**: rendered output pre- vs post-migration byte-compared (expected minimal differences: whitespace, semantic upgrades).
- **Zod validation**: migration script exits non-zero on any invalid frontmatter.
- **Idempotence**: second run without `--force` is a no-op.
- **Component tests**: `Experience.tsx` correctly groups multiple roles under one company.

### 8.3 Sub-project C

- **Unit**: graph indexer — wikilink regex, shared-tag extraction, dedup, directed/undirected handling.
- **Unit**: node exclusion — companies, drafts, private clippings filtered.
- **Unit**: web worker postMessage contract.
- **Perf**: `/graph` with 200-node fixture holds 60fps on mid tier.
- **Perf**: mini-graph renders < 16ms initial paint.
- **E2E**: URL filter state round-trips correctly.

### 8.4 Sub-project D

- **Solver correctness**:
  - rk4 vs analytic harmonic oscillator (energy drift bound).
  - verlet symplectic drift check over 10⁶ steps.
  - etdrk4 vs reference KS solution benchmark.
- **Sim behavior**:
  - Lorenz Lyapunov exponent within tolerance.
  - Gray-Scott pattern regime matches preset F/k.
  - KS energy bounded over long runs.
- **Perf**: per-sim frame budget at mid tier confirmed via profiler.
- **Offscreen pause**: IntersectionObserver halts compute (CPU profile verification).
- **Leva round-trip**: config JSON → leva → JSON is identity.
- **GPU fallback**: `RGBA16F` path produces visually acceptable result.
- **Visual regression**: per-sim screenshot at fixed seed + step count.

---

## 9. Risk Register

| Risk | Severity | Mitigation |
|------|---------|-----------|
| Main vault sync loss → blog history stranded | High | rsync one-way (main → PV); main stays canonical; PV commits reconstructable |
| rsync `--delete` wipes PV-native content | High | Paths scoped per `rsync` call; `Portfolio/` never an rsync target |
| Sync-conflict file silently published | Med | `.stignore` + astro content glob exclude + CI warn step |
| Submodule detached HEAD confusion | Med | `publish-blog` script fully automates bump |
| Wikilink dead-link flood during partial sparse checkout | Med | warn-only by default; `--strict` flag for CI-fail when needed |
| Excalidraw CLI slow on cold build | Low | cache SVGs by content hash in `node_modules/.cache/excalidraw/` |
| Graph worker blocks main on huge graphs | Low | worker isolated; edge weight threshold + LOD collapse shared-tag edges below threshold |
| r3f WebGL context loss (`max contexts` browser limit) | Med | single app-wide canvas architecture (D2) keeps count at 1 |
| Shader compile failure on old iGPU | Med | precompile on init, catch, fall back to static scene placeholder |
| KS ETDRK4 instability at extreme params | Med | clamp sliders to tested stable ranges; restart button |
| Leva in prod exposes interaction target for scrapers | Low | mount lazily on intent; hidden on mobile |
| Graph privacy leak via clipping title | Med | private clippings appear (if at all) as opaque titleless nodes |
| Vault repo LFS quota exceeded | Low | monitor; prune unused attachments via `sync-attachments.mjs` |

---

## 10. Open Decisions Resolved

| # | Decision | Chosen |
|---|----------|--------|
| 1 | CI provider | GitHub Actions + GitHub Pages |
| 2 | LFS for vault | Enabled (PNG, JPG, PDF, excalidraw) |
| 3 | Blog RSS feed | `@astrojs/rss` |
| 4 | Sitemap + robots | `@astrojs/sitemap` + static `robots.txt` |
| 5 | Analytics | Umami |
| 6 | Clipping privacy default | `publish: false`, `share: false` |
| 7 | Leva keyboard toggle | `L` |
| 8 | Home default sim | Singularity first, Magnetic after polish |
| 9 | `/sim/[name]` playground pages | Ship as part of sub-project D |

---

## 11. Out of Scope

- 3D graph variant (`react-force-graph-3d`) — future consideration.
- WebGPU migration — current design targets WebGL2; WebGPU is future optimization.
- Server-side rendering of graph — static JSON + client r3f suffices; SSR of Canvas unnecessary.
- Admin dashboard for non-Obsidian authoring — VaultCMS wizard covers this need.
- Comment system on blog posts — future consideration.
- Full-text search across content — future (Pagefind likely candidate).
- 2D Kuramoto-Sivashinsky variant — stretch goal within sub-project D, deferred if time-boxed.
- Migrating remaining decorative sections (Experience timeline flow, Contact warp, etc.) — future sim scenes after moderate scope ships.

---

## 12. Next Steps

After this spec is reviewed and approved by the author:

1. Invoke `writing-plans` skill to create detailed implementation plan for **sub-project A** (content pipeline) — the only unblocked starting point besides D.
2. Sub-project D plan follows in parallel.
3. Sub-project B plan after A merges.
4. Sub-project C plan after B merges.

Each plan will decompose into specific file-level tasks with acceptance criteria, test strategy, and rollback path.
