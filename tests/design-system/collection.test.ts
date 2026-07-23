import { describe, expect, it } from "vitest";
import {
  DEFAULT_COLLECTION_STATE,
  parseCollectionState,
  resetCollectionState,
  serializeCollectionState,
} from "@/design-system/collection";

describe("collection experiment state", () => {
  it("returns safe defaults for missing or invalid values", () => {
    expect(parseCollectionState()).toEqual(DEFAULT_COLLECTION_STATE);
    expect(
      parseCollectionState("?view=unknown&columns=8&texture=1"),
    ).toMatchObject({
      view: "grid",
      columns: 3,
      texture: true,
    });
  });

  it("round trips shareable state through URL parameters", () => {
    const state = {
      ...DEFAULT_COLLECTION_STATE,
      query: "sim",
      tags: ["TypeScript", "Astro"],
      view: "table" as const,
      columns: 2 as const,
      showImage: false,
      palette: "eggshell" as const,
      texture: true,
      order: ["b", "a"],
    };

    expect(parseCollectionState(serializeCollectionState(state))).toEqual(
      state,
    );
  });

  it("resets arrays instead of sharing mutable defaults", () => {
    const reset = resetCollectionState();
    reset.tags.push("temporary");
    expect(DEFAULT_COLLECTION_STATE.tags).toEqual([]);
    expect(reset.order).toEqual([]);
  });
});
