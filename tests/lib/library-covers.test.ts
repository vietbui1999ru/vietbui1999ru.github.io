import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { copyLibraryCovers, hiddenLibraryNotes } from "@/lib/library-covers";

let vault: string;
let dest: string;

const note = (name: string, fm: string) => {
  fs.writeFileSync(path.join(vault, "Library", "book", `${name}.md`), `---\n${fm}\n---\n`);
  fs.writeFileSync(path.join(vault, "Attachments", `${name}.png`), "png");
};

beforeEach(() => {
  vault = fs.mkdtempSync(path.join(os.tmpdir(), "library-covers-"));
  dest = path.join(vault, "out");
  fs.mkdirSync(path.join(vault, "Library", "book"), { recursive: true });
  fs.mkdirSync(path.join(vault, "Attachments"));
  note("public", "publish: true\ncover: public.png");
  note("draft", "publish: true\ndraft: true\ncover: draft.png");
  note("private", "publish: false\ncover: private.png");
});

afterEach(() => fs.rmSync(vault, { recursive: true, force: true }));

describe("copyLibraryCovers", () => {
  it("copies only covers of published, non-draft items in production", () => {
    expect(copyLibraryCovers(vault, dest, { dev: false })).toEqual(["public.png"]);
    expect(fs.readdirSync(dest)).toEqual(["public.png"]);
  });

  it("copies every cover on a dev server", () => {
    expect(copyLibraryCovers(vault, dest, { dev: true }).sort()).toEqual(["draft.png", "private.png", "public.png"]);
  });

  it("lists draft and unpublished notes as hidden in production, none on a dev server", () => {
    expect([...hiddenLibraryNotes(vault, { dev: false })].sort()).toEqual(["draft", "private"]);
    expect(hiddenLibraryNotes(vault, { dev: true }).size).toBe(0);
  });

  it("removes covers left by an earlier dev run before a production build", () => {
    copyLibraryCovers(vault, dest, { dev: true });
    copyLibraryCovers(vault, dest, { dev: false });
    expect(fs.readdirSync(dest)).toEqual(["public.png"]);
  });
});
