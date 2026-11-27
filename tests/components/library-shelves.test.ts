import { render, screen, cleanup } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import LibraryShelves from "@/components/library/LibraryShelves.svelte";
import type { LibraryCardData } from "@/lib/library-view";

afterEach(() => {
  cleanup();
  history.replaceState(null, "", "/");
});

const card = (type: LibraryCardData["type"], title: string): LibraryCardData => ({
  href: `/library/${type}/${title}`,
  title,
  type,
  status: "done",
  statusLabel: "done",
  tags: [],
  staple: false,
  draft: false,
  meta: "",
});

const shelves = [
  { type: "book" as const, label: "books", enabled: true, cards: [card("book", "Book one")] },
  { type: "game" as const, label: "games", enabled: true, cards: [card("game", "Game one")] },
];

const panel = (container: HTMLElement, type: string) =>
  container.querySelector<HTMLElement>(`[data-library-panel="${type}"]`);

describe("LibraryShelves", () => {
  it("builds only the open category's grid at first", () => {
    const { container } = render(LibraryShelves, { props: { shelves } });
    expect(panel(container, "book")?.hidden).toBe(false);
    expect(panel(container, "game")).toBeNull();
  });

  it("opens the category named by initial", () => {
    const { container } = render(LibraryShelves, { props: { shelves, initial: "game" } });
    expect(panel(container, "game")?.hidden).toBe(false);
    expect(panel(container, "book")).toBeNull();
  });

  it("switches tabs in place, updates the address and keeps built grids", async () => {
    const user = userEvent.setup();
    const { container } = render(LibraryShelves, { props: { shelves } });
    await user.click(screen.getByRole("tab", { name: "games" }));
    expect(location.pathname).toBe("/library/game");
    expect(panel(container, "game")?.hidden).toBe(false);
    expect(panel(container, "book")?.hidden).toBe(true);
    expect(screen.getByRole("tab", { name: "games" }).getAttribute("aria-selected")).toBe("true");
  });

  it("follows the back button", async () => {
    const user = userEvent.setup();
    const { container } = render(LibraryShelves, { props: { shelves } });
    await user.click(screen.getByRole("tab", { name: "games" }));
    history.replaceState(null, "", "/library/book");
    window.dispatchEvent(new PopStateEvent("popstate"));
    await Promise.resolve();
    expect(panel(container, "book")?.hidden).toBe(false);
  });

  it("moves between tabs with the arrow keys", async () => {
    const user = userEvent.setup();
    render(LibraryShelves, { props: { shelves } });
    screen.getByRole("tab", { name: "books" }).focus();
    await user.keyboard("{ArrowRight}");
    expect(document.activeElement?.getAttribute("data-library-tab")).toBe("game");
  });
});
