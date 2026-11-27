// Page scripts under Astro's ClientRouter. A bundled script runs once, but each navigation
// swaps in a new body, so per-page setup must run again on every page load (#42).

type Cleanup = () => void;

/**
 * Runs `install` on each `astro:page-load` and the cleanup it returned on the next
 * `astro:before-swap`. Returns a function that removes the listeners and runs any
 * pending cleanup.
 */
export function onPageLoad(install: () => Cleanup | void): Cleanup {
  let cleanup: Cleanup | undefined;
  const runCleanup = () => {
    const pending = cleanup;
    cleanup = undefined;
    pending?.();
  };
  const load = () => {
    runCleanup();
    cleanup = install() ?? undefined;
  };
  document.addEventListener("astro:page-load", load);
  document.addEventListener("astro:before-swap", runCleanup);
  return () => {
    document.removeEventListener("astro:page-load", load);
    document.removeEventListener("astro:before-swap", runCleanup);
    runCleanup();
  };
}

/**
 * Sets the `dark` and `ink-ambient-disabled` classes from the stored preferences. The
 * inline head script does this before the first paint; a swap replaces the `<html>`
 * attributes, so `astro:after-swap` calls this again before the new page paints.
 */
export function applyStoredPreferences(root: HTMLElement): void {
  const theme = localStorage.getItem("theme");
  const dark = theme === "dark" || (!theme && matchMedia("(prefers-color-scheme: dark)").matches);
  root.classList.toggle("dark", dark);
  root.classList.toggle("ink-ambient-disabled", localStorage.getItem("ink-ambient") === "off");
}
