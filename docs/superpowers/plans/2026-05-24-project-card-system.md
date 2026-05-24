# Project Card System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `projects.json` with a markdown-per-project content collection sourced from the vault submodule, wire a pre-build script that copies vault images to `public/`, and update `Projects.tsx` to accept the collection data (including rendered markdown body in the modal).

**Architecture:** Astro 5 content layer (`glob()` loader) points to `vendor/vault/Portfolio/Projects/*.md`. A pre-build script (`scripts/copy-vault-images.ts`) scans frontmatter, copies vault images from `vendor/vault/Assets/Projects/<slug>/` to `public/assets/projects/<slug>/`. `Projects.tsx` becomes a prop-driven component accepting `ProjectCardData[]` (like `Blog.tsx` accepts posts); `index.astro` fetches, sorts, and passes them down. Markdown body (`entry.rendered?.html`) is sanitized with DOMPurify before rendering.

**Tech Stack:** Astro 5 content layer, Zod 4, gray-matter, tsx, React, dompurify, `@icons-pack/react-simple-icons`, lucide-react

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Modify | `src/content/schemas.ts` | Add `featured`, `draft` to `projectSchema` |
| Modify | `src/content/config.ts` | Register `projects` collection pointing to vault |
| Modify | `tests/content/schemas.test.ts` | Add projectSchema tests |
| Create | `scripts/copy-vault-images.ts` | Pre-build: copy vault images to `public/` |
| Modify | `package.json` | Prepend copy script to `build`, add dompurify |
| Create | `src/lib/iconResolver.tsx` | Map icon slug to React component |
| Modify | `src/components/sections/Projects.tsx` | Accept props, render sanitized bodyHtml |
| Modify | `src/pages/index.astro` | Fetch projects collection, pass as props |
| Create | `vendor/vault/Portfolio/Projects/*.md` (x9) | Migrate all existing projects |
| Create | `vendor/vault/Templates/project-template.md` | Obsidian new-project template |
| Delete | `src/data/projects.json` | Replaced by vault markdown |
| Delete | `src/data/projectsData.ts` | Replaced by content collection |

---

## Task 1: Extend projectSchema

**Files:**
- Modify: `src/content/schemas.ts`
- Modify: `tests/content/schemas.test.ts`

- [ ] **Step 1: Write the failing tests**

Add to `tests/content/schemas.test.ts` after the existing `describe("roleSchema")` block:

```typescript
describe("projectSchema", () => {
  const base = {
    title: "My Project",
    summary: "Short description.",
    date: "2026-01-15",
  };

  it("accepts minimal valid frontmatter", () => {
    const parsed = projectSchema.parse(base);
    expect(parsed.featured).toBe(false);
    expect(parsed.draft).toBe(false);
    expect(parsed.status).toBe("shipped");
  });

  it("rejects missing title", () => {
    expect(() => projectSchema.parse({ ...base, title: undefined })).toThrow();
  });

  it("rejects missing summary", () => {
    expect(() => projectSchema.parse({ ...base, summary: undefined })).toThrow();
  });

  it("coerces date strings", () => {
    const parsed = projectSchema.parse(base);
    expect(parsed.date).toBeInstanceOf(Date);
  });

  it("featured defaults to false", () => {
    expect(projectSchema.parse(base).featured).toBe(false);
  });

  it("draft defaults to false", () => {
    expect(projectSchema.parse(base).draft).toBe(false);
  });

  it("accepts full valid frontmatter", () => {
    const parsed = projectSchema.parse({
      ...base,
      featured: true,
      draft: false,
      status: "active",
      badges: ["React", "TypeScript"],
      cover: "hero.png",
      images: ["hero.png", "https://example.com/img.png"],
      links: [{ icon: "github", url: "https://github.com/foo/bar" }],
    });
    expect(parsed.featured).toBe(true);
    expect(parsed.badges).toHaveLength(2);
  });

  it("rejects invalid status", () => {
    expect(() => projectSchema.parse({ ...base, status: "unpublished" })).toThrow();
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npm run test 2>&1 | grep -A 3 "projectSchema"
```

Expected: fails — "featured" and "draft" fields not yet on schema.

- [ ] **Step 3: Add `featured` and `draft` to projectSchema**

In `src/content/schemas.ts`, replace the existing `projectSchema` definition:

```typescript
export const projectSchema = z.object({
  title: z.string(),
  summary: z.string(),
  date: z.coerce.date(),
  featured: z.boolean().default(false),
  draft: z.boolean().default(false),
  tags: z.array(z.string()).optional(),
  badges: z.array(z.string()).optional(),
  images: z.array(z.string()).optional(),
  cover: z.string().optional(),
  links: z.array(z.object({ icon: z.string(), url: z.string().url() })).optional(),
  status: z.enum(["active", "shipped", "archived"]).default("shipped"),
  graph_node: z.boolean().default(true),
});
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npm run test 2>&1 | grep -E "(PASS|FAIL|projectSchema)"
```

Expected: all `projectSchema` tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/content/schemas.ts tests/content/schemas.test.ts
git commit -m "feat(projects): add featured and draft fields to projectSchema"
```

---

## Task 2: Wire projects content collection

**Files:**
- Modify: `src/content/config.ts`

- [ ] **Step 1: Add projects collection**

Replace the entire file content:

```typescript
import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { blogSchema, projectSchema } from "@/content/schemas";

const blog = defineCollection({
  loader: glob({
    pattern: "**/*.md",
    base: "./vendor/vault/Blogs",
  }),
  schema: blogSchema,
});

const projects = defineCollection({
  loader: glob({
    pattern: "**/*.md",
    base: "./vendor/vault/Portfolio/Projects",
  }),
  schema: projectSchema,
});

export const collections = {
  blog,
  projects,
};
```

- [ ] **Step 2: Verify TypeScript accepts the new collection**

```bash
npx tsc --noEmit 2>&1 | grep "config.ts"
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/content/config.ts
git commit -m "feat(projects): register projects content collection from vault"
```

---

## Task 3: Create vault directory structure and Obsidian template

- [ ] **Step 1: Create directories**

```bash
mkdir -p vendor/vault/Portfolio/Projects
mkdir -p vendor/vault/Assets/Projects
```

- [ ] **Step 2: Create Obsidian project template**

Create `vendor/vault/Templates/project-template.md`:

```markdown
---
title: "{{title}}"
summary: "One sentence describing what this project does."
date: {{date:YYYY-MM-DD}}
featured: false
draft: true
status: shipped
badges: []
cover: hero.png
images:
  - hero.png
links:
  - icon: github
    url: https://github.com/vietbui1999ru/
graph_node: true
---

## Overview

What is this project and why did you build it?

## Features

- Feature one
- Feature two

## Architecture

How is it structured?

## Lessons Learned

What did you learn?
```

- [ ] **Step 3: Commit**

```bash
git add vendor/vault/Portfolio/Projects vendor/vault/Assets/Projects vendor/vault/Templates/project-template.md
git commit -m "chore(vault): add Projects directories and Obsidian project template"
```

---

## Task 4: Pre-build vault image copy script

**Files:**
- Create: `scripts/copy-vault-images.ts`

- [ ] **Step 1: Install gray-matter and tsx if missing**

```bash
node -e "require('gray-matter')" 2>&1 | grep -q "Cannot find" && npm install -D gray-matter || echo "gray-matter already installed"
npx tsx --version 2>&1 | grep -q "Error" && npm install -D tsx || echo "tsx already installed"
```

- [ ] **Step 2: Create the copy script**

Create `scripts/copy-vault-images.ts`:

```typescript
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import matter from "gray-matter";

const THIS_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(THIS_DIR, "..");

const VAULT_PROJECTS = path.join(ROOT, "vendor/vault/Portfolio/Projects");
const VAULT_ASSETS = path.join(ROOT, "vendor/vault/Assets/Projects");
const PUBLIC_ASSETS = path.join(ROOT, "public/assets/projects");

function isUrl(s: string): boolean {
  return s.startsWith("http://") || s.startsWith("https://");
}

function copyImage(slug: string, filename: string): void {
  const src = path.join(VAULT_ASSETS, slug, filename);
  const destDir = path.join(PUBLIC_ASSETS, slug);
  const dest = path.join(destDir, filename);

  if (!fs.existsSync(src)) {
    console.warn(`  [warn] missing vault image: Assets/Projects/${slug}/${filename}`);
    return;
  }

  fs.mkdirSync(destDir, { recursive: true });
  fs.copyFileSync(src, dest);
  console.log(`  [copy] ${filename} -> public/assets/projects/${slug}/`);
}

function processProject(mdPath: string): void {
  const raw = fs.readFileSync(mdPath, "utf-8");
  const { data } = matter(raw);
  const slug = path.basename(mdPath, ".md");

  console.log(`[project] ${slug}`);

  const imagesToCopy: string[] = [];

  if (data.cover && typeof data.cover === "string" && !isUrl(data.cover)) {
    imagesToCopy.push(data.cover);
  }

  if (Array.isArray(data.images)) {
    for (const img of data.images) {
      if (typeof img === "string" && !isUrl(img) && !imagesToCopy.includes(img)) {
        imagesToCopy.push(img);
      }
    }
  }

  for (const filename of imagesToCopy) {
    copyImage(slug, filename);
  }
}

function main(): void {
  if (!fs.existsSync(VAULT_PROJECTS)) {
    console.log("vault/Portfolio/Projects not found — skipping image copy");
    return;
  }

  const mdFiles = fs
    .readdirSync(VAULT_PROJECTS)
    .filter((f) => f.endsWith(".md"))
    .map((f) => path.join(VAULT_PROJECTS, f));

  if (mdFiles.length === 0) {
    console.log("No project markdown files found — skipping");
    return;
  }

  console.log(`Copying vault images for ${mdFiles.length} project(s)...`);
  for (const mdPath of mdFiles) {
    processProject(mdPath);
  }
  console.log("Done.");
}

main();
```

- [ ] **Step 3: Run the script — verify no crash**

```bash
npx tsx scripts/copy-vault-images.ts
```

Expected: logs each project slug (after Task 9 adds the markdown files), or "No project markdown files found" now.

- [ ] **Step 4: Commit**

```bash
git add scripts/copy-vault-images.ts
git commit -m "feat(projects): add vault image copy pre-build script"
```

---

## Task 5: Wire pre-build into package.json

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install dompurify**

```bash
npm install dompurify
npm install -D @types/dompurify
```

- [ ] **Step 2: Update build script**

In `package.json`, change:

```json
"build": "astro build"
```

to:

```json
"build": "tsx scripts/copy-vault-images.ts && astro build"
```

- [ ] **Step 3: Verify build script runs**

```bash
npm run build 2>&1 | head -5
```

Expected: first line is the copy script output, followed by Astro build output.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: wire vault image copy into build and add dompurify"
```

---

## Task 6: Create icon resolver

**Files:**
- Create: `src/lib/iconResolver.tsx`

- [ ] **Step 1: Create the file**

```typescript
import {
  SiGithub,
  SiGitlab,
  SiFigma,
  SiVercel,
  SiNetlify,
  SiNpm,
  SiYoutube,
} from "@icons-pack/react-simple-icons";
import { ExternalLink, Globe, Link2, FileText, Play } from "lucide-react";
import type { ComponentType } from "react";

type IconProps = { className?: string; size?: number | string };

const SI_ICONS: Record<string, ComponentType<IconProps>> = {
  github: SiGithub,
  gitlab: SiGitlab,
  figma: SiFigma,
  vercel: SiVercel,
  netlify: SiNetlify,
  npm: SiNpm,
  youtube: SiYoutube,
};

const LUCIDE_ICONS: Record<string, ComponentType<IconProps>> = {
  "external-link": ExternalLink,
  globe: Globe,
  link: Link2,
  "file-text": FileText,
  play: Play,
};

export function resolveIcon(slug: string): ComponentType<IconProps> {
  const key = slug.toLowerCase();
  return SI_ICONS[key] ?? LUCIDE_ICONS[key] ?? ExternalLink;
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep "iconResolver"
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/lib/iconResolver.tsx
git commit -m "feat(projects): add icon slug resolver"
```

---

## Task 7: Update Projects.tsx

**Files:**
- Modify: `src/components/sections/Projects.tsx`

- [ ] **Step 1: Replace the import block and add type definitions**

Replace lines 1 through the end of the existing imports (the first 16 lines) with:

```typescript
"use client";

import { Carousel, Card as CarouselCard, BlurImage } from "@/components/ui/CardsCarousel";
import type { Card } from "@/components/ui/CardsCarousel";
import { AppleHelloMyWorkEffect } from "@/components/ui/apple-hello-effect";
import { SkillBadge } from "@/components/ui/SkillBadge";
import { buttonVariants } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  LavaLampBackground,
  type LavaLampBackgroundProps,
} from "@/components/ui/LavaLampBackground";
import { resolveIcon } from "@/lib/iconResolver";
import { useCallback, useEffect, useRef, useState } from "react";
import DOMPurify from "dompurify";

export type ProjectCardData = {
  slug: string;
  title: string;
  summary: string;
  date: Date;
  featured: boolean;
  badges?: string[];
  cover?: string;
  images?: string[];
  links?: Array<{ icon: string; url: string }>;
  status: "active" | "shipped" | "archived";
  /** Pre-rendered markdown HTML from entry.rendered?.html */
  bodyHtml: string;
};

type ProjectsProps = {
  projects: ProjectCardData[];
};
```

- [ ] **Step 2: Add image URL resolver after ProjectsProps**

Add before the `hexToRgb` function:

```typescript
function resolveImageUrl(image: string, slug: string): string {
  if (image.startsWith("http://") || image.startsWith("https://")) return image;
  return `/assets/projects/${slug}/${image}`;
}
```

- [ ] **Step 3: Replace projectToCarouselCard**

Replace the `projectToCarouselCard` function entirely:

```typescript
function projectToCarouselCard(
  project: ProjectCardData,
  index: number,
  total: number,
): Card {
  const { fromColor, toColor } = gradientForIndex(index, total);

  const normalizedImages: string[] =
    project.images && project.images.length > 0
      ? project.images.map((img) => resolveImageUrl(img, project.slug))
      : project.cover
        ? [resolveImageUrl(project.cover, project.slug)]
        : [];

  const sanitizedHtml = project.bodyHtml
    ? DOMPurify.sanitize(project.bodyHtml)
    : "";

  return {
    background: <LavaLampBackground fromColor={fromColor} toColor={toColor} />,
    title: project.title,
    category: project.badges?.[0] ?? "Project",
    content: (
      <>
        {normalizedImages.length === 1 && (
          <div className="mb-6 overflow-hidden rounded-2xl border border-border bg-black">
            <BlurImage
              src={normalizedImages[0] as string}
              alt={`${project.title} preview`}
              className="h-auto max-h-[18rem] w-full object-contain"
            />
          </div>
        )}
        {normalizedImages.length > 1 && (
          <ProjectImageGallery images={normalizedImages} title={project.title} />
        )}
        {sanitizedHtml ? (
          <div
            className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground"
            // Content is build-time static from controlled vault — sanitized with DOMPurify
            dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
          />
        ) : (
          <p className="text-muted-foreground text-sm leading-relaxed">{project.summary}</p>
        )}
        {project.badges && project.badges.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {project.badges.map((badge) => (
              <SkillBadge key={badge} skill={badge} size="sm" />
            ))}
          </div>
        )}
        {project.links && project.links.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {project.links.map((link, i) => {
              const Icon = resolveIcon(link.icon);
              return (
                <a
                  key={i}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    "inline-flex items-center gap-1.5",
                  )}
                >
                  <Icon className="size-3.5" />
                  View
                </a>
              );
            })}
          </div>
        )}
      </>
    ),
  };
}
```

- [ ] **Step 4: Replace the Projects component**

Replace the `Projects` component and its export:

```typescript
const Projects = ({ projects }: ProjectsProps) => {
  const total = projects.length;
  const carouselCards = projects.map((project, index) =>
    projectToCarouselCard(project, index, total),
  );

  return (
    <section id="projects" className="relative min-h-screen w-full">
      <div className="section-content">
        <header className="mb-12 flex flex-col items-center gap-4 text-center">
          <AppleHelloMyWorkEffect className="w-full" />
        </header>

        <Carousel
          items={carouselCards.map((card, index) => (
            <CarouselCard key={card.title} card={card} index={index} layout />
          ))}
        />
      </div>
    </section>
  );
};

export default Projects;
```

- [ ] **Step 5: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep "Projects.tsx"
```

Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add src/components/sections/Projects.tsx
git commit -m "feat(projects): update Projects.tsx to accept props and render markdown body"
```

---

## Task 8: Update index.astro

**Files:**
- Modify: `src/pages/index.astro`

- [ ] **Step 1: Replace the frontmatter block**

Replace everything between the opening `---` and closing `---` delimiters:

```typescript
import BaseLayout from "@/layouts/BaseLayout.astro";
import Home from "@/components/sections/Home";
import About from "@/components/sections/About";
import Projects from "@/components/sections/Projects";
import type { ProjectCardData } from "@/components/sections/Projects";
import Experience from "@/components/sections/Experience";
import Education from "@/components/sections/Education";
import Blog from "@/components/sections/Blog";
import Gallery from "@/components/sections/Gallery";
import Contact from "@/components/sections/Contact";
import { getCollection } from "astro:content";

const blogPosts = (await getCollection("blog"))
  .filter((p) => !p.data.draft)
  .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf())
  .slice(0, 6)
  .map((p) => ({
    slug: p.id,
    title: p.data.title,
    description: p.data.description,
    date: p.data.date,
    draft: p.data.draft,
  }));

const projects: ProjectCardData[] = (
  await getCollection("projects", (p) => !p.data.draft)
)
  .sort((a, b) => {
    if (a.data.featured !== b.data.featured) return a.data.featured ? -1 : 1;
    return b.data.date.valueOf() - a.data.date.valueOf();
  })
  .map((entry) => ({
    slug: entry.id,
    title: entry.data.title,
    summary: entry.data.summary,
    date: entry.data.date,
    featured: entry.data.featured,
    badges: entry.data.badges,
    cover: entry.data.cover,
    images: entry.data.images,
    links: entry.data.links,
    status: entry.data.status,
    bodyHtml: entry.rendered?.html ?? "",
  }));
```

- [ ] **Step 2: Pass projects prop to Projects component**

In the template, change:

```astro
<Projects client:visible />
```

to:

```astro
<Projects client:visible projects={projects} />
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep "index.astro"
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add src/pages/index.astro
git commit -m "feat(projects): wire projects content collection into index.astro"
```

---

## Task 9: Migrate all 9 existing projects to vault markdown

**Files:** Create each file below in `vendor/vault/Portfolio/Projects/`

- [ ] **Step 1: stripe-mrr-dashboard.md**

```markdown
---
title: "Python Full-Stack Stripe MRR Dashboard"
summary: "Real-time Stripe MRR dashboard with customer simulation and SQL ETL pipeline."
date: 2026-01-15
featured: true
draft: false
status: shipped
badges: [Python, React, Recharts, TypeScript, FastAPI, "Stripe API", "Google Cloud Platform", "Google BigQuery", MySQL]
images:
  - https://raw.githubusercontent.com/vietbui1999ru/omega-sigma-alpha-4983/main/docs/dashboard-screenshot.png
  - https://raw.githubusercontent.com/vietbui1999ru/omega-sigma-alpha-4983/main/docs/mrr_accuracy_comparison.png
links:
  - icon: github
    url: https://github.com/vietbui1999ru/omega-sigma-alpha-4983
graph_node: true
---

Built a Stripe MRR Dashboard using React and Recharts. Designed a customer simulation engine and a custom SQL ETL pipeline to analyze customer data flowing through Google BigQuery.
```

- [ ] **Step 2: pde-physics-simulation.md**

```markdown
---
title: "Python Full-Stack PDE Heat & Wave Physics Simulation Platform"
summary: "Interactive PDE solver implementing Forward/Backward Finite Difference methods with real-time visualization."
date: 2026-02-16
featured: true
draft: false
status: shipped
badges: [Python, React, Plotly, "Tailwind CSS", TypeScript, FastAPI, Numpy, Scipy, Matplotlib, Pandas, Nginx, Docker]
images:
  - https://raw.githubusercontent.com/vietbui1999ru/Heat-Wave-PDE-Simulation/main/demo/Screenshot%202026-02-16%20at%2021-20-24%20PDE%20Simulation%20Platform.png
  - https://raw.githubusercontent.com/vietbui1999ru/Heat-Wave-PDE-Simulation/main/demo/Screenshot%202026-02-16%20at%2021-19-43%20PDE%20Simulation%20Platform.png
links:
  - icon: github
    url: https://github.com/vietbui1999ru/Heat-Wave-PDE-Simulation
graph_node: true
---

Constructed a PDE Heat & Wave Physics Simulation Platform. Proved and implemented Forward/Backward Finite Difference methods for solving the Heat and Wave PDEs numerically. Built a custom simulation engine letting users configure boundaries and initial conditions, with multiple visualization and animation modes.
```

- [ ] **Step 3: home-assistant-dashboard.md**

```markdown
---
title: "C# TanStack Home Assistant & Media Dashboard"
summary: "Real-time home dashboard with schedules, weather, media, and AI voice assistant — fully containerized."
date: 2025-11-01
featured: false
draft: false
status: shipped
badges: [".NET", Redis, "REST API", React, TypeScript, Vite, "Radix UI", "Tailwind CSS", "TanStack Query", PostgreSQL, Docker, Playwright]
links:
  - icon: github
    url: https://github.com/vietbui1999ru/hosted-dashboard
graph_node: true
---

Built a real-time home dashboard tracking household schedules, weather, movies, shopping lists, and AI Voice Assistant integrations using an ASP.NET backend with deep third-party API integrations. Fully containerized and thoroughly tested with Playwright E2E, backend unit, and frontend integration tests.
```

- [ ] **Step 4: spotify-web-app.md**

```markdown
---
title: "TypeScript Full-Stack Spotify Web Application"
summary: "Music discovery platform with Spotify/LastFm integration, playlist sharing, and admin analytics."
date: 2026-03-03
featured: true
draft: false
status: shipped
badges: [TypeScript, Neon, Prisma, PostgreSQL, "Next.js", Express, React, Docker, Nginx, "CI/CD"]
images:
  - https://raw.githubusercontent.com/vietbui1999ru/spotifyswipe/main/demo/Screenshot%202026-03-03%20at%2017-14-17%20Discover%20Music%20App.png
  - https://raw.githubusercontent.com/vietbui1999ru/spotifyswipe/main/demo/Screenshot%202026-03-03%20at%2017-15-05%20Discover%20Music%20App.png
  - https://raw.githubusercontent.com/vietbui1999ru/spotifyswipe/main/demo/Screenshot%202026-03-03%20at%2017-15-46%20Discover%20Music%20App.png
  - https://raw.githubusercontent.com/vietbui1999ru/spotifyswipe/main/demo/Screenshot%202026-03-03%20at%2017-16-18%20Discover%20Music%20App.png
  - https://raw.githubusercontent.com/vietbui1999ru/spotifyswipe/main/demo/Screenshot%202026-03-03%20at%2017-24-24%20Discover%20Music%20App.png
links:
  - icon: github
    url: https://github.com/vietbui1999ru/spotifyswipe
graph_node: true
---

Built a Spotify Web Application using Next.js, React, and Neon. Users can discover music from Spotify or LastFm, save and share playlists, and like or comment on others' playlists. Includes an admin mode for traffic monitoring and user interaction analytics.
```

- [ ] **Step 5: proxmox-homelab.md**

```markdown
---
title: "Proxmox Multi-VM Homelab with DevOps Monitoring-Stack"
summary: "Multi-VM infrastructure managing 15+ devices with Prometheus, Grafana, Terraform, and Ansible automation."
date: 2025-09-01
featured: false
draft: false
status: active
badges: [Proxmox, Prometheus, Grafana, Terraform, Ansible, Docker, "Nginx Proxy Manager", "WireGuard VPN", GitLab]
graph_node: true
---

Architected multi-VM infrastructure managing 15+ devices with 99.5% uptime through automated health monitoring and systematic capacity planning. Deployed Grafana dashboards for real-time monitoring, reducing MTTR by 50% through automated alerting on hardware and software anomalies.
```

- [ ] **Step 6: ai-course-scheduler.md**

```markdown
---
title: "LangChain AI-assisted College Student Course Scheduler and Planner"
summary: "LLM-powered scheduler that builds personalized course plans from catalog data and student preferences."
date: 2024-05-01
featured: false
draft: false
status: archived
badges: [LangChain, React, TypeScript, "Tailwind CSS", "Shadcn UI", Python, FastAPI]
links:
  - icon: github
    url: https://github.com/vietbui1999ru/perpetuallylearningscheduler
graph_node: true
---

Built an AI-assisted course scheduling platform that uses LangChain agents to parse college catalogs and generate personalized multi-semester plans based on student goals, prerequisites, and credit load constraints.
```

- [ ] **Step 7: golang-ethernet-switch.md**

```markdown
---
title: "Golang Software-Defined Ethernet Switch"
summary: "Layer 2 Ethernet switch in Go implementing IEEE 802.3 with zero-deadlock concurrent forwarding."
date: 2024-11-01
featured: false
draft: false
status: shipped
badges: [Go, "IEEE 802.3", "L2 Networking", Concurrency, "Performance Testing"]
links:
  - icon: github
    url: https://github.com/vietbui1999ru/ethswitch-vietbui1999ru
graph_node: true
---

Engineered a Layer 2 Ethernet switch in Go implementing IEEE 802.3 with zero-deadlock concurrent MAC address learning and frame forwarding. Includes a performance test harness measuring throughput under concurrent load.
```

- [ ] **Step 8: golang-shell.md**

```markdown
---
title: "Golang Shell with Automated Testing"
summary: "Unix-like shell in Go with CI/CD-enforced automated test suite."
date: 2024-10-01
featured: false
draft: false
status: shipped
badges: [Go, Testing, "GitHub Actions", YAML, "CI/CD"]
links:
  - icon: github
    url: https://github.com/vietbui1999ru/codecrafters-shell-go
graph_node: true
---

Developed a Unix-like shell in Go emphasizing safety and performance. CI pipeline runs the automated test suite on every push, verifying correctness of shell built-ins, piping, redirection, and process management.
```

- [ ] **Step 9: ray-tracing-go.md**

```markdown
---
title: "Ray Tracing In Go"
summary: "Ray tracer in Go based on Ray Tracing in One Weekend, extended with OpenGL/GLFW real-time preview."
date: 2024-08-01
featured: false
draft: false
status: shipped
badges: [Go, OpenGL, GLFW, "Ray Tracing"]
links:
  - icon: github
    url: https://github.com/vietbui1999ru/RayTracingInGo
graph_node: true
---

Built a ray tracer in Go following the Ray Tracing in One Weekend book, then extended it with real-time GLFW/OpenGL preview rendering. Implements diffuse, metal, and dielectric materials with configurable scene geometry and anti-aliasing.
```

- [ ] **Step 10: Commit all project markdown files**

```bash
git add vendor/vault/Portfolio/Projects/
git commit -m "feat(projects): migrate all 9 projects from JSON to vault markdown"
```

---

## Task 10: Delete projects.json and projectsData.ts

**Files:**
- Delete: `src/data/projects.json`
- Delete: `src/data/projectsData.ts`

- [ ] **Step 1: Verify nothing imports projectsData**

```bash
grep -r "projectsData\|projects\.json" src/ --include="*.ts" --include="*.tsx" --include="*.astro"
```

Expected: no output.

- [ ] **Step 2: Delete the files**

```bash
rm src/data/projects.json src/data/projectsData.ts
```

- [ ] **Step 3: Verify TypeScript still compiles clean**

```bash
npx tsc --noEmit 2>&1 | grep -v "Experience.tsx\|Singularity.tsx\|content/config.ts" | grep "error TS"
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add -u
git commit -m "chore(projects): delete projects.json and projectsData.ts — replaced by vault content collection"
```

---

## Task 11: Full build verification

- [ ] **Step 1: Run full build**

```bash
npm run build 2>&1 | tail -20
```

Expected: copy script logs all 9 projects, Astro build completes with no errors.

- [ ] **Step 2: Verify public assets**

```bash
ls public/assets/projects/ 2>/dev/null || echo "no local vault images (all URLs)"
```

Expected: empty or missing is fine — all current images are external URLs.

- [ ] **Step 3: Run tests**

```bash
npm run test 2>&1 | grep -E "(PASS|FAIL)"
```

Expected: all PASS.

- [ ] **Step 4: Final commit**

```bash
git add .
git commit -m "feat(projects): complete project card system — vault markdown, pre-build image copy, markdown-body modal"
```

---

## Self-Review

**Spec coverage:**
- Markdown-per-project with frontmatter schema — Task 1, 2, 9
- `Portfolio/Projects/` vault location — Task 3
- `Assets/Projects/<slug>/` image convention — Task 4
- URL + vault filename images duck-typed — Task 4 (`isUrl()`), Task 7 (`resolveImageUrl()`)
- Markdown-body modal via `entry.rendered?.html` — Task 7, 8
- Icon slugs with simple-icons + lucide fallback — Task 6, 7
- Full replace of `projects.json` — Task 10
- `featured` float + date sort — Task 8
- Pre-build copy script in `npm run build` — Task 5
- Obsidian template — Task 3
- All 9 projects migrated — Task 9
- DOMPurify sanitization on rendered HTML — Task 5, 7

**Type consistency:**
- `ProjectCardData` defined in `Projects.tsx`, imported via `type` in `index.astro` — consistent
- `resolveIcon(slug)` returns `ComponentType<IconProps>` — used as JSX in Task 7 — correct
- `projectSchema` `featured`/`draft` defaults used in collection filter — consistent

**Known limitation:** `entry.rendered?.html` returns `""` if Astro has not pre-rendered the entry. Component falls back to `project.summary` — graceful, no crash.
