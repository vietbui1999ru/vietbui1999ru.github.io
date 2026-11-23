import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { planMigration, runMigration, insertFrontmatterLines } from "@/lib/publish/migrate";

const FIXTURE = path.resolve(__dirname, "../../fixtures/personal-vault");
let vault: string;

beforeEach(() => {
  vault = fs.mkdtempSync(path.join(os.tmpdir(), "publish-migrate-"));
  fs.cpSync(FIXTURE, vault, { recursive: true });
});

afterEach(() => {
  fs.rmSync(vault, { recursive: true, force: true });
});

const read = (rel: string) => fs.readFileSync(path.join(vault, rel), "utf8");

describe("runMigration", () => {
  it("defaults to a dry run that writes nothing", async () => {
    const before = read("Blogs/legacy-post.md");
    const changes = await runMigration(vault);
    expect(changes.map((c) => c.relPath)).toContain("Blogs/legacy-post.md");
    expect(read("Blogs/legacy-post.md")).toBe(before);
  });

  it("adds publish, type and math: katex where a post uses $ math", async () => {
    await runMigration(vault, { apply: true });
    const post = read("Blogs/legacy-post.md");
    expect(post).toMatch(/^---\ntitle: Legacy Post\n/);
    expect(post).toContain("publish: true\n");
    expect(post).toContain("type: post\n");
    expect(post).toContain("math: katex\n");
  });

  it("leaves a post without $ math free of math: katex", async () => {
    fs.writeFileSync(
      path.join(vault, "Blogs/plain.md"),
      "---\ntitle: Plain\ndescription: d\ndate: 2025-01-01\n---\nNo maths here.\n",
    );
    await runMigration(vault, { apply: true });
    expect(read("Blogs/plain.md")).not.toContain("math:");
  });

  it("does not publish a post that was a draft", async () => {
    await runMigration(vault, { apply: true });
    expect(read("Blogs/legacy-draft.md")).not.toContain("publish: true");
  });

  it("does not touch keys a note already has", async () => {
    const before = read("Blogs/published-post.md");
    await runMigration(vault, { apply: true });
    expect(read("Blogs/published-post.md")).toBe(before);
  });
});

describe("insertFrontmatterLines", () => {
  it("inserts lines before the closing fence", () => {
    expect(insertFrontmatterLines("---\na: 1\n---\nbody\n", ["b: 2"])).toBe(
      "---\na: 1\nb: 2\n---\nbody\n",
    );
  });

  it("adds a frontmatter block when the note has none", () => {
    expect(insertFrontmatterLines("body\n", ["b: 2"])).toBe("---\nb: 2\n---\nbody\n");
  });
});

describe("planMigration", () => {
  it("skips variant files", async () => {
    const changes = await planMigration(vault);
    expect(changes.map((c) => c.relPath)).not.toContain("Blogs/published-post.yoda.md");
  });
});
