<script lang="ts">
import { onMount } from "svelte";
import { NAV_LINKS } from "@/data/navLinks";

let { pathname }: { pathname: string } = $props();
let dark = $state(false);
let inkAmbientEnabled = $state(true);

onMount(() => {
  dark = document.documentElement.classList.contains("dark");
  inkAmbientEnabled = !document.documentElement.classList.contains(
    "ink-ambient-disabled",
  );
});

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
</script>

<nav
  class="sticky top-0 z-40 hidden border-b-[1.5px] border-ink bg-paper/90 backdrop-blur md:block"
>
  <div
    class="mx-auto flex h-14 w-full max-w-[var(--content-max)] items-center justify-between px-4 sm:px-6"
  >
    <a
      href={hrefFor("/")}
      class="group relative inline-flex items-center font-serif text-xl font-black italic leading-none tracking-[-0.04em] text-ink no-underline"
    >
      <span class="relative z-10">viet bui</span>
      <span
        aria-hidden="true"
        class="absolute inset-x-0 bottom-[-0.15rem] h-2 bg-pastel-butter transition-transform duration-200 group-hover:translate-y-0.5"
      ></span>
    </a>

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

      <div class="flex items-center gap-2">
        <button
          onclick={toggleInkAmbient}
          aria-label={inkAmbientEnabled ? "Disable ink ambient animation" : "Enable ink ambient animation"}
          aria-pressed={inkAmbientEnabled}
          class="lift grid h-8 w-8 cursor-pointer place-items-center border-[1.5px] border-ink bg-paper-raised text-sm text-ink shadow-hard-sm"
        >
          {inkAmbientEnabled ? "✦" : "·"}
        </button>
        <button
          onclick={() => window.dispatchEvent(new CustomEvent("ink-ambient-add-predator"))}
          aria-label="Add a predator"
          class="lift grid h-8 w-8 cursor-pointer place-items-center border-[1.5px] border-ink bg-paper-raised shadow-hard-sm"
        >
          <img
            src="/assets/images/VectorPen.svg"
            alt=""
            aria-hidden="true"
            class="h-7 w-8 object-contain"
          />
        </button>
        <button
          onclick={() => window.dispatchEvent(new CustomEvent("ink-ambient-add-prey"))}
          aria-label="Add a prey"
          class="lift grid h-8 w-8 cursor-pointer place-items-center border-[1.5px] border-ink bg-paper-raised shadow-hard-sm"
        >
          <img
            src="/assets/images/VectorPencil.svg"
            alt=""
            aria-hidden="true"
            class="h-4 w-5 object-contain"
          />
        </button>
        <button
          onclick={() => window.dispatchEvent(new CustomEvent("ink-ambient-reset"))}
          aria-label="Reset ink ambient simulation"
          class="lift grid h-8 w-8 cursor-pointer place-items-center border-[1.5px] border-ink bg-paper-raised text-sm text-ink shadow-hard-sm"
        >
          ↺
        </button>
        <button
          onclick={toggleTheme}
          aria-label="Toggle dark mode"
          class="lift grid h-8 w-8 cursor-pointer place-items-center border-[1.5px] border-ink bg-paper-raised text-sm text-ink shadow-hard-sm"
        >
          {dark ? "☼" : "◐"}
        </button>
      </div>
    </div>
  </div>
</nav>
