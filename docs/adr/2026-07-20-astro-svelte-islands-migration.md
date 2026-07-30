# ADR 001: Migrate portfolio UI from React islands to Svelte islands (keep Astro)

- **Status:** Accepted
- **Date:** 2026-07-20
- **Deciders:** vietbui1999ru

## Context

The portfolio is Astro 5 (static SSG) with React 19 hydrated islands
(`@astrojs/react`). We want to re-invent the landing-site frontend with a new
minimalist "paper-and-ink" design system and, at the same time, move away from
React as the UI authoring framework.

Constraints identified during exploration:

- The **content backend must be preserved**: Obsidian vault git submodule
  (`vendor/vault`) as CMS, Astro content collections with zod schemas
  (`blog`, `blog-variants`, `gallery`, `projects`), the custom remark pipeline
  (`src/lib/remark/`: wikilinks, embeds/Excalidraw, preview, callouts, KaTeX),
  and build scripts (`scripts/copy-vault-images.ts`, gallery pre-copy in
  `astro.config.ts`).
- The **sim engine** (`src/scenes/`, ~2.9k LoC + ~2k LoC tests) is built on
  react-three-fiber and is the largest React coupling in the repo.
- The **portfolio UI** (`src/components/`, ~5.8k LoC React, shadcn/ui,
  framer-motion, GSAP) is being discarded and redesigned anyway.
- Deployment is fully static (Vercel/Netlify/GH Pages).

## Options considered

| Option | Description                                                                                                       | Verdict                                                                                                                                                                                                        |
| ------ | ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A      | Stay Astro + React, redesign only                                                                                 | Rejected — keeps React, which we want to leave                                                                                                                                                                 |
| **B**  | **Astro + `@astrojs/svelte` islands; rewrite UI in Svelte incrementally; sim engine stays React islands for now** | **Accepted**                                                                                                                                                                                                   |
| C      | Full SvelteKit rewrite                                                                                            | Rejected — requires rebuilding content collections (loses zod-typed `astro:content` layer), porting the sim engine to Threlte now, and offers no shipped-JS advantage over Astro SSG for a static content site |

## Decision

Adopt **Option B: Astro with mixed-framework islands, Svelte for the portfolio
UI**.

Astro natively hydrates multiple frameworks side-by-side, so:

1. The content pipeline, vault CMS, scripts, and tests are untouched.
2. Portfolio UI components are rewritten one section at a time in Svelte;
   React equivalents are deleted as each section lands.
3. The r3f sim engine and `@giscus/react` remain React islands until a later,
   separate decision (possible Threlte port to drop React entirely).
4. Design tokens live in Tailwind 4 `@theme` / CSS variables in
   `src/styles/global.css`, framework-agnostic by construction.

## Consequences

**Positive**

- Svelte authoring experience and smaller per-island bundles for the UI,
  without touching the content backend.
- Incremental, reversible migration (per-component, not big-bang).
- Zero-JS-by-default output preserved; static deploy config unchanged.

**Negative / deferred**

- Repo temporarily runs three UI runtimes: Astro + Svelte + React (sims,
  Giscus). Acceptable during transition.
- shadcn/ui components must be re-authored in Svelte (design is changing
  anyway, so this is not wasted work).
- React removal is incomplete until the sim engine decision is revisited.

**Follow-ups**

- [x] Phase 1: design artifact (`design/index.html`) — tokens, typography,
  shimmer animation, component styles.
- [x] Phase 2: tokens → `src/styles/global.css` `@theme`.
- [x] Phase 3: add `@astrojs/svelte`; rebuild landing sections and nav.
- [x] Phase 3b: migrate blog archive, variant tabs, and TOC to Svelte.
- [x] Phase 4a: isolate retained r3f simulations to dedicated routes.
- [ ] Phase 4b (optional): port the two retained sims to Threlte or vanilla
  Three.js to remove React from the engine.

## Amendment (2026-07-20): sim engine scope reduced

Decision: phase out most simulations; **keep only `singularity` and
`magnetic`**. Removed the same day:

- Sims: `lorenz`, `grayScott`, `kuramotoSivashinsky` (`src/scenes/sims/`,
  plus their tests under `tests/scenes/sims/`).
- Solvers orphaned by that removal: `fft.ts`, `etdrk4.ts`, `gpuCompute.ts`
  (entire `src/scenes/solvers/` directory, plus tests). `verlet.ts` was
  already dead code (no importers) and was removed as well.
- npm dependency `fft.js` (only consumer was `solvers/fft.ts`).

The engine layer (`src/scenes/engine/`: AppCanvasIsland, SceneHost,
SceneRouter, SceneRegistry, Symmetry, PerfController, LevaPanel) and the
`/sim/[name]` playground route are unchanged — the registry is a single
list, so `getStaticPaths` narrows automatically.

Consequence for Phase 4: with only two particle-based sims remaining, a
Threlte port (or even vanilla-three rewrite) is now small enough that full
React removal from the repo is a realistic near-term option rather than a
deferred one.

## Amendment (2026-07-22): simulations isolated from portfolio routes

Decision: retain the two r3f simulations as dedicated experiments, but remove
the engine from the global portfolio layout.

- `BaseLayout.astro` no longer mounts `AppCanvasIsland` or `LevaPanel`.
- New `SimLayout.astro` provides a dark, full-screen lab shell.
- `/sim/singularity` and `/sim/magnetic` mount the engine and Leva directly.
- `/`, `/projects`, and `/blog/**` no longer reference or download
  Three.js/r3f/Leva chunks.
- The sim route, rather than local storage, determines the initial scene.

This delivers the intended phase-out while preserving the two experiments and
substantially reduces the main portfolio's JavaScript/runtime surface.
