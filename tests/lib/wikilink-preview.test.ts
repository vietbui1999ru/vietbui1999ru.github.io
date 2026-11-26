import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  installWikilinkPreview,
  safeCoverUrl,
  PREVIEW_CARD_ID,
} from "@/lib/wikilink-preview";

let root: HTMLElement;
let uninstall: () => void;

function link(attrs: Record<string, string>, text = "Deep thought"): HTMLAnchorElement {
  const a = document.createElement("a");
  a.href = "/thoughts#deep-thought";
  for (const [k, v] of Object.entries(attrs)) a.setAttribute(k, v);
  a.textContent = text;
  root.appendChild(a);
  return a;
}

function hover(el: Element) {
  el.dispatchEvent(new Event("mouseover", { bubbles: true }));
}

function leave(el: Element) {
  el.dispatchEvent(new Event("mouseout", { bubbles: true, relatedTarget: document.body } as EventInit));
}

beforeEach(() => {
  root = document.createElement("main");
  document.body.appendChild(root);
});

afterEach(() => {
  uninstall?.();
  document.getElementById(PREVIEW_CARD_ID)?.remove();
  root.remove();
});

describe("safeCoverUrl", () => {
  it("accepts same-origin absolute paths only", () => {
    expect(safeCoverUrl("/blog-assets/hello/cover.png")).toBe("/blog-assets/hello/cover.png");
    expect(safeCoverUrl("//evil.example/x.png")).toBeUndefined();
    expect(safeCoverUrl("https://evil.example/x.png")).toBeUndefined();
    expect(safeCoverUrl("javascript:alert(1)")).toBeUndefined();
    expect(safeCoverUrl(undefined)).toBeUndefined();
  });
});

describe("wikilink hover card", () => {
  it("shows type label, title, preview and cover on hover when the pointer is fine", () => {
    uninstall = installWikilinkPreview(root, { canHover: () => true });
    const a = link({
      "data-kind": "thought",
      "data-title": "Deep thought",
      "data-preview": "A short preview of the note.",
      "data-cover": "/blog-assets/deep/cover.png",
    });
    hover(a);
    const card = document.getElementById(PREVIEW_CARD_ID)!;
    expect(card).not.toBeNull();
    expect(card.textContent).toContain("Thought");
    expect(card.querySelector("strong")!.textContent).toBe("Deep thought");
    expect(card.querySelector("p")!.textContent).toBe("A short preview of the note.");
    expect(card.querySelector("img")!.getAttribute("src")).toBe("/blog-assets/deep/cover.png");
    expect(a.getAttribute("aria-describedby")).toBe(PREVIEW_CARD_ID);
  });

  it("omits the image when no cover is given and the preview when empty", () => {
    uninstall = installWikilinkPreview(root, { canHover: () => true });
    hover(link({ "data-kind": "project", "data-title": "Garden" }));
    const card = document.getElementById(PREVIEW_CARD_ID)!;
    expect(card.querySelector("img")).toBeNull();
    expect(card.querySelector("p")).toBeNull();
  });

  it("never shows a cover from an unsafe URL", () => {
    uninstall = installWikilinkPreview(root, { canHover: () => true });
    hover(link({ "data-kind": "blog", "data-title": "X", "data-cover": "https://evil.example/a.png" }));
    expect(document.querySelector(`#${PREVIEW_CARD_ID} img`)).toBeNull();
  });

  it("does not show anything when the device has no fine hover (touch)", () => {
    uninstall = installWikilinkPreview(root, { canHover: () => false });
    hover(link({ "data-kind": "blog", "data-title": "X" }));
    expect(document.getElementById(PREVIEW_CARD_ID)).toBeNull();
  });

  it("hides when the pointer leaves the link", () => {
    uninstall = installWikilinkPreview(root, { canHover: () => true });
    const a = link({ "data-kind": "blog", "data-title": "X" });
    hover(a);
    leave(a);
    expect(document.getElementById(PREVIEW_CARD_ID)).toBeNull();
    expect(a.hasAttribute("aria-describedby")).toBe(false);
  });

  it("shows on keyboard focus and hides on Escape", () => {
    uninstall = installWikilinkPreview(root, { canHover: () => true });
    const a = link({ "data-kind": "blog", "data-title": "X" });
    a.dispatchEvent(new Event("focusin", { bubbles: true }));
    expect(document.getElementById(PREVIEW_CARD_ID)).not.toBeNull();
    a.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(document.getElementById(PREVIEW_CARD_ID)).toBeNull();
  });

  it("ignores links without hover data", () => {
    uninstall = installWikilinkPreview(root, { canHover: () => true });
    hover(link({}));
    expect(document.getElementById(PREVIEW_CARD_ID)).toBeNull();
  });

  it("does nothing after uninstall", () => {
    uninstall = installWikilinkPreview(root, { canHover: () => true });
    uninstall();
    hover(link({ "data-kind": "blog", "data-title": "X" }));
    expect(document.getElementById(PREVIEW_CARD_ID)).toBeNull();
  });
});
