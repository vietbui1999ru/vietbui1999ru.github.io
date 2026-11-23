// Keyboard rules for a single-select listbox, free of DOM code so any list can reuse them.

export const TYPEAHEAD_RESET_MS = 500;

/** Index after a navigation key, clamped to [0, count - 1]; null for other keys. */
export function nextIndex(key: string, active: number, count: number): number | null {
  const last = count - 1;
  switch (key) {
    case "ArrowDown":
      return Math.min(active + 1, last);
    case "ArrowUp":
      return Math.max(active - 1, 0);
    case "Home":
      return 0;
    case "End":
      return last;
    default:
      return null;
  }
}

/**
 * Type-ahead over option labels. Keys typed within TYPEAHEAD_RESET_MS build one prefix.
 * The search starts at the option after the one that was active when the prefix began,
 * and wraps, so extra keys refine the current match.
 */
export function createTypeahead(now: () => number = Date.now) {
  let buffer = "";
  let anchor = 0;
  let lastKeyAt = -Infinity;

  return {
    match(char: string, labels: string[], active: number): number {
      const time = now();
      if (time - lastKeyAt > TYPEAHEAD_RESET_MS) {
        buffer = "";
        anchor = active;
      }
      lastKeyAt = time;
      buffer += char.toLowerCase();
      for (let step = 1; step <= labels.length; step++) {
        const i = (anchor + step) % labels.length;
        if (labels[i].toLowerCase().startsWith(buffer)) return i;
      }
      return -1;
    },
  };
}
