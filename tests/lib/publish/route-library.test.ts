import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { routeNote } from "@/lib/publish/route";
import { validateNotes } from "@/lib/publish/validate";
import { collectAttachments } from "@/lib/publish/attachments";

const item = (type: string, extra: Record<string, unknown> = {}) => ({
  relPath: `Media/${type}.md`,
  frontmatter: { title: "PLACEHOLDER Item", type, status: "backlog", publish: true, ...extra },
  body: "",
});

describe("library routing", () => {
  it.each(["game", "book", "film", "recipe"])("routes a %s to Library/<type>/<slug>.md", (type) => {
    expect(routeNote(item(type))).toBe(`Library/${type}/placeholder-item.md`);
  });

  it("validates library notes against the library schema", () => {
    expect(() => validateNotes([item("book"), item("recipe", { staple: true })])).not.toThrow();
    expect(() => validateNotes([item("recipe", { status: "paused" })])).toThrow(/Media\/recipe\.md/);
  });
});

describe("library covers", () => {
  let vault: string;

  beforeEach(() => {
    vault = fs.mkdtempSync(path.join(os.tmpdir(), "publish-library-"));
    fs.mkdirSync(path.join(vault, "Attachments"));
    fs.writeFileSync(path.join(vault, "Attachments", "cover.jpg"), "jpg");
    fs.writeFileSync(path.join(vault, "Attachments", "other.png"), "png");
  });

  afterEach(() => {
    fs.rmSync(vault, { recursive: true, force: true });
  });

  it.each(["cover.jpg", "[[cover.jpg]]", "Attachments/cover.jpg"])("copies the cover named %s", async (cover) => {
    const found = await collectAttachments(vault, [item("game", { cover })]);
    expect(found).toEqual([
      { source: path.join(vault, "Attachments", "cover.jpg"), target: "Attachments/cover.jpg" },
    ]);
  });

  it("stops the run when a library cover is missing", async () => {
    await expect(collectAttachments(vault, [item("film", { cover: "gone.jpg" })])).rejects.toThrow(
      /gone\.jpg/,
    );
  });

  it("leaves the covers of other types alone", async () => {
    const post = { ...item("post", { cover: "cover.jpg" }) };
    expect(await collectAttachments(vault, [post])).toEqual([]);
  });
});
