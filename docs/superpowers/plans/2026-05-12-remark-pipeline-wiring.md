# Remark Pipeline Wiring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire `remarkEmbeds` and `remarkWikilinks` into `astro.config.ts` so blog posts can use `![[image.png]]` embed syntax and `[[other-post]]` wikilinks.

**Architecture:** Two new utility modules — `vault.ts` (resolves Obsidian vault path + branch safety warning) and `build-wikilink-index.ts` (scans `src/content/blog/` frontmatter synchronously to produce a `WikilinkIndex`) — are called at `astro.config.ts` load time before Astro's markdown pipeline runs.

**Tech Stack:** Node.js built-ins (`fs`, `child_process.execFileSync`, `os`, `path`), existing `createAssetAdapters` from `src/lib/remark/adapters.ts`, Vitest for tests.

---

## File Map

| Action | Path                                     | Responsibility                          |
| ------ | ---------------------------------------- | --------------------------------------- |
| Create | `src/lib/vault.ts`                       | Vault root resolution + branch warning  |
| Create | `src/lib/build-wikilink-index.ts`        | Sync frontmatter scan → `WikilinkIndex` |
| Modify | `astro.config.ts`                        | Wire all three remark plugins           |
| Create | `tests/lib/vault.test.ts`                | Unit tests for `vault.ts`               |
| Create | `tests/lib/build-wikilink-index.test.ts` | Unit tests for index builder            |

---

## Task 1: `src/lib/vault.ts`

**Files:**

- Create: `src/lib/vault.ts`
- Create: `tests/lib/vault.test.ts`

- [ ] **Step 1.1: Write failing tests**

Create `tests/lib/vault.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import os from "node:os";

vi.mock("node:child_process", () => ({
  execFileSync: vi.fn(),
}));

import { execFileSync } from "node:child_process";
import { getVaultRoot, warnIfNotMain } from "@/lib/vault";

const mockExecFileSync = vi.mocked(execFileSync);

beforeEach(() => {
  delete process.env.VAULT_ROOT;
  vi.clearAllMocks();
});

afterEach(() => {
  delete process.env.VAULT_ROOT;
});

describe("getVaultRoot", () => {
  it("returns VAULT_ROOT env var when set (absolute path)", () => {
    process.env.VAULT_ROOT = "/custom/vault";
    expect(getVaultRoot()).toBe("/custom/vault");
  });

  it("expands leading ~ to home directory", () => {
    process.env.VAULT_ROOT = "~/my/vault";
    expect(getVaultRoot()).toBe(`${os.homedir()}/my/vault`);
  });

  it("defaults to ~/repos/Obsidian when env not set", () => {
    expect(getVaultRoot()).toBe(`${os.homedir()}/repos/Obsidian`);
  });
});

describe("warnIfNotMain", () => {
  it("does not warn when vault is on main branch", () => {
    mockExecFileSync.mockReturnValue("main\n" as any);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    warnIfNotMain("/some/vault");
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it("warns when vault is on a non-main branch", () => {
    mockExecFileSync.mockReturnValue("jobs-network\n" as any);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    warnIfNotMain("/some/vault");
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("jobs-network"));
    warn.mockRestore();
  });

  it("warns when git command fails (vault not found)", () => {
    mockExecFileSync.mockImplementation(() => {
      throw new Error("not a git repo");
    });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    warnIfNotMain("/nonexistent");
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
```

- [ ] **Step 1.2: Run test to verify it fails**

```bash
pnpm test tests/lib/vault.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/vault'`

- [ ] **Step 1.3: Implement `src/lib/vault.ts`**

```typescript
import { execFileSync } from "node:child_process";
import os from "node:os";
import path from "node:path";

export function getVaultRoot(): string {
  const env = process.env.VAULT_ROOT;
  if (env) {
    return env.startsWith("~") ? path.join(os.homedir(), env.slice(1)) : env;
  }
  return path.join(os.homedir(), "repos", "Obsidian");
}

export function warnIfNotMain(vaultRoot: string): void {
  try {
    const branch = execFileSync("git", ["branch", "--show-current"], {
      cwd: vaultRoot,
      encoding: "utf-8",
    }).trim();
    if (branch !== "main") {
      console.warn(
        `[vault] WARNING: Obsidian vault is on branch '${branch}', not 'main'. ` +
          `Embeds may reference wrong attachments.`,
      );
    }
  } catch {
    console.warn(`[vault] WARNING: Could not check vault branch at ${vaultRoot}`);
  }
}
```

- [ ] **Step 1.4: Run tests to verify pass**

```bash
pnpm test tests/lib/vault.test.ts
```

Expected: 6 tests pass, 0 failures.

- [ ] **Step 1.5: Commit**

```bash
git add src/lib/vault.ts tests/lib/vault.test.ts
git commit -m "feat(blog): vault root resolver + branch warning"
```

---

## Task 2: `src/lib/build-wikilink-index.ts`

**Files:**

- Create: `src/lib/build-wikilink-index.ts`
- Create: `tests/lib/build-wikilink-index.test.ts`

- [ ] **Step 2.1: Write failing tests**

Create `tests/lib/build-wikilink-index.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { buildWikilinkIndex } from "@/lib/build-wikilink-index";

let tmp: string;

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "wikilink-index-test-"));
});

afterEach(() => {
  fs.rmSync(tmp, { recursive: true, force: true });
});

function write(filename: string, content: string) {
  fs.writeFileSync(path.join(tmp, filename), content);
}

describe("buildWikilinkIndex", () => {
  it("returns empty posts map when directory is empty", () => {
    const index = buildWikilinkIndex(tmp);
    expect(index.posts.size).toBe(0);
  });

  it("returns empty maps for non-blog collections", () => {
    const index = buildWikilinkIndex(tmp);
    expect(index.projects.size).toBe(0);
    expect(index.roles.size).toBe(0);
    expect(index.clippings.size).toBe(0);
  });

  it("indexes a published post by slug", () => {
    write(
      "hello-world.md",
      `---
title: Hello World
description: A test post
date: 2026-01-01
draft: false
---

Content here.`,
    );
    const index = buildWikilinkIndex(tmp);
    expect(index.posts.has("hello-world")).toBe(true);
    const entry = index.posts.get("hello-world")!;
    expect(entry.kind).toBe("blog");
    expect(entry.url).toBe("/blog/hello-world");
    expect(entry.title).toBe("Hello World");
  });

  it("skips draft posts", () => {
    write(
      "draft-post.md",
      `---
title: Draft
description: Not published
date: 2026-01-01
draft: true
---

Draft content.`,
    );
    const index = buildWikilinkIndex(tmp);
    expect(index.posts.has("draft-post")).toBe(false);
  });

  it("indexes multiple posts", () => {
    write("post-a.md", `---\ntitle: Post A\ndate: 2026-01-01\ndraft: false\n---\n`);
    write("post-b.md", `---\ntitle: Post B\ndate: 2026-01-02\ndraft: false\n---\n`);
    const index = buildWikilinkIndex(tmp);
    expect(index.posts.size).toBe(2);
    expect(index.posts.has("post-a")).toBe(true);
    expect(index.posts.has("post-b")).toBe(true);
  });

  it("uses filename as title fallback when frontmatter has no title", () => {
    write("no-title.md", `Content without frontmatter.`);
    const index = buildWikilinkIndex(tmp);
    const entry = index.posts.get("no-title");
    expect(entry?.title).toBe("no-title");
  });

  it("returns empty index when directory does not exist", () => {
    const index = buildWikilinkIndex("/nonexistent/path/xyz");
    expect(index.posts.size).toBe(0);
  });
});
```

- [ ] **Step 2.2: Run test to verify it fails**

```bash
pnpm test tests/lib/build-wikilink-index.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/build-wikilink-index'`

- [ ] **Step 2.3: Implement `src/lib/build-wikilink-index.ts`**

```typescript
import fs from "node:fs";
import path from "node:path";
import type { WikilinkIndex } from "@/lib/remark/wikilinks";

function parseFrontmatter(content: string): Record<string, string | boolean> {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  const fm: Record<string, string | boolean> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const kv = line.match(/^(\w+):\s*(.+)$/);
    if (!kv) continue;
    const [, key, raw] = kv;
    const val = raw.trim();
    fm[key] = val === "true" ? true : val === "false" ? false : val.replace(/^["']|["']$/g, "");
  }
  return fm;
}

export function buildWikilinkIndex(blogDir: string): WikilinkIndex {
  const index: WikilinkIndex = {
    posts: new Map(),
    projects: new Map(),
    roles: new Map(),
    education: new Map(),
    gallery: new Map(),
    clippings: new Map(),
  };

  let files: string[];
  try {
    files = (fs.readdirSync(blogDir, { recursive: true, encoding: "utf-8" }) as string[]).filter(
      (f) => f.endsWith(".md"),
    );
  } catch {
    return index;
  }

  for (const file of files) {
    const fullPath = path.join(blogDir, file);
    const content = fs.readFileSync(fullPath, "utf-8");
    const fm = parseFrontmatter(content);

    if (fm.draft === true) continue;

    const slug = path.basename(file, ".md");
    const title = typeof fm.title === "string" && fm.title ? fm.title : slug;

    index.posts.set(slug, { kind: "blog", url: `/blog/${slug}`, title });
  }

  return index;
}
```

- [ ] **Step 2.4: Run tests to verify pass**

```bash
pnpm test tests/lib/build-wikilink-index.test.ts
```

Expected: 7 tests pass, 0 failures.

- [ ] **Step 2.5: Run full test suite**

```bash
pnpm test
```

Expected: all tests pass (38 existing + 13 new = 51 total).

- [ ] **Step 2.6: Commit**

```bash
git add src/lib/build-wikilink-index.ts tests/lib/build-wikilink-index.test.ts
git commit -m "feat(blog): sync wikilink index builder from content/blog frontmatter"
```

---

## Task 3: Wire plugins in `astro.config.ts`

No new unit tests — verified by `pnpm build`.

**Files:**

- Modify: `astro.config.ts`

- [ ] **Step 3.1: Update `astro.config.ts`**

Replace the full content of `astro.config.ts` with:

```typescript
// @ts-check
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import path from "path";
import { fileURLToPath } from "url";
import { remarkPreview } from "./src/lib/remark/preview";
import { remarkEmbeds } from "./src/lib/remark/embeds";
import { remarkWikilinks } from "./src/lib/remark/wikilinks";
import { createAssetAdapters } from "./src/lib/remark/adapters";
import { getVaultRoot, warnIfNotMain } from "./src/lib/vault";
import { buildWikilinkIndex } from "./src/lib/build-wikilink-index";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const site = process.env.VERCEL
  ? process.env.VERCEL_ENV === "production"
    ? "https://vietbui1999ru.github.io"
    : `https://${process.env.VERCEL_URL}`
  : (process.env.SITE ?? "http://localhost:4321");
const base = process.env.BASE || "/";

const vaultRoot = getVaultRoot();
warnIfNotMain(vaultRoot);

const { copyAsset, resolveExcalidraw } = createAssetAdapters({
  attachmentsRoot: path.join(vaultRoot, "Attachments"),
  publicRoot: path.resolve(__dirname, "public"),
  excalidrawCacheDir: path.resolve(__dirname, ".cache/excalidraw"),
});

const wikilinkIndex = buildWikilinkIndex(path.resolve(__dirname, "src/content/blog"));

export default defineConfig({
  site,
  base,
  integrations: [react()],
  markdown: {
    remarkPlugins: [
      remarkPreview,
      [
        remarkEmbeds,
        {
          attachmentsRoot: path.join(vaultRoot, "Attachments"),
          copyAsset,
          resolveExcalidraw,
        },
      ],
      [
        remarkWikilinks,
        {
          index: wikilinkIndex,
          onDead: (slug: string, file: string) =>
            console.warn(`[wikilinks] dead link: [[${slug}]] in ${file}`),
        },
      ],
    ],
  },
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: { "@": path.resolve(__dirname, "src") },
    },
  },
});
```

- [ ] **Step 3.2: Run build to verify**

```bash
pnpm build 2>&1 | tail -15
```

Expected: ends with `[build] Complete!`. The vault branch warning may appear if vault is not on `main` — this is correct behavior.

- [ ] **Step 3.3: Run full test suite**

```bash
pnpm test
```

Expected: all tests pass.

- [ ] **Step 3.4: Commit**

```bash
git add astro.config.ts
git commit -m "feat(blog): wire remarkEmbeds + remarkWikilinks into astro.config"
```

---

## Self-Review

- [x] Spec coverage: vault.ts ✓, build-wikilink-index.ts ✓, astro.config.ts wiring ✓, branch warning ✓, dead-link warning ✓
- [x] No placeholders — all steps have complete code
- [x] Type consistency: `WikilinkIndex` imported from `@/lib/remark/wikilinks` in both implementation and test; `execFileSync` used throughout (no `execSync`); `createAssetAdapters` signature matches `adapters.ts`
