<script lang="ts">
import { onMount } from "svelte";
import { NAV_LINKS } from "@/data/navLinks";

let { pathname }: { pathname: string } = $props();
let dark = $state(false);

onMount(() => {
  dark = document.documentElement.classList.contains("dark");
});

function hrefFor(href: string): string {
  return href;
}

function toggleTheme() {
  dark = !dark;
  document.documentElement.classList.toggle("dark", dark);
  localStorage.setItem("theme", dark ? "dark" : "light");
}
</script>

<nav
  class="sticky top-0 z-40 hidden border-b-[1.5px] border-ink bg-paper/90 backdrop-blur md:block"
>
  <div
    class="mx-auto flex h-14 w-full max-w-[var(--content-max)] items-center justify-between px-4 sm:px-6"
  >
    <a
      href={hrefFor("#home")}
      class="font-serif text-lg font-semibold italic text-ink no-underline"
      >viet bui</a
    >

    <div class="flex items-center gap-3 lg:gap-5 xl:gap-7">
      {#each NAV_LINKS as link, i (link.href)}
        <a
          href={hrefFor(link.href)}
          class="u-draw inline-flex items-baseline gap-1 font-mono text-step--1 uppercase tracking-wider text-ink no-underline"
        >
          <span class="text-[0.65em] text-journal-2">{String(i + 1).padStart(2, "0")}</span
          >{link.label}
        </a>
      {/each}

      <button
        onclick={toggleTheme}
        aria-label="Toggle dark mode"
        class="lift grid h-8 w-8 cursor-pointer place-items-center border-[1.5px] border-ink bg-paper-raised text-sm text-ink shadow-hard-sm"
      >
        {dark ? "☼" : "◐"}
      </button>
    </div>
  </div>
</nav>
