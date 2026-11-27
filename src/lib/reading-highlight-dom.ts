import { furthest, pointerTarget, type TextPos } from "./reading-highlight";

// DOM side of the reading highlight (#39). It finds the text under a mouse or pen
// pointer and paints the read part of each [data-read-hl] block with the CSS Custom
// Highlight API, so the DOM stays unchanged.

export const HIGHLIGHT_NAME = "read-progress";

interface Block {
  el: HTMLElement;
  nodes: Text[];
  pos: TextPos | null;
}

interface Caret {
  node: Node;
  offset: number;
}

type CaretDocument = Document & {
  caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
  caretRangeFromPoint?: (x: number, y: number) => Range | null;
};

function caretAt(x: number, y: number): Caret | null {
  const doc = document as CaretDocument;
  if (doc.caretPositionFromPoint) {
    const p = doc.caretPositionFromPoint(x, y);
    return p ? { node: p.offsetNode, offset: p.offset } : null;
  }
  const r = doc.caretRangeFromPoint?.(x, y);
  return r ? { node: r.startContainer, offset: r.startOffset } : null;
}

function textNodes(el: HTMLElement): Text[] {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  for (let n = walker.nextNode(); n; n = walker.nextNode()) nodes.push(n as Text);
  return nodes;
}

function supported(): boolean {
  const doc = document as CaretDocument;
  if (!globalThis.CSS?.highlights || typeof globalThis.Highlight !== "function") return false;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return false;
  return Boolean(doc.caretPositionFromPoint || doc.caretRangeFromPoint);
}

function blockTarget(block: Block, caret: Caret | null, x: number, y: number): TextPos | null {
  const rect = block.el.getBoundingClientRect();
  const below = y > rect.bottom && x >= rect.left && x <= rect.right;
  const index = caret ? block.nodes.indexOf(caret.node as Text) : -1;
  const last = block.nodes.length - 1;
  return pointerTarget({
    caret: caret && index >= 0 ? { node: index, offset: caret.offset } : null,
    below,
    end: { node: last, offset: block.nodes[last].length },
  });
}

/**
 * Installs the reading highlight on each [data-read-hl] element inside `root`. Returns
 * the cleanup. Without API support, under reduced motion or with no block, it does nothing.
 */
export function installReadingHighlight(root: ParentNode): () => void {
  if (!supported()) return () => {};
  const blocks: Block[] = [...root.querySelectorAll<HTMLElement>("[data-read-hl]")]
    .map((el) => ({ el, nodes: textNodes(el), pos: null }))
    .filter((block) => block.nodes.length > 0);
  if (blocks.length === 0) return () => {};
  const registry = CSS.highlights;
  // One Highlight for the whole install, updated in place, so a pointer move does not
  // allocate a new Highlight.
  const highlight = new Highlight();

  const paint = () => {
    highlight.clear();
    for (const block of blocks) {
      if (!block.pos) continue;
      const range = document.createRange();
      range.setStart(block.nodes[0], 0);
      range.setEnd(block.nodes[block.pos.node], block.pos.offset);
      highlight.add(range);
    }
    if (!registry.has(HIGHLIGHT_NAME)) registry.set(HIGHLIGHT_NAME, highlight);
  };

  const onMove = (event: PointerEvent) => {
    if (event.pointerType !== "mouse" && event.pointerType !== "pen") return;
    const caret = caretAt(event.clientX, event.clientY);
    let changed = false;
    for (const block of blocks) {
      const target = blockTarget(block, caret, event.clientX, event.clientY);
      if (!target) continue;
      const next = furthest(block.pos, target);
      if (next !== block.pos) {
        block.pos = next;
        changed = true;
      }
    }
    if (changed) paint();
  };

  document.addEventListener("pointermove", onMove, { passive: true });
  return () => {
    document.removeEventListener("pointermove", onMove);
    registry.delete(HIGHLIGHT_NAME);
  };
}
