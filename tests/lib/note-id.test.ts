import { describe, it, expect } from "vitest";
import { noteId } from "@/lib/note-id";

describe("noteId", () => {
  it("slugs names with spaces and capitals", () => {
    expect(noteId("I accidentally deleted my Linux Boot.md")).toBe(
      "i-accidentally-deleted-my-linux-boot",
    );
  });

  it("keeps the ampersand as a separator", () => {
    expect(noteId("Q&A notes.md")).toBe("q-a-notes");
  });

  it("ignores folders", () => {
    expect(noteId("Thoughts/Deep/Deep Thought.md")).toBe("deep-thought");
  });

  it("leaves an already slugged name unchanged", () => {
    expect(noteId("fixture-post.md")).toBe("fixture-post");
  });
});
