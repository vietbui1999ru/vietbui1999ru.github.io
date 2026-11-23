// Hover and focus card for published wikilinks. The data comes from attributes the
// remark plugin already emits (data-kind, data-title, data-preview, data-cover).
// Only fine-pointer devices get the card; touch taps follow the link unchanged.

export const PREVIEW_CARD_ID = "wikilink-preview-card";
const PREVIEW_MAX = 280;

const KIND_LABEL: Record<string, string> = {
  blog: "Post",
  thought: "Thought",
  project: "Project",
  role: "Role",
  education: "Education",
  gallery: "Gallery",
};

/** Same-origin absolute paths only. Blocks protocol-relative and foreign URLs. */
export function safeCoverUrl(value: string | undefined): string | undefined {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return undefined;
  return value;
}

function buildCard(doc: Document, anchor: HTMLAnchorElement): HTMLElement {
  const card = doc.createElement("div");
  card.id = PREVIEW_CARD_ID;
  card.className = "wikilink-card";
  card.setAttribute("role", "tooltip");

  const kind = doc.createElement("span");
  kind.className = "wikilink-card-kind";
  kind.textContent = KIND_LABEL[anchor.dataset.kind ?? ""] ?? "Note";
  card.appendChild(kind);

  const title = doc.createElement("strong");
  title.className = "wikilink-card-title";
  title.textContent = anchor.dataset.title ?? anchor.textContent ?? "";
  card.appendChild(title);

  const preview = (anchor.dataset.preview ?? "").slice(0, PREVIEW_MAX);
  if (preview) {
    const p = doc.createElement("p");
    p.className = "wikilink-card-preview";
    p.textContent = preview;
    card.appendChild(p);
  }

  const cover = safeCoverUrl(anchor.dataset.cover);
  if (cover) {
    const img = doc.createElement("img");
    img.className = "wikilink-card-cover";
    img.src = cover;
    img.alt = "";
    img.loading = "lazy";
    card.appendChild(img);
  }
  return card;
}

function position(card: HTMLElement, anchor: HTMLAnchorElement): void {
  const rect = anchor.getBoundingClientRect();
  const scrollX = window.scrollX;
  const scrollY = window.scrollY;
  const maxLeft = scrollX + document.documentElement.clientWidth - card.offsetWidth - 16;
  card.style.top = `${rect.bottom + scrollY + 8}px`;
  card.style.left = `${Math.max(scrollX + 16, Math.min(rect.left + scrollX, maxLeft))}px`;
}

export interface WikilinkPreviewOptions {
  /** True when the device has a fine pointer that hovers. Touch-only devices say false. */
  canHover?: () => boolean;
}

/** Delegated listeners under `root`. Returns the uninstall function. */
export function installWikilinkPreview(
  root: HTMLElement,
  options: WikilinkPreviewOptions = {},
): () => void {
  const canHover = options.canHover ?? (() => false);
  let active: HTMLAnchorElement | null = null;

  const hide = () => {
    document.getElementById(PREVIEW_CARD_ID)?.remove();
    active?.removeAttribute("aria-describedby");
    active = null;
  };

  const show = (anchor: HTMLAnchorElement) => {
    if (!canHover() || anchor.dataset.kind === undefined) return;
    if (active !== anchor) hide();
    active = anchor;
    const card = buildCard(document, anchor);
    document.body.appendChild(card);
    position(card, anchor);
    anchor.setAttribute("aria-describedby", PREVIEW_CARD_ID);
  };

  const anchorOf = (target: EventTarget | null): HTMLAnchorElement | null => {
    const el = target as Element | null;
    const a = el?.closest?.("a");
    return a && root.contains(a) ? (a as HTMLAnchorElement) : null;
  };

  const onOver = (event: MouseEvent) => {
    const a = anchorOf(event.target);
    if (a) show(a);
  };
  const onOut = (event: MouseEvent) => {
    const a = anchorOf(event.target);
    const next = event.relatedTarget as Node | null;
    if (a && a === active && !(next && a.contains(next))) hide();
  };
  const onFocus = (event: FocusEvent) => {
    const a = anchorOf(event.target);
    if (a) show(a);
  };
  const onBlur = (event: FocusEvent) => {
    const a = anchorOf(event.target);
    if (a && a === active) hide();
  };
  const onKey = (event: KeyboardEvent) => {
    if (event.key === "Escape") hide();
  };

  root.addEventListener("mouseover", onOver);
  root.addEventListener("mouseout", onOut);
  root.addEventListener("focusin", onFocus);
  root.addEventListener("focusout", onBlur);
  root.addEventListener("keydown", onKey);
  return () => {
    root.removeEventListener("mouseover", onOver);
    root.removeEventListener("mouseout", onOut);
    root.removeEventListener("focusin", onFocus);
    root.removeEventListener("focusout", onBlur);
    root.removeEventListener("keydown", onKey);
    hide();
  };
}
