// Page observers for the ink island. Under the ClientRouter the island persists across
// navigations, but each swap replaces document.body, so its observers must move to the new
// body and the new page's sections after every swap (#42).

export interface PageWatchOptions {
  /** The body resized or changed in a way that can move obstacles. */
  onLayout: () => void;
  /** Visibility changes of the page's [data-section-id] elements. */
  onSections: IntersectionObserverCallback;
  /** A swap brought in a new page; called before the observers watch it. */
  onSwap: () => void;
}

const MUTATIONS: MutationObserverInit = {
  subtree: true,
  childList: true,
  attributes: true,
  attributeFilter: ["class", "open", "aria-hidden", "data-ink-obstacle"],
};
const SECTION_THRESHOLDS = [0.15, 0.35, 0.6];

/** Watches the current page and follows every swap. Returns `disconnect`. */
export function watchPage(options: PageWatchOptions): { disconnect: () => void } {
  const resize = new ResizeObserver(() => options.onLayout());
  const mutation = new MutationObserver(() => options.onLayout());
  const sections = new IntersectionObserver(options.onSections, { threshold: SECTION_THRESHOLDS });

  const bind = () => {
    resize.observe(document.body);
    mutation.observe(document.body, MUTATIONS);
    document.querySelectorAll("[data-section-id]").forEach((el) => sections.observe(el));
  };
  const unbind = () => {
    resize.disconnect();
    mutation.disconnect();
    sections.disconnect();
  };
  const afterSwap = () => {
    unbind();
    options.onSwap();
    bind();
  };

  bind();
  document.addEventListener("astro:after-swap", afterSwap);
  return {
    disconnect: () => {
      document.removeEventListener("astro:after-swap", afterSwap);
      unbind();
    },
  };
}
