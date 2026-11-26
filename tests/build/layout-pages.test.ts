import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

// Page-level check: a real `astro build` against the fixture vault, asserting on the
// generated HTML. Slow (two builds), so it has its own timeout.
const run = promisify(execFile);
const PROJECT = process.cwd();
const FIXTURE = path.join(PROJECT, "tests", "fixtures", "garden-vault");
const BUILD_TIMEOUT = 240_000;

// Each build runs in its own copy of the project with node_modules symlinked. Two
// astro builds in one project root share .astro/ and clobber each other's generated
// files, and the spec check runs AC-13's build alongside this suite.
function isolatedProject(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "layout-project-"));
  for (const entry of ["astro.config.ts", "package.json", "tsconfig.json", "svelte.config.js", "src", "public"]) {
    fs.cpSync(path.join(PROJECT, entry), path.join(root, entry), { recursive: true });
  }
  fs.symlinkSync(path.join(PROJECT, "node_modules"), path.join(root, "node_modules"), "dir");
  return root;
}

async function build(root: string, vault: string, outDir: string) {
  return run("npx", ["astro", "build", "--outDir", outDir], {
    cwd: root,
    env: { ...process.env, VAULT_ROOT: vault },
    timeout: BUILD_TIMEOUT,
    maxBuffer: 32 * 1024 * 1024,
  });
}

let dist: string;
let root: string;
let linuxHtml: string;
let qaHtml: string;

beforeAll(async () => {
  dist = fs.mkdtempSync(path.join(os.tmpdir(), "layout-dist-"));
  root = isolatedProject();
  await build(root, FIXTURE, dist);
  linuxHtml = fs.readFileSync(
    path.join(dist, "blog", "i-accidentally-deleted-my-linux-boot", "index.html"),
    "utf-8",
  );
  qaHtml = fs.readFileSync(path.join(dist, "blog", "q-a-notes", "index.html"), "utf-8");
}, BUILD_TIMEOUT);

afterAll(() => {
  fs.rmSync(dist, { recursive: true, force: true });
  fs.rmSync(root, { recursive: true, force: true });
});

describe("layout presets on post pages (built)", () => {
  it("the notebook layout limits the TOC to two heading levels", () => {
    // The TOC is visible (h2 entries are present), and "### Recovery step" is left out.
    expect(linuxHtml).toContain('href="#one"');
    expect(linuxHtml).not.toContain('href="#recovery-step"');
  });

  it("the essay default keeps depth-3 headings in the TOC", () => {
    expect(qaHtml).toContain('href="#section"');
    expect(qaHtml).toContain('href="#deep-dive"');
  });

  it("a wikilink to an awkward-named post links to its built route", () => {
    expect(linuxHtml).toContain('href="/blog/q-a-notes"');
    expect(qaHtml).toContain('href="/blog/i-accidentally-deleted-my-linux-boot"');
  });

  it("backlinks show on the page that is linked to", () => {
    expect(linuxHtml).toContain("linked from");
    expect(qaHtml).toContain("linked from");
  });
});

describe("an unknown layout fails the build", () => {
  it("names the layout in the error", async () => {
    const vault = fs.mkdtempSync(path.join(os.tmpdir(), "layout-bad-vault-"));
    const out = fs.mkdtempSync(path.join(os.tmpdir(), "layout-bad-dist-"));
    const projectRoot = isolatedProject();
    try {
      fs.cpSync(FIXTURE, vault, { recursive: true });
      fs.writeFileSync(
        path.join(vault, "Blogs", "Bad layout.md"),
        "---\ntitle: Bad layout\ndescription: d\ndate: 2026-02-03\npublish: true\nlayout: poster\n---\n\nBody.\n",
      );
      let failure: { stdout?: string; stderr?: string; code?: number } | undefined;
      try {
        await build(projectRoot, vault, out);
      } catch (error) {
        failure = error as typeof failure;
      }
      expect(failure).toBeDefined();
      expect(failure?.code).not.toBe(0);
      expect(`${failure?.stdout ?? ""}${failure?.stderr ?? ""}`).toContain('unknown layout "poster"');
    } finally {
      fs.rmSync(vault, { recursive: true, force: true });
      fs.rmSync(out, { recursive: true, force: true });
      fs.rmSync(projectRoot, { recursive: true, force: true });
    }
  }, BUILD_TIMEOUT);
});
