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

  it("fills its grid cell so every card in a row has one height", () => {
    const { container } = render(LibraryCard, { props: { item: card({ meta: "" }) } });
    const article = container.querySelector("[data-library-card]");
    expect(article?.className).toContain("h-full");
    // An empty meta line still takes its row.
    expect(container.querySelector("p.min-h-\\[1lh\\]")).not.toBeNull();
  });

  it.each([
    ["done", "bg-pastel-sage", "opacity-100"],
    ["active", "bg-pastel-butter", "opacity-90"],
    ["backlog", "bg-paper-raised", "opacity-75"],
    ["paused", "bg-pastel-dust", "opacity-60"],
    ["dropped", "bg-journal-4", "opacity-45"],
  ] as const)("shows %s with its band colour and opacity", (status, band, opacity) => {
    const { container } = render(LibraryCard, { props: { item: card({ status }) } });
    const article = container.querySelector("[data-library-card]");
    expect(article?.getAttribute("data-status")).toBe(status);
    expect(article?.className).toContain(opacity);
    expect(container.querySelector("[data-status-band]")?.className).toContain(band);
  });

  it("ticks off a done item and strikes through a dropped one", () => {
    const done = render(LibraryCard, { props: { item: card({ status: "done" }) } });
    expect(done.container.querySelector("[data-status-band] svg")).not.toBeNull();
    cleanup();
    const dropped = render(LibraryCard, { props: { item: card({ status: "dropped" }) } });
    expect(dropped.container.querySelector("[data-status-band] svg")).toBeNull();
    expect(screen.getByRole("link", { name: "PLACEHOLDER Book" }).className).toContain("line-through");
  });

  it("marks a draft", () => {
    render(LibraryCard, { props: { item: card({ draft: true }) } });
    expect(screen.getByText("draft")).toBeTruthy();
  });
});
