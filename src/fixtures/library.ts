import type { LibraryCardData } from "@/lib/library-view";

// /ui-lab fixture for the library cards and collection. Placeholder text only.
const card = (title: string, extra: Partial<LibraryCardData>): LibraryCardData => ({
  href: "#",
  title,
  type: "book",
  status: "done",
  statusLabel: "read",
  tags: ["placeholder"],
  staple: false,
  draft: false,
  meta: "PLACEHOLDER author · 2001 · 8/10",
  ...extra,
});

export const LIBRARY_CARD_FIXTURES: LibraryCardData[] = [
  card("UI_LAB_PLACEHOLDER reading", { status: "active", statusLabel: "reading", date: "2026-04-01T00:00:00.000Z" }),
  card("UI_LAB_PLACEHOLDER read", { date: "2026-03-01T00:00:00.000Z" }),
  card("UI_LAB_PLACEHOLDER paused", { status: "paused", statusLabel: "paused", tags: ["other"] }),
  card("UI_LAB_PLACEHOLDER draft", { status: "backlog", statusLabel: "backlog", draft: true, meta: "" }),
];
