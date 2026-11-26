import { render, screen, cleanup, within } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import LibraryCollection from "@/components/library/LibraryCollection.svelte";
import type { LibraryCardData } from "@/lib/library-view";

afterEach(() => cleanup());

const card = (title: string, extra: Partial<LibraryCardData> = {}): LibraryCardData => ({
  href: `/library/book/${title}`,
  title,
  type: "book",
  status: "done",
  statusLabel: "read",
  tags: [],
  staple: false,
  draft: false,
  meta: "",
  ...extra,
});

const gridTitles = (container: HTMLElement) =>
  [...container.querySelectorAll("[data-library-grid] h3")].map((h) => h.textContent?.trim());

describe("LibraryCollection", () => {
  it("shows a now shelf of active items above the grid", () => {
    const { container } = render(LibraryCollection, {
      props: { type: "book", items: [card("A", { status: "active", statusLabel: "reading" }), card("B")] },
    });
    const shelf = container.querySelector("[data-library-now]") as HTMLElement;
    expect(within(shelf).getByRole("link", { name: "A" })).toBeTruthy();
    expect(within(shelf).queryByRole("link", { name: "B" })).toBeNull();
  });

  it("sorts the grid by the most recent of started and finished, undated last", () => {
    const items = [
      card("Old", { date: "2026-01-01T00:00:00.000Z" }),
      card("Undated"),
      card("New", { date: "2026-03-01T00:00:00.000Z" }),
    ];
    const { container } = render(LibraryCollection, { props: { type: "book", items } });
    expect(gridTitles(container)).toEqual(["New", "Old", "Undated"]);
  });

  it("filters the grid by status and by tag", async () => {
    const user = userEvent.setup();
    const items = [
      card("Read one", { tags: ["sci-fi"] }),
      card("Dropped one", { status: "dropped", statusLabel: "dropped", tags: ["essay"] }),
    ];
    const { container } = render(LibraryCollection, { props: { type: "book", items } });
    await user.click(screen.getByRole("button", { name: "dropped" }));
    expect(gridTitles(container)).toEqual(["Dropped one"]);
    await user.click(screen.getByRole("button", { name: "all" }));
    await user.click(screen.getByRole("button", { name: "sci-fi" }));
    expect(gridTitles(container)).toEqual(["Read one"]);
  });

  it("offers status buttons only for statuses present, with type labels", () => {
    render(LibraryCollection, { props: { type: "book", items: [card("X")] } });
    expect(screen.getByRole("button", { name: "read" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "dropped" })).toBeNull();
  });

  it("gives recipes a staples filter driven by staple: true", async () => {
    const user = userEvent.setup();
    const items = [
      card("Soup", { type: "recipe", statusLabel: "tried", staple: true }),
      card("Cake", { type: "recipe", statusLabel: "tried" }),
    ];
    const { container } = render(LibraryCollection, { props: { type: "recipe", items } });
    await user.click(screen.getByRole("button", { name: "staples" }));
    expect(gridTitles(container)).toEqual(["Soup"]);
  });

  it("has no staples filter outside recipes", () => {
    render(LibraryCollection, { props: { type: "book", items: [card("X")] } });
    expect(screen.queryByRole("button", { name: "staples" })).toBeNull();
  });
});
