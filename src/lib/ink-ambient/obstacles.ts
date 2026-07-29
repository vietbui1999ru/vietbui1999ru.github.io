import type { Rect } from "./types";

const SELECTOR = [
  "[data-ink-obstacle]",
  "nav",
  "dialog[open]",
  "[role=dialog]",
  "[data-ink-modal]",
].join(",");

export function collectObstacles(root: ParentNode = document): Rect[] {
  const elements = Array.from(root.querySelectorAll<HTMLElement>(SELECTOR));
  const unique = new Set<Element>();
  const obstacles: Rect[] = [];
  for (const element of elements) {
    if (unique.has(element) || element.getAttribute("aria-hidden") === "true")
      continue;
    unique.add(element);
    const rect = element.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) continue;
    obstacles.push({
      x: rect.left,
      y: rect.top,
      width: rect.width,
      height: rect.height,
      kind:
        element.getAttribute("data-ink-obstacle") ??
        element.tagName.toLowerCase(),
      fixed:
        getComputedStyle(element).position === "fixed" ||
        getComputedStyle(element).position === "sticky",
    });
  }
  return obstacles;
}

export function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return true;
  return Boolean(
    target.closest(
      "a,button,input,textarea,select,summary,video,audio,canvas,[contenteditable=true],[role=button],[role=link],[role=dialog],dialog,nav",
    ),
  );
}

export function hasTextSelection(): boolean {
  return (
    typeof window !== "undefined" && Boolean(window.getSelection()?.toString())
  );
}

export function hasOpenModal(root: ParentNode = document): boolean {
  return Boolean(
    root.querySelector(
      'dialog[open], [data-ink-modal]:not([aria-hidden="true"]), [role="dialog"]:not([aria-hidden="true"])',
    ),
  );
}
