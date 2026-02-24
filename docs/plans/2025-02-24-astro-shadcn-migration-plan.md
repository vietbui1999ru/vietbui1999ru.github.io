# Astro + shadcn Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans or subagent-driven-development to implement this plan task-by-task.

**Goal:** Migrate Next.js portfolio to Astro + shadcn/ui, retain custom components, prepare for Obsidian blog integration.

**Architecture:** Astro static site with React islands. Single-page scroll layout. Content Collections for blog.

**Tech Stack:** Astro 5, React 19, shadcn, Tailwind 4, framer-motion, GSAP, react-shaders.

---

## Task 1: Create Git Branch and Worktree

**Files:**
- Modify: `.gitignore` (add `.worktrees/` if not ignored)
- Create: worktree at `.worktrees/astro-migration` or `feature/astro-migration` branch

**Step 1: Verify worktree directory is ignored**

```bash
# Add to .gitignore if missing
echo ".worktrees/" >> .gitignore
git add .gitignore && git commit -m "chore: ignore worktrees directory"
```

**Step 2: Create feature branch and worktree**

```bash
cd /Users/vietquocbui/repos/VsCode/vietbui1999ru/Portfolio/vietbui1999ru.github.io
git worktree add .worktrees/astro-migration -b feature/astro-migration
cd .worktrees/astro-migration
```

**Step 3: Verify clean state**

```bash
git status
```

**Expected:** Clean working tree on new branch.

---

## Task 2: Scaffold Astro Project from astro-shadcn-ui-template

**Files:**
- Create: New Astro project structure (or clone template into worktree)

**Step 1: Clone template or create from scratch**

Option A - Use degit to copy template:
```bash
cd .worktrees/astro-migration
npx degit area44/astro-shadcn-ui-template temp-astro
# Copy temp-astro contents over, merge with existing (preserve docs, .git)
# Or: start fresh in worktree, copy only needed files
```

Option B - Manual scaffold (recommended for controlled migration):
- Create `astro.config.mjs`, `package.json` with Astro + React + shadcn deps
- Copy `components.json`, Tailwind config from template
- Set up `src/` structure

**Step 2: Install dependencies**

```bash
pnpm install
# Or: npm install
```

**Step 3: Verify dev server runs**

```bash
pnpm dev
```

**Expected:** Dev server at localhost:4321 (or 4322).

---

## Task 3: Configure Astro for React and Path Aliases

**Files:**
- Modify: `astro.config.mjs`
- Modify: `tsconfig.json`

**Step 1: Add React integration**

In `astro.config.mjs`:
```js
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@tailwindcss/vite';

export default defineConfig({
  integrations: [react()],
  vite: {
    plugins: [tailwind()],
    resolve: {
      alias: { '@': '/src' }
    }
  }
});
```

**Step 2: Add path aliases to tsconfig**

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

**Step 3: Verify build**

```bash
pnpm build
```

**Expected:** Build succeeds.

---

## Task 4: Migrate Core UI Utilities and Hooks

**Files:**
- Create: `src/lib/utils.ts`
- Create: `src/hooks/useOnClickOutside.ts`

**Step 1: Copy utils**

Copy `cn` and `tailwind-merge` setup from current `src/lib/utils.ts`.

**Step 2: Copy useOnClickOutside hook**

Copy from `src/hooks/useOnClickOutside.ts` (used by AnimatedModal, CardsCarousel).

**Step 3: Verify no import errors**

```bash
pnpm build
```

---

## Task 5: Migrate SectionHeading Component

**Files:**
- Create: `src/components/ui/SectionHeading.tsx`

**Step 1: Copy component**

Copy `SectionHeading` from current codebase. Add `"use client"` if using React. Ensure `cn` import uses `@/lib/utils`.

**Step 2: Verify**

Import in a test Astro page; build.

---

## Task 6: Migrate ColorfulText and GradientText

**Files:**
- Create: `src/components/ui/ColorfulText.tsx`
- Create: `src/components/ui/GradientText.tsx`

**Step 1: Copy both components**

Both use framer-motion. Add `"use client"`. Fix imports (`@/lib/utils`).

**Step 2: Add framer-motion dependency**

```bash
pnpm add framer-motion
```

**Step 3: Verify build**

---

## Task 7: Migrate RotatingText Component

**Files:**
- Create: `src/components/ui/RotatingText.tsx`

**Step 1: Copy component**

Uses framer-motion AnimatePresence, motion. Add `"use client"`.

**Step 2: Verify**

---

## Task 8: Migrate TypingText Component

**Files:**
- Create: `src/components/ui/TypingText.tsx`

**Step 1: Copy component**

Uses gsap, ColorfulText. Add `"use client"`.

**Step 2: Add GSAP**

```bash
pnpm add gsap
```

**Step 3: Verify**

---

## Task 9: Migrate dockHeading (Dock Components)

**Files:**
- Create: `src/components/ui/dockHeading.tsx`

**Step 1: Copy Dock, DockItem, DockIcon, DockLabel**

Uses framer-motion (useMotionValue, useSpring, useTransform). Add `"use client"`.

**Step 2: Verify**

---

## Task 10: Migrate NavBarDock

**Files:**
- Create: `src/components/layout/NavBarDock.tsx`

**Step 1: Copy NavBarDock**

Replace `usePathname` from Next.js with Astro's `Astro.url.pathname` or a client-side hash router. For single-page scroll, use `#home`, `#about`, etc. — no pathname needed; use `window.location.hash` or scroll position.

**Step 2: Adapt for Astro**

- Use `<a href="#home">` instead of `<Link href="#home">`
- Remove `usePathname`; use `window.location.hash` in client script or simple anchor links
- Copy ThemeSwitch; ensure it works with Astro (client:load)

**Step 3: Verify**

---

## Task 11: Migrate Singularity Shader

**Files:**
- Create: `src/components/shaders/Singularity.tsx`

**Step 1: Copy Singularity component**

Uses `react-shaders`. Add `"use client"`.

**Step 2: Add react-shaders**

```bash
pnpm add react-shaders
```

**Step 3: Verify** (WebGL may need browser)

---

## Task 12: Migrate AnimatedModal

**Files:**
- Create: `src/components/ui/AnimatedModal.tsx`

**Step 1: Copy Modal, ModalProvider, ModalTrigger, ModalBody, ModalContent, ModalFooter**

Uses framer-motion, useOnClickOutside. Add `"use client"`.

**Step 2: Verify**

---

## Task 13: Migrate CardsCarousel

**Files:**
- Create: `src/components/ui/CardsCarousel.tsx`

**Step 1: Copy Carousel, Card, BlurImage**

Uses framer-motion, useOnClickOutside. Add `"use client"`.

**Step 2: Verify**

---

## Task 14: Migrate ThemeSwitch and ThemeProvider

**Files:**
- Create: `src/components/ui/ThemeSwitch.tsx`
- Create: `src/components/ThemeProvider.tsx`

**Step 1: Copy both**

ThemeProvider wraps app. In Astro, use in `BaseLayout.astro` with `client:load` or `client:only="react"` for the provider.

**Step 2: Add next-themes or equivalent**

Astro often uses `astro-theme-provider` or custom. Check current ThemeProvider implementation; may need `next-themes` (works with React) or `astro-theme-provider`.

---

## Task 15: Create Base Layout and Global Styles

**Files:**
- Create: `src/layouts/BaseLayout.astro`
- Create: `src/styles/global.css`
- Create: `src/pages/index.astro`

**Step 1: BaseLayout.astro**

- Include ThemeProvider (React island)
- Include NavBarDock (React island, client:load)
- Include global CSS
- Slot for main content

**Step 2: Copy globals.css**

Copy from `src/app/globals.css` (Tailwind, CSS variables for shadcn).

**Step 3: index.astro**

Single page with sections: Home, About, Projects, Experience, Education, Blog, Gallery, Achievements, Contact.

---

## Task 16: Migrate Home Section with Singularity and TypingText

**Files:**
- Create: `src/components/sections/Home.astro` (or Home.tsx as island)
- Create: `src/data/homeData.ts`

**Step 1: Copy homeData.ts**

**Step 2: Create Home section**

Use Singularity (client:load), TypingText (client:load), RotatingText (client:load), GradientText. Structure from current Home.tsx.

**Step 3: Add to index.astro**

---

## Task 17: Migrate Data Files

**Files:**
- Create: `src/data/projectsData.ts`
- Create: `src/data/experienceData.ts`
- Create: `src/data/educationData.ts`
- Create: `src/data/achievementsData.ts`
- Create: `src/data/galleryData.ts`
- Create: `src/data/contactData.ts`
- Create: `src/data/aboutData.ts`

**Step 1: Copy each data file**

Adjust import paths if needed.

---

## Task 18: Migrate About Section

**Files:**
- Create: `src/components/sections/About.tsx` or `.astro`
- Copy: AboutCard, AboutParagraph, AboutParagraphReveal if used

**Step 1: Migrate About**

Use SectionHeading, aboutData.

---

## Task 19: Migrate Projects Section

**Files:**
- Create: `src/components/sections/Projects.tsx` or `.astro`

**Step 1: Migrate Projects**

Use SectionHeading, projectsData. If using CardsCarousel for projects, integrate.

---

## Task 20: Migrate Experience, Education, Achievements, Contact, Gallery

**Files:**
- Create section components for each

**Step 1: Migrate each section**

Copy structure from current Experience.tsx, Education.tsx, Achievements.tsx, Contact.tsx, Gallery.tsx. Use SectionHeading, respective data files.

---

## Task 21: Set Up Blog with Content Collections

**Files:**
- Create: `src/content/config.ts`
- Create: `src/content/blog/` schema
- Create: `src/pages/blog/index.astro`
- Create: `src/pages/blog/[slug].astro`

**Step 1: Define blog schema**

```ts
// src/content/config.ts
import { defineCollection } from 'astro:content';

const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    draft: z.boolean().optional(),
  }),
});
```

**Step 2: Create placeholder post**

`src/content/blog/coming-soon.mdx`

**Step 3: Create blog index and [slug] pages**

List posts; link to individual posts.

---

## Task 22: Add Blog Section to Index Page

**Files:**
- Modify: `src/components/sections/Blog.tsx` or create

**Step 1: Create Blog section**

Fetch recent posts from Content Collections. Display cards. Link to `/blog` and `/blog/[slug]`.

---

## Task 23: Final Integration and Verification

**Step 1: Run full build**

```bash
pnpm build
```

**Step 2: Run preview**

```bash
pnpm preview
```

**Step 3: Manual smoke test**

- NavBarDock scrolls to sections
- Home shows Singularity, TypingText, RotatingText
- All sections render
- Theme switch works
- Blog links work

---

## Task 24: Document Obsidian/Vault CMS Next Steps

**Files:**
- Create: `docs/OBSIDIAN_INTEGRATION.md`

**Step 1: Write short guide**

- How to add Vault CMS: `pnpm create vault-cms`
- Link Obsidian vault to `src/content/blog`
- Optional: symlink or submodule approach

---

## Execution Options

**1. Subagent-Driven (this session):** Dispatch fresh subagent per task, review between tasks.

**2. Parallel Session:** Open new session with executing-plans, batch execution with checkpoints.
