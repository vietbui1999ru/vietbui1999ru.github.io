import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// The footer sits at the bottom of the viewport on short pages: body is a
// full-height flex column, main grows, and the footer takes the spare space above it.
const layout = readFileSync("src/layouts/BaseLayout.astro", "utf8");
const footer = readFileSync("src/components/primitives/SiteFooter.svelte", "utf8");

describe("sticky footer", () => {
  it("makes body a flex column at least one viewport tall", () => {
    const body = layout.match(/<body class="([^"]+)"/)?.[1].split(/\s+/) ?? [];
    expect(body).toEqual(expect.arrayContaining(["flex", "flex-col", "min-h-dvh"]));
  });

  it("lets main grow and pushes the footer down", () => {
    expect(layout).toMatch(/<main class="[^"]*\bflex-1\b/);
    expect(footer).toMatch(/<footer class="[^"]*\bmt-auto\b/);
  });
});
