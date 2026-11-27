<script lang="ts" module>
import type { LibraryType } from "../../content/schemas";

// One simple line glyph per type, drawn in a 24 x 24 box.
export const TYPE_ICON_PATHS: Record<LibraryType, string> = {
  game: "M6 9h12a3 3 0 0 1 3 3v2a3 3 0 0 1-5 2l-1-1H9l-1 1a3 3 0 0 1-5-2v-2a3 3 0 0 1 3-3zM8 11v3M6.5 12.5h3",
  book: "M5 4h9a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3zM5 17a3 3 0 0 1 3-3h9",
  film: "M4 6h16v12H4zM8 6v12M16 6v12M4 10h4M4 14h4M16 10h4M16 14h4",
  recipe: "M4 12h16a8 8 0 0 1-16 0zM9 9c0-2 2-2 2-4M14 9c0-2 2-2 2-4",
};
</script>

<script lang="ts">
import Chip from "../primitives/Chip.svelte";
import type { LibraryCardData } from "../../lib/library-view";
import { STATUS_STYLE } from "../../lib/library-status";

let { item }: { item: LibraryCardData } = $props();
const style = $derived(STATUS_STYLE[item.status]);
</script>

<!-- h-full: every card fills its grid cell, so a row has one height. Faded cards
     return to full strength on hover or keyboard focus, so their text stays readable. -->
<article
  class={[
    "relative flex h-full w-full cursor-pointer flex-col border-[1.5px] border-ink bg-paper-raised shadow-hard transition-opacity hover:opacity-100 focus-within:opacity-100 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ink",
    style.opacity,
  ]}
  data-library-card
  data-status={item.status}
>
  <div class={["flex h-6 shrink-0 items-center justify-end border-b-[1.5px] border-ink px-2", style.band]} data-status-band>
    {#if item.status === "done"}
      <svg viewBox="0 0 16 16" class="h-4 w-4 text-ink" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <path d="M3 8.5l3 3 7-7" />
      </svg>
    {/if}
  </div>
  {#if item.thumb}
    <img
      src={item.thumb.src}
      width={item.thumb.width}
      height={item.thumb.height}
      alt=""
      loading="lazy"
      decoding="async"
      class="aspect-[3/4] w-full border-b-[1.5px] border-ink object-cover"
      data-thumbnail
    />
  {:else}
    <div
      class="flex aspect-[3/4] w-full flex-col items-center justify-center gap-3 border-b-[1.5px] border-ink bg-journal-4 p-4 text-center"
      data-placeholder={item.type}
    >
      <svg viewBox="0 0 24 24" class="h-10 w-10 text-journal-1" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
        <path d={TYPE_ICON_PATHS[item.type]} />
      </svg>
      <span class="line-clamp-3 font-serif text-step--1 text-ink">{item.title}</span>
    </div>
  {/if}

  <div class="flex flex-1 flex-col gap-2 p-3">
    <h3 class="line-clamp-2 min-h-[2lh] font-serif text-step-0 font-semibold text-ink">
      <!-- The link's ::after covers the whole card, so a click anywhere opens the item. -->
      <a
        href={item.href}
        class={[
          "u-draw text-ink no-underline after:absolute after:inset-0 after:content-[''] focus-visible:outline-none",
          style.struck && "line-through",
        ]}
        data-card-link>{item.title}</a
      >
    </h3>
    <!-- The meta line keeps its height when empty, so cards line up. -->
    <p class="min-h-[1lh] truncate font-mono text-step--1 text-journal-1">{item.meta}</p>
    <span class="mt-auto flex flex-wrap gap-1.5">
      <Chip tone="raised">{item.statusLabel}</Chip>
      {#if item.draft}
        <Chip tone="rose">draft</Chip>
      {/if}
    </span>
  </div>
</article>
