import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { collectAttachments } from "@/lib/publish/attachments";
import { scanVault } from "@/lib/publish/scan";

const FIXTURE = path.resolve(__dirname, "../../fixtures/personal-vault");
let tmp: string;

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "publish-attach-"));
  fs.cpSync(FIXTURE, tmp, { recursive: true });
});

afterEach(() => {
  fs.rmSync(tmp, { recursive: true, force: true });
});

describe("collectAttachments", () => {
  it("copies the drawing SVG embedded by a published note, and nothing else", async () => {
    const notes = await scanVault(tmp);
    const found = await collectAttachments(tmp, notes);
    expect(found.map((a) => a.target)).toEqual(["Attachments/diagram.excalidraw.svg"]);
    expect(found[0].source).toBe(path.join(tmp, "Attachments", "diagram.excalidraw.svg"));
  });

  it("stops the run when the drawing's SVG is older than the drawing", async () => {
    const svg = path.join(tmp, "Attachments", "diagram.excalidraw.svg");
    const md = path.join(tmp, "Attachments", "diagram.excalidraw.md");
    const old = new Date("2026-01-01T00:00:00Z");
    const newer = new Date("2026-02-01T00:00:00Z");
    fs.utimesSync(svg, old, old);
    fs.utimesSync(md, newer, newer);
    const notes = await scanVault(tmp);
    await expect(collectAttachments(tmp, notes)).rejects.toThrow(/diagram\.excalidraw/);
  });

  it("stops the run when the drawing's SVG is missing", async () => {
    fs.rmSync(path.join(tmp, "Attachments", "diagram.excalidraw.svg"));
    const notes = await scanVault(tmp);
    await expect(collectAttachments(tmp, notes)).rejects.toThrow(/diagram\.excalidraw\.svg/);
  });
});
