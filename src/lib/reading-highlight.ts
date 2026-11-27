// Progress rules of the pointer-driven reading highlight (#39). No DOM code here: the
// DOM module finds caret positions and paints the highlight; this module decides how far
// the read part reaches.

/** A text position in a block: the index of a text node in the block, and a character offset in it. */
export interface TextPos {
  node: number;
  offset: number;
}

/** The later of the two positions in document order. Progress never moves back. */
export function furthest(current: TextPos | null, next: TextPos): TextPos {
  if (!current) return next;
  if (next.node !== current.node) return next.node > current.node ? next : current;
  return next.offset > current.offset ? next : current;
}

/**
 * Where the pointer puts the read part: the caret when it is inside the block, the block
 * end when the pointer is below the block, and null (no change) otherwise.
 */
export function pointerTarget(input: { caret: TextPos | null; below: boolean; end: TextPos }): TextPos | null {
  if (input.caret) return input.caret;
  return input.below ? input.end : null;
}
