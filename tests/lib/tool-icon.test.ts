import { describe, expect, it } from "vitest";
import { getToolIconPath } from "@/lib/tool-icon";

describe("getToolIconPath", () => {
  it("returns the simple-icons path for a mapped tool", () => {
    const path = getToolIconPath("NixOS");
    expect(typeof path).toBe("string");
    expect(path!.length).toBeGreaterThan(0);
  });

  it("maps the networking tool to its icon", () => {
    expect(getToolIconPath("Networking")).not.toBeNull();
  });

  it("returns null for a tool with no slug", () => {
    expect(getToolIconPath("Not A Real Tool")).toBeNull();
  });
});
