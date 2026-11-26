import { render, screen, cleanup } from "@testing-library/svelte";
import { afterEach, describe, expect, it } from "vitest";
import LibraryCard from "@/components/library/LibraryCard.svelte";
import type { LibraryCardData } from "@/lib/library-view";

afterEach(() => cleanup());

const card = (extra: Partial<LibraryCardData> = {}): LibraryCardData => ({
  href: "/library/book/placeholder",
  title: "PLACEHOLDER Book",
  type: "book",
  status: "active",
  statusLabel: "reading",
  tags: [],
  staple: false,
  draft: false,
  meta: "PLACEHOLDER author · 2001",
  ...extra,
});

describe("LibraryCard", () => {
  it("links the title to the detail page and shows the status label and meta", () => {
    render(LibraryCard, { props: { item: card() } });
    expect(screen.getByRole("link", { name: "PLACEHOLDER Book" }).getAttribute("href")).toBe(
      "/library/book/placeholder",
    );
    expect(screen.getByText("reading")).toBeTruthy();
    expect(screen.getByText("PLACEHOLDER author · 2001")).toBeTruthy();
  });

  it.each(["game", "book", "film", "recipe"] as const)(
    "renders a %s without a cover as a placeholder with the type icon and title",
    (type) => {
      const { container } = render(LibraryCard, { props: { item: card({ type }) } });
      const placeholder = container.querySelector(`[data-placeholder="${type}"]`);
      expect(placeholder?.querySelector("svg path")).not.toBeNull();
      expect(placeholder?.textContent).toContain("PLACEHOLDER Book");
      expect(container.querySelector("img")).toBeNull();
    },
  );

  it("renders the build-time thumbnail with its size, lazily", () => {
    const thumb = { src: "/_astro/cover.hash.webp", width: 480, height: 640 };
    const { container } = render(LibraryCard, { props: { item: card({ thumb }) } });
    const img = container.querySelector("img[data-thumbnail]");
    expect(img?.getAttribute("src")).toBe(thumb.src);
    expect(img?.getAttribute("width")).toBe("480");
    expect(img?.getAttribute("height")).toBe("640");
    expect(img?.getAttribute("loading")).toBe("lazy");
    expect(container.querySelector("[data-placeholder]")).toBeNull();
  });

  it("marks a draft", () => {
    render(LibraryCard, { props: { item: card({ draft: true }) } });
    expect(screen.getByText("draft")).toBeTruthy();
  });
});
