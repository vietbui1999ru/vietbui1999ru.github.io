import { describe, it, expect } from "vitest";
import { validateNotes } from "@/lib/publish/validate";

const good = {
  relPath: "Notes/ok.md",
  frontmatter: {
    title: "Ok",
    description: "Fine.",
    date: "2026-03-01",
    publish: true,
    type: "post",
  },
};

describe("validateNotes", () => {
  it("passes a note that matches its type's site schema", () => {
    expect(() => validateNotes([good])).not.toThrow();
  });

  it("names the failing file when a required field is missing", () => {
    const bad = {
      relPath: "Blogs/no-desc.md",
      frontmatter: { title: "No desc", date: "2026-03-01", publish: true, type: "post" },
    };
    expect(() => validateNotes([good, bad])).toThrow(/Blogs\/no-desc\.md/);
  });

  it("reports every failing file in one error, so nothing is written", () => {
    const bad1 = { relPath: "a.md", frontmatter: { publish: true, type: "post" } };
    const bad2 = { relPath: "b.md", frontmatter: { publish: true, type: "thought" } };
    let message = "";
    try {
      validateNotes([bad1, bad2]);
    } catch (err) {
      message = (err as Error).message;
    }
    expect(message).toContain("a.md");
    expect(message).toContain("b.md");
  });

  it("validates thoughts against the thought schema", () => {
    const thought = {
      relPath: "Thoughts/t.md",
      frontmatter: { title: "T", date: "2026-03-03", publish: true, type: "thought" },
    };
    expect(() => validateNotes([thought])).not.toThrow();
  });
});
