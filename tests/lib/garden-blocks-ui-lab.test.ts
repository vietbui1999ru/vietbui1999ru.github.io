import { describe, expect, it } from "vitest";
import { gardenRegistry } from "@/components/garden/registry";
import { GARDEN_BLOCK_FIXTURES } from "@/fixtures/gardenBlocks";
import { resolveBlocks } from "@/lib/garden-blocks";

describe("/ui-lab garden block fixtures", () => {
  it("has a fixture for every registered block", () => {
    for (const id of Object.keys(gardenRegistry)) {
      expect(GARDEN_BLOCK_FIXTURES, id).toHaveProperty([id]);
    }
  });

  it("has no fixture for an unregistered block", () => {
    for (const id of Object.keys(GARDEN_BLOCK_FIXTURES)) {
      expect(Object.hasOwn(gardenRegistry, id), id).toBe(true);
    }
  });

  it("gives each fixture props that its block schema accepts", () => {
    for (const [id, fixture] of Object.entries(GARDEN_BLOCK_FIXTURES)) {
      expect(() =>
        resolveBlocks("ui-lab", [{ block: id, ...fixture.props }], gardenRegistry),
      ).not.toThrow();
    }
  });
});
