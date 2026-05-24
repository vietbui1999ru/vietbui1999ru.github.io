# Blog Style Variants Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add per-blog-post style variant tabs (Original / AI / custom character style) with shadcn scramble-text animation when switching tabs.

**Architecture:** Companion files (`post.ai.md`, `post.yoda.md`) live beside the canonical post in the Obsidian vault. A second Astro content collection `blog-variants` picks them up. The `[...slug].astro` page loads variants for the current slug, renders each to HTML at build time, and passes the HTML blobs to a React `BlogVariantTabs` client component. The tab component handles all runtime switching and scramble animation. All HTML is rendered by Astro's own remark pipeline from trusted vault content — `dangerouslySetInnerHTML` is acceptable because the source is our own markdown, not user input.

**Tech Stack:** Astro 5 content collections (glob loader), React (client:load), shadcn/ui scramble-text, Vitest/jsdom for unit tests.

---

## File Map

| Path | Action | Responsibility |
|------|--------|---------------|
| `src/content/schemas.ts` | Modify | Add `blogVariantSchema` |
| `src/content/config.ts` | Modify | Add `blog-variants` collection; restrict `blog` glob to exclude `*.*.md` |
| `src/pages/blog/[...slug].astro` | Modify | Load variants, render to HTML, pass to tab component |
| `src/components/blog/BlogVariantTabs.tsx` | Create | Tab strip + scramble animation orchestration |
| `src/components/ui/scramble-text.tsx` | Create | Scramble-text component (viewport-visible, 700ms, bidirectional, interrupt+restart) |
| `vendor/vault/Blogs/building-a-vault-cms-pipeline.ai.md` | Create | Sample AI variant for test post |
| `vendor/vault/Blogs/building-a-vault-cms-pipeline.yoda.md` | Create | Sample Yoda variant for test post |
| `~/.claude/skills/style-blog.md` | Create | CC skill for generating style variants |
| `docs/style-guides/` | Create dir | Style guide files (gitignored) |
| `.gitignore` | Modify | Add `docs/style-guides/` |

---

## Task 1: Schema + Collection Config

**Files:**
- Modify: `src/content/schemas.ts`
- Modify: `src/content/config.ts`

- [ ] **Step 1: Add `blogVariantSchema` to schemas.ts**

Add after `blogSchema` in `src/content/schemas.ts`:

```ts
export const blogVariantSchema = z.object({
  // style_label shown in tab strip (e.g. "Yoda", "AI")
  style_label: z.string(),
  // slug of the parent post (e.g. "building-a-vault-cms-pipeline")
  parent_slug: z.string(),
});

export type BlogVariantEntry = z.infer<typeof blogVariantSchema>;
```

Also add to the exports at the bottom:
```ts
export type BlogVariantEntry = z.infer<typeof blogVariantSchema>;
```

- [ ] **Step 2: Update config.ts — restrict blog glob + add blog-variants collection**

Replace `src/content/config.ts` entirely:

```ts
import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { blogSchema, blogVariantSchema, gallerySchema } from "@/content/schemas";

// Canonical posts only — companion files (post.ai.md) have two dots and are excluded
const blog = defineCollection({
  loader: glob({
    pattern: "**/*.md",
    base: "./vendor/vault/Blogs",
    // Exclude files matching *.*.md (companion variants like post.ai.md)
    exclude: ["**/*.*.md"],
  }),
  schema: blogSchema,
});

// Companion variant files: post.ai.md, post.yoda.md, etc.
const blogVariants = defineCollection({
  loader: glob({
    pattern: "**/*.*.md",
    base: "./vendor/vault/Blogs",
  }),
  schema: blogVariantSchema,
});

const gallery = defineCollection({
  loader: glob({
    pattern: "**/*.md",
    base: "./vendor/vault/Gallery",
  }),
  schema: gallerySchema,
});

export const collections = {
  blog,
  "blog-variants": blogVariants,
  gallery,
};
```

- [ ] **Step 3: Run build to verify no schema errors**

```bash
cd /Users/vietquocbui/repos/VsCode/vietbui1999ru/Portfolio/vietbui1999ru.github.io
pnpm run build 2>&1 | tail -30
```

Expected: build succeeds (0 variant files yet = no entries, fine).

- [ ] **Step 4: Commit**

```bash
git add src/content/schemas.ts src/content/config.ts
git commit -m "feat(content): add blog-variants collection with blogVariantSchema"
```

---

## Task 2: Update `[...slug].astro` to load and pass variants

**Files:**
- Modify: `src/pages/blog/[...slug].astro`

In Astro 5, use `experimental_AstroContainer` to render content entries to HTML strings at SSG time. First verify the API is available in the project's Astro version.

- [ ] **Step 1: Check Astro version and Container API availability**

```bash
cd /Users/vietquocbui/repos/VsCode/vietbui1999ru/Portfolio/vietbui1999ru.github.io
node -e "const a = require('./node_modules/astro/package.json'); console.log(a.version)"
```

Expected: 5.x.x. Container API (`experimental_AstroContainer`) is available in Astro 5+.

- [ ] **Step 2: Replace frontmatter in `[...slug].astro`**

Replace lines 1–23 (the `---` frontmatter block):

```astro
---
import BaseLayout from "@/layouts/BaseLayout.astro";
import { getCollection, render } from "astro:content";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import BlogVariantTabs from "@/components/blog/BlogVariantTabs";

export async function getStaticPaths() {
  const blogEntries = await getCollection("blog");
  return blogEntries.map((entry) => ({
    params: { slug: entry.id },
    props: { entry },
  }));
}

const { entry } = Astro.props;

// Render entries to HTML using Astro's container (trusted build-time content)
const container = await AstroContainer.create();
const { Content: OriginalContent } = await render(entry);
const originalHtml = await container.renderToString(OriginalContent);

// Load all variants for this slug
const allVariants = await getCollection("blog-variants", (v) =>
  v.data.parent_slug === entry.id
);

// tabs: [{ label, html }] — original always first
type TabData = { label: string; html: string };
const tabs: TabData[] = [{ label: "Original", html: originalHtml }];

for (const variant of allVariants) {
  const { Content: VContent } = await render(variant);
  const variantHtml = await container.renderToString(VContent);
  tabs.push({ label: variant.data.style_label, html: variantHtml });
}

// Ensure AI tab is always second if present
const aiIdx = tabs.findIndex((t) => t.label.toLowerCase() === "ai");
if (aiIdx > 1) {
  const [aiTab] = tabs.splice(aiIdx, 1);
  tabs.splice(1, 0, aiTab);
}

const wordCount = (entry.body ?? "").trim().split(/\s+/).length;
const readingTime = `${Math.max(1, Math.round(wordCount / 200))} min read`;
const formattedDate = entry.data.date.toLocaleDateString("en-US", {
  year: "numeric",
  month: "long",
  day: "numeric",
});
---
```

- [ ] **Step 3: Replace the `<div class="prose ..."><Content /></div>` block**

Replace lines 71–83 in the template:

```astro
    <BlogVariantTabs
      client:load
      tabs={tabs}
      proseClass="prose prose-neutral dark:prose-invert
             prose-headings:font-semibold prose-headings:tracking-tight
             prose-a:text-primary prose-a:no-underline hover:prose-a:underline
             prose-code:before:content-none prose-code:after:content-none
             prose-code:rounded prose-code:px-1.5 prose-code:py-0.5
             prose-code:bg-secondary prose-code:text-secondary-foreground prose-code:font-normal
             prose-pre:rounded-lg prose-pre:border prose-pre:border-border
             max-w-none"
    />
```

- [ ] **Step 4: Run build to verify AstroContainer works**

```bash
pnpm run build 2>&1 | grep -E "(error|Error|built)" | tail -20
```

Expected: build completes, no AstroContainer errors.

- [ ] **Step 5: Commit**

```bash
git add src/pages/blog/[...slug].astro
git commit -m "feat(blog): load and pre-render style variants at build time"
```

---

## Task 3: Create `BlogVariantTabs` React component

**Files:**
- Create: `src/components/blog/BlogVariantTabs.tsx`

- [ ] **Step 1: Create the directory if needed**

```bash
mkdir -p /Users/vietquocbui/repos/VsCode/vietbui1999ru/Portfolio/vietbui1999ru.github.io/src/components/blog
```

- [ ] **Step 2: Write the component**

```tsx
"use client";

import React, { useState, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import ScrambleText from "@/components/ui/scramble-text";

interface TabData {
  label: string;
  html: string;
}

interface BlogVariantTabsProps {
  tabs: TabData[];
  proseClass?: string;
}

export default function BlogVariantTabs({ tabs, proseClass }: BlogVariantTabsProps) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [scrambleKey, setScrambleKey] = useState(0);

  const handleTabClick = useCallback(
    (idx: number) => {
      if (idx === activeIdx) return; // no-op same tab
      setActiveIdx(idx);
      setScrambleKey((k) => k + 1); // new key = interrupt + restart scramble
    },
    [activeIdx]
  );

  // Single tab: render without tab strip
  if (tabs.length <= 1) {
    return (
      // HTML is Astro-rendered from trusted vault markdown — not user input
      <div
        className={cn(proseClass)}
        dangerouslySetInnerHTML={{ __html: tabs[0]?.html ?? "" }}
      />
    );
  }

  return (
    <div>
      <div className="flex gap-1 mb-6 border-b border-border" role="tablist">
        {tabs.map((tab, idx) => (
          <button
            key={tab.label}
            role="tab"
            aria-selected={idx === activeIdx}
            onClick={() => handleTabClick(idx)}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-t transition-colors -mb-px border-b-2",
              idx === activeIdx
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <ScrambleText
        key={scrambleKey}
        html={tabs[activeIdx].html}
        className={cn(proseClass)}
      />
    </div>
  );
}
```

- [ ] **Step 3: Run type check**

```bash
pnpm run build 2>&1 | grep -i "type error" | head -10
```

Expected: no type errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/blog/BlogVariantTabs.tsx
git commit -m "feat(blog): add BlogVariantTabs component with tab strip"
```

---

## Task 4: Implement `ScrambleText` component

**Files:**
- Create (or replace): `src/components/ui/scramble-text.tsx`

First attempt to install via shadcn, then extend/replace with our viewport-aware version.

- [ ] **Step 1: Attempt shadcn install**

```bash
cd /Users/vietquocbui/repos/VsCode/vietbui1999ru/Portfolio/vietbui1999ru.github.io
pnpm dlx shadcn@latest add scramble-text 2>&1
```

If it installs successfully, check what it created:

```bash
cat src/components/ui/scramble-text.tsx | head -30
```

If the component expects `text: string` (plain string) rather than `html: string`, we need to replace it with our own implementation.

- [ ] **Step 2: Write the ScrambleText implementation**

Regardless of what shadcn installed, write the final version to `src/components/ui/scramble-text.tsx`:

```tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
// Total 700ms: 350ms scramble-out then 350ms scramble-in
const PHASE_DURATION_MS = 350;

function randomChar() {
  return CHARS[Math.floor(Math.random() * CHARS.length)];
}

// Extract plain text from an HTML string via temporary DOM element (build/browser only)
function extractText(html: string): string {
  if (typeof document === "undefined") return html.replace(/<[^>]*>/g, "");
  const div = document.createElement("div");
  // HTML is from Astro's remark pipeline (trusted source — vault markdown)
  div.innerHTML = html;
  return div.textContent ?? "";
}

interface ScrambleTextProps {
  html: string;
  className?: string;
}

export default function ScrambleText({ html, className }: ScrambleTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  // displayHtml drives what's shown — starts as real HTML, transitions through scrambled text
  const [displayHtml, setDisplayHtml] = useState(html);
  const prevHtmlRef = useRef(html);
  const rafRef = useRef<number | null>(null);

  // Viewport visibility gate — only animate when content is on screen
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Scramble effect — triggers when html prop changes (driven by key change in parent)
  useEffect(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    if (!isVisible) {
      // Off-screen: instant swap
      setDisplayHtml(html);
      prevHtmlRef.current = html;
      return;
    }

    const fromText = extractText(prevHtmlRef.current);
    const toText = extractText(html);
    const maxLen = Math.max(fromText.length, toText.length);

    let phase: "out" | "in" = "out";
    let startTime: number | null = null;

    function step(timestamp: number) {
      if (startTime === null) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / PHASE_DURATION_MS, 1);

      // Left-to-right: resolved chars revealed from index 0 outward
      const resolvedCount = Math.floor(progress * maxLen);
      const source = phase === "out" ? fromText : toText;
      let scrambled = "";
      for (let i = 0; i < maxLen; i++) {
        scrambled += i < resolvedCount ? (source[i] ?? "") : randomChar();
      }

      // Wrap in aria-hidden span so screen readers see the real content below
      setDisplayHtml(
        `<span aria-hidden="true" style="white-space:pre-wrap">${scrambled}</span>`
      );

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else if (phase === "out") {
        phase = "in";
        startTime = null;
        rafRef.current = requestAnimationFrame(step);
      } else {
        // Done — show real rendered HTML
        setDisplayHtml(html);
        prevHtmlRef.current = html;
        rafRef.current = null;
      }
    }

    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  // html changes trigger the effect; isVisible change triggers re-evaluation
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [html, isVisible]);

  return (
    <div
      ref={containerRef}
      className={cn(className)}
      // HTML is from Astro's own remark pipeline (trusted vault markdown, not user input)
      dangerouslySetInnerHTML={{ __html: displayHtml }}
    />
  );
}
```

- [ ] **Step 3: Write unit tests**

Create `tests/scramble-text.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, act } from "@testing-library/react";
import ScrambleText from "@/components/ui/scramble-text";

// IntersectionObserver mock
const observeCallbacks = new Map<Element, (entries: IntersectionObserverEntry[]) => void>();
vi.stubGlobal(
  "IntersectionObserver",
  vi.fn((callback: (entries: IntersectionObserverEntry[]) => void) => ({
    observe: (el: Element) => { observeCallbacks.set(el, callback); },
    disconnect: vi.fn(),
  }))
);

// rAF mock
vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
  cb(performance.now());
  return 0;
});
vi.stubGlobal("cancelAnimationFrame", vi.fn());

describe("ScrambleText", () => {
  it("renders initial html immediately when not yet visible", () => {
    const { container } = render(<ScrambleText html="<p>hello world</p>" />);
    expect(container.textContent).toContain("hello world");
  });

  it("swaps html without animation when not visible", () => {
    const { container, rerender } = render(<ScrambleText html="<p>first</p>" />);
    rerender(<ScrambleText html="<p>second</p>" />);
    expect(container.textContent).toContain("second");
  });

  it("shows real html after animation completes when visible", async () => {
    const { container, rerender } = render(<ScrambleText html="<p>start</p>" />);

    // Trigger visibility
    const el = container.firstChild as Element;
    const callback = observeCallbacks.get(el);
    if (callback) {
      act(() =>
        callback([{ isIntersecting: true } as IntersectionObserverEntry])
      );
    }

    rerender(<ScrambleText html="<p>end</p>" />);
    // After rAF mock runs synchronously, final html is set
    expect(container.textContent).toContain("end");
  });
});
```

Run:

```bash
pnpm run test tests/scramble-text.test.tsx 2>&1 | tail -20
```

Expected: 3 tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/scramble-text.tsx tests/scramble-text.test.tsx
git commit -m "feat(ui): add viewport-visible bidirectional ScrambleText component"
```

---

## Task 5: Sample companion files in vault

**Files:**
- Create: `vendor/vault/Blogs/building-a-vault-cms-pipeline.ai.md`
- Create: `vendor/vault/Blogs/building-a-vault-cms-pipeline.yoda.md`

- [ ] **Step 1: Create AI variant**

Write `vendor/vault/Blogs/building-a-vault-cms-pipeline.ai.md`:

```markdown
---
style_label: AI
parent_slug: building-a-vault-cms-pipeline
---

## The Problem

Manual file management is a universal friction point in publishing workflows. I wanted to eliminate the drag-and-drop tedium between Obsidian (my vault) and my Astro-based portfolio — without sacrificing content ownership.

The $\ln(x)$ analogy captures this well: front-loading the tooling investment yields diminishing marginal cost per post over time. Build the workflow once; write freely thereafter.

## Solution: Git Submodule + Remark Pipeline

The approach treats the Obsidian vault as a git submodule. Three sync scripts handle the publication boundary:

1. `sync-vault.sh` — copies published posts from vault to submodule
2. `sync-assets.sh` — copies referenced attachments
3. `sync-full.sh` — runs both, commits, and pushes

Remark plugins (`remarkEmbeds`, `remarkWikilinks`, `remarkCallout`) handle Obsidian-flavored markdown at build time. Wikilink resolution uses a pre-built slug index generated at config-load time.

This architecture cleanly separates authoring concerns (vault) from publishing concerns (Astro), and keeps the portfolio repo free of manual edits.
```

- [ ] **Step 2: Create Yoda variant**

Write `vendor/vault/Blogs/building-a-vault-cms-pipeline.yoda.md`:

```markdown
---
style_label: Yoda
parent_slug: building-a-vault-cms-pipeline
---

## The Problem

Annoyed with manual file dragging, I am. Folders between which to drag files, there should not be. A wiser path, automation is.

Write I wish to — technical tales, life learnings, journal entries of mine. Immortalized on the internet, they shall be. But seamless first the workflow must become.

Like $\ln(x)$ this journey is: steep at the start, the learning curve appears. Past the inflection point, effortless it all becomes. Build the flow first, then freely write I can.

## Solution: The Pipeline, Built It Was

A git submodule — the vault becomes. Scripts three, there are:

- `sync-vault.sh` — published posts it copies
- `sync-assets.sh` — attachments it moves
- `sync-full.sh` — both it runs, commits and pushes it does

Remark plugins handle Obsidian markdown at build time, hmm. Wiki-links resolved they are. Embeds copied they become. Callouts rendered, they shall be.

Separate, authoring and publishing must remain. The vault for writing. Astro for publishing. Clean, this separation is.
```

- [ ] **Step 3: Run build — verify 2 variant entries load**

```bash
pnpm run build 2>&1 | grep -i "blog-variant\|variant\|collection" | head -10
```

Expected: Astro processes blog-variants collection with 2 entries.

- [ ] **Step 4: Commit**

```bash
git add vendor/vault/Blogs/building-a-vault-cms-pipeline.ai.md vendor/vault/Blogs/building-a-vault-cms-pipeline.yoda.md
git commit -m "feat(vault): add AI and Yoda style variants for pipeline post"
```

---

## Task 6: Style guides directory + gitignore

**Files:**
- Modify: `.gitignore`
- Create: `docs/style-guides/yoda.md`

- [ ] **Step 1: Check .gitignore for existing style-guides entry**

```bash
grep -n "style-guides" /Users/vietquocbui/repos/VsCode/vietbui1999ru/Portfolio/vietbui1999ru.github.io/.gitignore || echo "not found"
```

- [ ] **Step 2: Add to .gitignore if missing**

Append to `.gitignore`:
```
# Style guides (local authoring aids, not for publication)
docs/style-guides/
```

- [ ] **Step 3: Create sample Yoda style guide**

Write `docs/style-guides/yoda.md`:

```markdown
# Yoda Style Guide

## Voice
Inverted sentence structure (object–subject–verb order). Deliberate, wise pacing.
Present tense preferred. Occasional rhetorical questions.

## Sentence patterns
- "Strong with you, the [noun] is."
- "[Verb] you must."
- "Hmm, yes. [observation]"
- "[adjective], this [noun] is."

## Vocabulary
- Avoid modern slang and colloquialisms
- Prefer timeless nouns: path, journey, wisdom, balance, force
- Replace "I am [adj]" → "[adj], I am" or "Am I [adj]"

## Preservation rules (always keep as-is)
- LaTeX math: `$...$` and `$$...$$`
- Code blocks and inline code
- Wikilinks: `[[...]]`
- Image embeds: `![[...]]`
- Markdown heading levels

## Example transformation
Original: "I wanted to eliminate manual file management."
Yoda:     "Eliminate manual file management, I wanted to."

Original: "The pipeline runs three scripts."
Yoda:     "Three scripts, the pipeline runs."
```

- [ ] **Step 4: Commit**

```bash
git add .gitignore docs/style-guides/yoda.md
git commit -m "chore: gitignore style-guides dir; add yoda style guide sample"
```

---

## Task 7: Create `/style-blog` CC skill

**Files:**
- Create: `~/.claude/skills/style-blog.md`

- [ ] **Step 1: Write the skill**

Write `~/.claude/skills/style-blog.md`:

```markdown
---
name: style-blog
description: Generate or update a blog post style variant. Supports named styles (ai, yoda, shakespeare, etc.). Uses Ollama by default (cost/privacy); falls back to Claude if unavailable.
---

# style-blog

Generate a style variant for a blog post in the Obsidian vault.

## Usage

Called as: `/style-blog <post-slug> <style-name>`

Examples:
- `/style-blog building-a-vault-cms-pipeline yoda`
- `/style-blog my-post ai`

## Workflow

### Step 1: Locate the canonical post

Look for: `vendor/vault/Blogs/<slug>.md`

If not found, list all `.md` files in `vendor/vault/Blogs/` (excluding `*.*.md`) and ask user to pick.

### Step 2: Check for existing variant

Check for `vendor/vault/Blogs/<slug>.<style>.md`:
- **Exists**: Show first 200 characters. Ask: "overwrite / update / cancel?"
- **Not found**: Proceed to Step 3.

### Step 3: Load or create style guide

Style guide path: `docs/style-guides/<style>.md`

- **Exists**: Read and use as generation reference.
- **Not found**: Generate a style guide for `<style>` from general knowledge. Write to `docs/style-guides/<style>.md`. Tell user: "Style guide created at docs/style-guides/<style>.md — edit it to tune the voice before regenerating."

Style guide must cover: voice rules, sentence patterns, vocabulary, preservation rules (code/math/wikilinks), example transformations.

### Step 4: Select model

Check Ollama availability:

```bash
curl -s http://localhost:11434/api/tags 2>/dev/null | python3 -c "
import sys, json
data = json.load(sys.stdin)
models = [m['name'] for m in data.get('models', [])]
capable = [m for m in models if any(k in m for k in ['gemma', 'llama', 'mistral', 'qwen'])]
print(capable[0] if capable else '')
" 2>/dev/null
```

- If a capable model name is returned: use Ollama.
- If empty or error: use current Claude session (skip curl step below).

### Step 5: Generate variant content

**System prompt** (used for both Ollama and Claude):

```
You are a writing style transformer. Rewrite the blog post below using the provided style guide.

RULES:
- Preserve all technical facts exactly
- Keep all LaTeX math ($...$ and $$...$$) unchanged
- Keep all wikilinks ([[...]]) and image embeds (![[...]]) unchanged
- Keep all code blocks unchanged
- Preserve markdown heading structure
- Only transform prose sentences — word choice, phrasing, sentence structure
- Do NOT add or remove sections
- Output only the transformed body (no frontmatter)

STYLE GUIDE:
{style_guide_contents}

POST TO TRANSFORM:
{post_body_without_frontmatter}
```

**Ollama call:**

```bash
curl -s http://localhost:11434/api/generate \
  -H "Content-Type: application/json" \
  -d "{\"model\": \"<model>\", \"prompt\": \"<escaped-prompt>\", \"stream\": false}" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['response'])"
```

**Claude fallback:** if using Claude, call the generation directly in the session.

### Step 6: Write the variant file

Write to `vendor/vault/Blogs/<slug>.<style>.md`:

```markdown
---
style_label: <Display Name>
parent_slug: <slug>
---

<generated content>
```

Display name: capitalize first letter of style name (e.g. "yoda" → "Yoda", "ai" → "AI").

### Step 7: Offer sync

Ask user: "Variant written to vendor/vault/Blogs/<slug>.<style>.md. Run sync-full.sh to publish? (y/n)"

If yes:
```bash
ls sync-full.sh scripts/sync-full.sh 2>/dev/null | head -1
```
Run whichever exists. If neither found, tell user to run it manually.
```

- [ ] **Step 2: Verify file written**

```bash
head -5 ~/.claude/skills/style-blog.md
```

Expected: frontmatter lines for name and description.

- [ ] **Step 3: No repo commit — personal config file**

This file lives in `~/.claude/skills/` and is picked up automatically by CC in all projects. No git action needed.

---

## Self-Review

**Spec coverage:**
- Companion files (`post.ai.md`, `post.yoda.md`) — Task 5
- Second content collection `blog-variants` — Task 1
- Tab strip UI — Task 3
- Scramble-text animation — Task 4
- Viewport-visible only — Task 4 (IntersectionObserver)
- 700ms total (350ms out + 350ms in) — Task 4
- Bidirectional — Task 4 (phase out then in)
- Interrupt + restart — Task 3 (key prop increment on tab click)
- No-op same tab — Task 3 (`if (idx === activeIdx) return`)
- Original + AI required, others optional — Task 3 (single-tab fallback; AI moved to idx 1)
- `style_label` frontmatter — Task 1
- Style guides directory (gitignored) — Task 6
- `/style-blog` CC skill — Task 7
- Ollama default, Claude fallback — Task 7
- Auto-offer sync-full.sh — Task 7

**Placeholder scan:** None.

**Type consistency:**
- `TabData = { label: string; html: string }` defined in BlogVariantTabs.tsx; matches usage in `[...slug].astro`
- `blogVariantSchema` exported from schemas.ts, imported in config.ts
- `ScrambleText` props: `{ html: string; className?: string }` — matches usage in BlogVariantTabs

**Known risk:** `experimental_AstroContainer` is marked experimental in Astro 5. Task 2, Step 1 verifies version. If the API is unavailable or broken, fallback: render each variant as a hidden `<div>` in the Astro template and pass a slot reference — but this prevents client-side switching. The AstroContainer approach is the correct path; verify before proceeding.
