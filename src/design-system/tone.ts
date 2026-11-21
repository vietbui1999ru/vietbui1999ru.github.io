/**
 * Pastel assignment by meaning instead of list position: the same key
 * (tag, skill category, company) gets the same pastel on every page.
 */
export type Pastel = "sage" | "dust" | "rose" | "butter";

export const PASTELS: readonly Pastel[] = ["sage", "dust", "rose", "butter"];

export const PASTEL_BG: Record<Pastel, string> = {
  sage: "bg-pastel-sage",
  dust: "bg-pastel-dust",
  rose: "bg-pastel-rose",
  butter: "bg-pastel-butter",
};

// FNV-1a: tiny, stable across builds and runtimes.
function hash(key: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function toneFor(key: string): Pastel {
  return PASTELS[hash(key.trim().toLowerCase()) % PASTELS.length];
}

export const STATUS_TONE = {
  active: "sage",
  shipped: "dust",
  archived: "grey",
} as const satisfies Record<string, Pastel | "grey">;
