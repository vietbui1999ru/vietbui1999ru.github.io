import { describe, it, expect, beforeEach, afterEach } from "vitest";
import path from "node:path";
import { vaultPaths } from "@/lib/vault-paths";

const FIXTURE = path.resolve("tests/fixtures/garden-vault");

beforeEach(() => {
  process.env.VAULT_ROOT = FIXTURE;
});
afterEach(() => {
  delete process.env.VAULT_ROOT;
});

describe("vaultPaths", () => {
  it("resolves every content collection and asset path under VAULT_ROOT", () => {
    const p = vaultPaths("/project");
    expect(p.root).toBe(FIXTURE);
    const dirs = [p.blogs, p.gallery, p.projects, p.thoughts, p.site, p.projectAssets, p.attachments];
    for (const dir of dirs) {
      expect(dir === FIXTURE || dir.startsWith(FIXTURE + path.sep)).toBe(true);
    }
  });

  it("points at the expected vault folders", () => {
    const p = vaultPaths("/project");
    expect(p.blogs).toBe(path.join(FIXTURE, "Blogs"));
    expect(p.gallery).toBe(path.join(FIXTURE, "Gallery"));
    expect(p.projects).toBe(path.join(FIXTURE, "Portfolio", "Projects"));
    expect(p.thoughts).toBe(FIXTURE);
    expect(p.site).toBe(path.join(FIXTURE, "Site"));
    expect(p.projectAssets).toBe(path.join(FIXTURE, "Assets", "Projects"));
    expect(p.attachments).toBe(path.join(FIXTURE, "Attachments"));
  });

  it("falls back to vendor/vault when VAULT_ROOT is unset", () => {
    delete process.env.VAULT_ROOT;
    const p = vaultPaths("/project");
    expect(p.blogs).toBe(path.join("/project", "vendor", "vault", "Blogs"));
  });
});
