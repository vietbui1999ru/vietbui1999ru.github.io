import type { CollectionPalette } from "./types";

export interface PaperPalette {
  label: string;
  paper: string;
  raised: string;
  ink: string;
  inkSoft: string;
  rule: string;
  accents: [string, string, string, string];
  textureOpacity: string;
}

export const PAPER_PALETTES: Record<CollectionPalette, PaperPalette> = {
  current: {
    label: "Current paper",
    paper: "#fbfaf6",
    raised: "#ffffff",
    ink: "#141412",
    inkSoft: "#2e2d28",
    rule: "#d8d6cc",
    accents: ["#b7c9b0", "#b3c4d6", "#e3c2c6", "#e8d9a8"],
    textureOpacity: "0",
  },
  eggshell: {
    label: "Soft eggshell",
    paper: "#f4f0e6",
    raised: "#faf7ef",
    ink: "#28231e",
    inkSoft: "#51483d",
    rule: "#d4c9b8",
    accents: ["#b8c5ae", "#bdc9d2", "#d8b7aa", "#d9c899"],
    textureOpacity: "0.035",
  },
  bone: {
    label: "Bone",
    paper: "#ebe7dc",
    raised: "#f6f2e8",
    ink: "#252521",
    inkSoft: "#4d4c43",
    rule: "#ccc9bb",
    accents: ["#afbea8", "#aebdca", "#d2b1ae", "#d8c28d"],
    textureOpacity: "0.025",
  },
  linen: {
    label: "Linen",
    paper: "#e4ded2",
    raised: "#f1ece2",
    ink: "#2d2925",
    inkSoft: "#5b5148",
    rule: "#c7bdae",
    accents: ["#a6b49c", "#a8b7c1", "#c99e9a", "#cdbb88"],
    textureOpacity: "0.05",
  },
  ledger: {
    label: "Ledger",
    paper: "#deded6",
    raised: "#eeeee6",
    ink: "#272a29",
    inkSoft: "#4c514e",
    rule: "#bdc3bd",
    accents: ["#a9bca8", "#a9b9c7", "#c5a8a3", "#c9bd91"],
    textureOpacity: "0.03",
  },
  cotton: {
    label: "Cotton",
    paper: "#f8f7f2",
    raised: "#fffefa",
    ink: "#242320",
    inkSoft: "#555149",
    rule: "#dedbd1",
    accents: ["#c0cfbb", "#c1ceda", "#e2c7c6", "#eadcae"],
    textureOpacity: "0.018",
  },
};
