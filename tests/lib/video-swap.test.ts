import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { installVideoSwap } from "@/lib/video-swap";

let root: HTMLElement;
let uninstall: () => void;

function card(provider: string, id: string, href: string) {
  return (
    `<p class="video-card" data-provider="${provider}" data-id="${id}">` +
    `<a href="${href}" target="_blank" rel="noopener noreferrer">Watch</a></p>`
  );
}

beforeEach(() => {
  root = document.createElement("div");
  root.innerHTML = card(
    "youtube",
    "abc123",
    "https://www.youtube-nocookie.com/watch?v=abc123",
  );
  document.body.appendChild(root);
  uninstall = installVideoSwap(root);
});

afterEach(() => {
  uninstall();
  root.remove();
});

describe("video card swap", () => {
  it("keeps the link and renders no iframe before a click", () => {
    expect(root.querySelector("iframe")).toBeNull();
    expect(root.querySelector("a")).not.toBeNull();
  });

  it("swaps in a youtube-nocookie iframe in place on click and stops the link", () => {
    const link = root.querySelector("a")!;
    const event = new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 });
    link.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    const frame = root.querySelector("iframe");
    expect(frame).not.toBeNull();
    expect(frame!.src).toBe("https://www.youtube-nocookie.com/embed/abc123?autoplay=1");
    expect(root.querySelector("a")).toBeNull();
  });

  it("uses the Vimeo player for a Vimeo card", () => {
    root.innerHTML = card("vimeo", "76979871", "https://vimeo.com/76979871");
    root.querySelector("a")!.dispatchEvent(
      new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 }),
    );
    expect(root.querySelector("iframe")!.src).toBe(
      "https://player.vimeo.com/video/76979871?autoplay=1",
    );
  });

  it("leaves modifier clicks to open the link in a new tab", () => {
    const event = new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      button: 0,
      ctrlKey: true,
    });
    root.querySelector("a")!.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    expect(root.querySelector("iframe")).toBeNull();
  });

  it("does nothing after uninstall", () => {
    uninstall();
    root.querySelector("a")!.dispatchEvent(
      new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 }),
    );
    expect(root.querySelector("iframe")).toBeNull();
  });
});
