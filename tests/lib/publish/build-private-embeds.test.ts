import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { buildDesired } from "@/lib/publish/build";

const FIXTURE = path.resolve("tests/fixtures/personal-vault");
let vault: string;

beforeEach(() => {
  vault = fs.mkdtempSync(path.join(os.tmpdir(), "publish-vault-"));
  fs.cpSync(FIXTURE, vault, { recursive: true, preserveTimestamps: true });
  const post = path.join(vault, "Blogs/published-post.md");
  const body = fs
    .readFileSync(post, "utf8")
    .replace("%% private: do not publish this line %%", "%% private ![[secret.png]] %%");
  fs.writeFileSync(post, body);
});

afterEach(() => {
  fs.rmSync(vault, { recursive: true, force: true });
});

describe("attachments of published notes", () => {
  it("copies no attachment that is embedded only inside a private comment", async () => {
    const { desired } = await buildDesired(vault);
    const targets = Object.keys(desired);
    expect(targets.some((t) => t.endsWith("diagram.excalidraw.svg"))).toBe(true);
    expect(targets.some((t) => t.endsWith("secret.png"))).toBe(false);
  });
});
