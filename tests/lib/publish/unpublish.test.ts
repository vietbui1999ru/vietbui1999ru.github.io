import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { planSync, applySync, readManifest } from "@/lib/publish/sync";

let target: string;

beforeEach(() => {
  target = fs.mkdtempSync(path.join(os.tmpdir(), "publish-target-"));
});

afterEach(() => {
  fs.rmSync(target, { recursive: true, force: true });
});

async function publish(desired: Record<string, string>) {
  const previous = await readManifest(target);
  const plan = await planSync(target, desired, previous);
  await applySync(target, desired, plan);
  return plan;
}

describe("unpublish via the sync manifest", () => {
  it("removes a note that left the desired set on the next run", async () => {
    await publish({ "Blogs/a.md": "A", "Blogs/b.md": "B" });
    expect(fs.existsSync(path.join(target, "Blogs/b.md"))).toBe(true);

    const plan = await publish({ "Blogs/a.md": "A" });
    expect(plan.removed).toEqual(["Blogs/b.md"]);
    expect(fs.existsSync(path.join(target, "Blogs/b.md"))).toBe(false);
    expect(fs.existsSync(path.join(target, "Blogs/a.md"))).toBe(true);
  });

  it("never removes a file the sync did not write", async () => {
    fs.mkdirSync(path.join(target, "Blogs"), { recursive: true });
    fs.writeFileSync(path.join(target, "Blogs/hand-made.md"), "owner file");
    const plan = await publish({ "Blogs/a.md": "A" });
    expect(plan.removed).toEqual([]);
    expect(fs.readFileSync(path.join(target, "Blogs/hand-made.md"), "utf8")).toBe("owner file");
  });

  it("reports created, changed and unchanged files", async () => {
    await publish({ "Blogs/a.md": "A" });
    const plan = await publish({ "Blogs/a.md": "A2", "Blogs/c.md": "C" });
    expect(plan.changed).toEqual(["Blogs/a.md"]);
    expect(plan.created).toEqual(["Blogs/c.md"]);
    expect(plan.unchanged).toEqual([]);
  });
});
