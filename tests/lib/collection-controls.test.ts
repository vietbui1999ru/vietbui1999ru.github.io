import { describe, expect, it } from "vitest";
import { DEFAULT_COLLECTION_STATE } from "@/design-system/collection";
import {
  collectTags,
  filterAndSortCollection,
  idsForRecords,
  moveRecord,
} from "@/lib/collection-controls";

const records = [
  {
    slug: "beta",
    title: "Beta Simulation",
    summary: "A physics experiment",
    date: new Date("2025-01-01"),
    featured: false,
    badges: ["Rust", "Simulation"],
    status: "shipped",
  },
  {
    slug: "alpha",
    title: "Alpha Portfolio",
    summary: "A design system",
    date: new Date("2026-01-01"),
    featured: true,
    badges: ["Svelte", "Design"],
    status: "active",
  },
];

describe("collection controls", () => {
  it("filters across title, summary, tags, and badges", () => {
    expect(
      filterAndSortCollection(records, {
        ...DEFAULT_COLLECTION_STATE,
        query: "physics",
      }),
    ).toHaveLength(1);
    expect(
      filterAndSortCollection(records, {
        ...DEFAULT_COLLECTION_STATE,
        tags: ["svelte"],
      }),
    ).toHaveLength(1);
  });

  it("sorts featured records first by default and supports title sorting", () => {
    expect(
      filterAndSortCollection(records, DEFAULT_COLLECTION_STATE).map(
        (record) => record.slug,
      ),
    ).toEqual(["alpha", "beta"]);
    expect(
      filterAndSortCollection(records, {
        ...DEFAULT_COLLECTION_STATE,
        sort: "title-asc",
      }).map((record) => record.slug),
    ).toEqual(["alpha", "beta"]);
  });

  it("collects normalized, unique tags", () => {
    expect(collectTags(records)).toEqual([
      "design",
      "rust",
      "simulation",
      "svelte",
    ]);
  });

  it("moves records without mutating the source array", () => {
    const moved = moveRecord(records, "alpha", "up");
    expect(idsForRecords(moved)).toEqual(["alpha", "beta"]);
    expect(idsForRecords(records)).toEqual(["beta", "alpha"]);
    expect(moveRecord(records, "missing", "up")).toBe(records);
  });
});
