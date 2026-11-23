import { describe, it, expect } from "vitest";
import { siteNoteSchema } from "@/content/schemas";

describe("focus area tools", () => {
  it("accepts up to 4 tool icons", () => {
    const tools = ["Networking", "OPNsense", "NixOS", "Docker"];
    expect(siteNoteSchema.parse({ title: "Networking", tools }).tools).toEqual(tools);
  });

  it("fails validation with more than 4 tools", () => {
    const tools = ["A", "B", "C", "D", "E"];
    expect(() => siteNoteSchema.parse({ title: "Networking", tools })).toThrow(/4/);
  });

  it("defaults tools to an empty list", () => {
    expect(siteNoteSchema.parse({ title: "Networking" }).tools).toEqual([]);
  });
});
