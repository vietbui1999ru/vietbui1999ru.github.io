// Click-to-load for video cards. The card's link is the no-JS fallback; with JS, a
// plain click swaps the card for an iframe on the privacy-enhanced host. Keyboard
// Enter on the focused link also fires click, so it swaps too.

export type VideoProvider = "youtube" | "vimeo";

export function embedUrl(provider: VideoProvider, id: string): string {
  return provider === "youtube"
    ? `https://www.youtube-nocookie.com/embed/${id}?autoplay=1`
    : `https://player.vimeo.com/video/${id}?autoplay=1`;
}

/** Delegated click handler under `root`. Returns the uninstall function. */
export function installVideoSwap(root: HTMLElement): () => void {
  const onClick = (event: MouseEvent) => {
    // Leave modified and non-primary clicks alone (open in a new tab, as a browser does).
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) {
      return;
    }
    const target = event.target as Element | null;
    const card = target?.closest<HTMLElement>(".video-card");
    if (!card || !root.contains(card)) return;
    const provider = card.dataset.provider as VideoProvider | undefined;
    const id = card.dataset.id;
    if (!id || (provider !== "youtube" && provider !== "vimeo")) return;

    event.preventDefault();
    const frame = document.createElement("iframe");
    frame.src = embedUrl(provider, id);
    frame.title = provider === "youtube" ? "YouTube video" : "Vimeo video";
    frame.allow = "accelerometer; encrypted-media; picture-in-picture; fullscreen";
    frame.allowFullscreen = true;
    frame.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
    frame.className = "video-frame";
    card.replaceChildren(frame);
  };
  root.addEventListener("click", onClick);
  return () => root.removeEventListener("click", onClick);
}
