import { describe, it, expect, beforeEach, afterEach } from "vitest";
import path from "node:path";
import { getVaultRoot } from "@/lib/vault";

beforeEach(() => {
  delete process.env.VAULT_ROOT;
});
afterEach(() => {
  delete process.env.VAULT_ROOT;
});

describe("getVaultRoot", () => {
  it("defaults to vendor/vault relative to project root", () => {
    const root = getVaultRoot("/project");
    expect(root).toBe(path.join("/project", "vendor", "vault"));
  });

  it("returns VAULT_ROOT env var when set", () => {
    process.env.VAULT_ROOT = "/custom/vault";
    expect(getVaultRoot("/project")).toBe("/custom/vault");
  });
});
