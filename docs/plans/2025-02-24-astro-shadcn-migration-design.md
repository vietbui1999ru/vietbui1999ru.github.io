# Astro + shadcn + Obsidian Migration Design

> **For Claude:** Use superpowers:writing-plans to create the implementation plan after design approval.

**Goal:** Migrate the Next.js portfolio to Astro + shadcn/ui, retain custom components, and integrate Obsidian vault notes for the blog.

**Architecture:** Single-page portfolio layout (scroll-to-section) with Astro static generation. React components used as islands (client:load/client:visible) for interactivity. Blog powered by Astro Content Collections with optional Vault CMS for Obsidian sync.

**Tech Stack:** Astro 5, React 19, shadcn/ui, Tailwind CSS 4, framer-motion, GSAP, react-shaders, Vault CMS (optional for Obsidian).

---

## Reference Template Analysis

| Template | Pros | Cons | Verdict |
|----------|------|------|---------|
| **astro-shadcn-ui-template** | Minimal, shadcn v3, Astro 5, React 19, Tailwind 4 | No portfolio structure | **Base choice** |
| **astro-erudite** | Blog-first, MDX, authors, tags, content collections | Uses radix-ui not shadcn; blog-focused | **Reference for blog** |
| **Astro-Shadcn-portfolio** | Portfolio structure, data files | Low activity, 2 commits | **Reference for data layout** |

**Decision:** Use **astro-shadcn-ui-template** as base. Add portfolio structure and migrate custom components. Use Astro Content Collections for blog; integrate Vault CMS for Obsidian.

---

## Obsidian Integration Options

1. **Vault CMS** (recommended): Headless CMS for Astro powered by Obsidian. Write in Obsidian, deploy to Astro. `pnpm create vault-cms`.
2. **Symbolic links**: Link Obsidian vault folder to `src/content/blog`. Simple but sync conflicts with Obsidian Sync.
3. **Git submodules**: Obsidian vault as submodule. Best for version control.

**Recommendation:** Start with Content Collections (manual MDX). Add Vault CMS in a follow-up phase once base migration is stable.

---

## Components to Retain (Priority Order)

| Priority | Component | Dependencies | Notes |
|----------|-----------|--------------|-------|
| P0 | NavBarDock | dockHeading, ThemeSwitch, lucide | Core nav; use client:load |
| P0 | Singularity | react-shaders | WebGL shader; client:load |
| P0 | RotatingText | framer-motion | Hero animation |
| P0 | TypingText | gsap, ColorfulText | Hero animation |
| P0 | SectionHeading | — | Simple, no deps |
| P1 | AnimatedModal | framer-motion, useOnClickOutside | Modal with 3D effect |
| P1 | CardsCarousel | framer-motion, useOnClickOutside | Gallery/Projects |
| P1 | dockHeading | framer-motion | Dock magnify effect |
| P2 | ColorfulText, GradientText | framer-motion | Used by TypingText/RotatingText |
| P2 | HighLightText, SplittingText | — | If used |
| P3 | AboutCard, AboutParagraph, AboutParagraphReveal | — | Migrate if used |

---

## Data Migration

- **projectsData.ts** → `src/content/projects/` or keep as TS
- **blogData.ts** → Astro Content Collections (`src/content/blog/*.mdx`)
- **experienceData.ts**, **educationData.ts**, **achievementsData.ts**, **galleryData.ts**, **contactData.ts**, **aboutData.ts** → Keep as TS exports (or migrate to content collections later)

---

## File Structure (Target)

```
src/
├── components/
│   ├── ui/           # shadcn + custom (RotatingText, TypingText, etc.)
│   └── layout/       # NavBarDock
├── content/
│   └── blog/         # MDX posts (Obsidian → here via Vault CMS later)
├── layouts/
│   └── BaseLayout.astro
├── pages/
│   └── index.astro   # Single-page portfolio
├── data/             # projectsData, experienceData, etc.
├── hooks/
└── lib/
```

---

## Migration Phases

1. **Phase 1:** Create branch, scaffold Astro project from template
2. **Phase 2:** Migrate custom components as React islands
3. **Phase 3:** Migrate data files and page sections
4. **Phase 4:** Set up blog with Content Collections
5. **Phase 5:** Obsidian/Vault CMS integration (optional, follow-up)
