import { gardenRegistry } from "@/components/garden/registry";

export type LayoutName = "essay" | "notebook" | "visual";

export interface LayoutBlock {
  block: string;
  [prop: string]: unknown;
}

// Presets are block lists over the garden registry. The lists are starting points;
// tune them against the real pages (AC-34 is a visual check).
export const LAYOUTS: Record<LayoutName, LayoutBlock[]> = {
  essay: [{ block: "toc" }],
  notebook: [{ block: "toc", maxDepth: 2 }],
  visual: [],
};

// Note types that take a layout when the note does not name one.
const TYPE_DEFAULTS: Record<string, LayoutName> = {
  post: "essay",
  thought: "essay",
};

// Fail at load if a preset names a block the registry does not have.
for (const [name, blocks] of Object.entries(LAYOUTS)) {
  for (const b of blocks) {
    if (!Object.hasOwn(gardenRegistry, b.block)) {
      throw new Error(`layout "${name}" names unknown block "${b.block}"`);
    }
  }
}

/** The layout for a note: its own `layout:` if set, else its type's default. */
export function layoutFor(note: { type?: string; layout?: string }): LayoutName {
  if (note.layout !== undefined) {
    if (!Object.hasOwn(LAYOUTS, note.layout)) {
      throw new Error(`unknown layout "${note.layout}"`);
    }
    return note.layout as LayoutName;
  }
  return (note.type && TYPE_DEFAULTS[note.type]) || "essay";
}

export function layoutBlocks(name: LayoutName): LayoutBlock[] {
  return LAYOUTS[name];
}
