import { describe, expect, it } from "vitest";
import { NAV_LINKS } from "@/data/navLinks";

describe("NAV_LINKS", () => {
  it("lists home, blog, thoughts, projects and about, in that order", () => {
    expect(NAV_LINKS.map((link) => link.label)).toEqual([
      "home",
      "blog",
      "thoughts",
      "projects",
      "about",
    ]);
  });

  it("keeps gallery out of the nav; about links to it", () => {
    expect(NAV_LINKS.some((link) => link.href === "/gallery")).toBe(false);
  });
});
