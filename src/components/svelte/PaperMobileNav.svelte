<script lang="ts">
import { NAV_LINKS } from "../../data/navLinks";

let { pathname }: { pathname: string } = $props();
let activeHref = $state("");
let dark = $state(false);
let inkAmbientEnabled = $state(true);

function hrefFor(href: string): string {
  return href;
}

function toggleTheme() {
  dark = !dark;
  document.documentElement.classList.toggle("dark", dark);
  localStorage.setItem("theme", dark ? "dark" : "light");
}

function toggleInkAmbient() {
  inkAmbientEnabled = !inkAmbientEnabled;
  document.documentElement.classList.toggle(
    "ink-ambient-disabled",
    !inkAmbientEnabled,
  );
  localStorage.setItem("ink-ambient", inkAmbientEnabled ? "on" : "off");
  window.dispatchEvent(
    new CustomEvent("ink-ambient-change", {
      detail: { enabled: inkAmbientEnabled },
    }),
  );
}

function observeSections(_node: HTMLElement) {
  dark = document.documentElement.classList.contains("dark");
  inkAmbientEnabled = !document.documentElement.classList.contains(
    "ink-ambient-disabled",
  );
  activeHref = pathname;
}
</script>

<nav
  aria-label="Mobile site navigation"
  class="fixed inset-x-0 bottom-0 z-50 border-t-[1.5px] border-ink bg-paper/95 backdrop-blur md:hidden"
  style="padding-bottom: env(safe-area-inset-bottom, 0px)"
  {@attach observeSections}
>
  <div class="flex items-stretch overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
    {#each NAV_LINKS as link, i (link.href)}
      <a
        href={hrefFor(link.href)}
        aria-current={activeHref === link.href ? "page" : undefined}
        class={[
          "flex min-h-14 w-[4.25rem] shrink-0 flex-col items-center justify-center border-r border-journal-3 px-1 font-mono uppercase no-underline transition-colors",
          activeHref === link.href ? "bg-pastel-butter text-ink" : "bg-paper text-journal-1",
        ]}
      >
        <span class="text-[0.58rem] text-journal-2">{String(i + 1).padStart(2, "0")}</span>
        <span class="text-[0.62rem] leading-tight tracking-wide">{link.label}</span>
      </a>
    {/each}

    <button
      onclick={toggleInkAmbient}
      aria-label={inkAmbientEnabled ? "Disable ink ambient animation" : "Enable ink ambient animation"}
      aria-pressed={inkAmbientEnabled}
      class="grid min-h-14 w-14 shrink-0 cursor-pointer place-items-center border-0 bg-paper font-mono text-ink"
    >
      {inkAmbientEnabled ? "✦" : "·"}
    </button>
    <button
      onclick={toggleTheme}
      aria-label="Toggle dark mode"
      class="grid min-h-14 w-14 shrink-0 cursor-pointer place-items-center border-0 bg-paper font-mono text-ink"
    >
      {dark ? "☼" : "◐"}
    </button>
  </div>
</nav>
