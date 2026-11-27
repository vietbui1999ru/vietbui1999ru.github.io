<script lang="ts" generics="T">
import type { Snippet } from "svelte";
import type { ClassValue } from "svelte/elements";
import { PASTEL_BG, type Pastel } from "../../design-system/tone";

// Vertical timeline with a marker that follows a mouse or pen pointer, or the
// scroll position otherwise. The markup is static: installTimelineRails (BaseLayout script)
// moves the marker and scales the line with transforms, and sets the checkpoint states.
// Before the script runs it renders as a static timeline with every checkpoint passed.
let {
  items,
  key,
  tone,
  entry,
  class: className,
}: {
  items: T[];
  key: (item: T) => string;
  tone: (item: T) => Pastel;
  entry: Snippet<[T]>;
  class?: ClassValue;
} = $props();
</script>

<div data-rail data-ink-obstacle="prose" class={["rail relative ml-2", className]}>
  <span aria-hidden="true" data-rail-line="passed" class="rail-passed absolute top-0 left-0 w-[1.5px] bg-ink"></span>
  <span aria-hidden="true" data-rail-line="upcoming" class="rail-upcoming absolute bottom-0 left-0 w-[1.5px] bg-journal-3"></span>
  <span aria-hidden="true" data-rail-marker class="rail-marker absolute top-0 -left-[7px] z-10">
    <span class="block h-[13px] w-[13px] border-2 border-ink bg-paper-raised shadow-hard-sm"></span>
  </span>

  <ol>
  {#each items as item, i (key(item))}
    <li class="relative pb-10 pl-8 last:pb-0">
      <span
        aria-hidden="true"
        data-checkpoint
        data-index={i}
        data-state="passed"
        class="rail-checkpoint absolute top-1 -left-[6px] h-[11px] w-[11px] border-[1.5px] border-ink {PASTEL_BG[tone(item)]}"
      ></span>
      {@render entry(item)}
    </li>
  {/each}
  </ol>
</div>

<style>
  /* Static fallback: full passed line, no marker. */
  .rail-passed {
    height: 100%;
  }
  .rail-upcoming {
    top: 100%;
  }
  .rail-marker {
    display: none;
  }
  .rail-checkpoint:global([data-state="upcoming"]) {
    background-color: var(--color-paper-raised);
  }

  /* Script ready: both segments span the rail and the script scales them (scaleY), and it
     moves the marker with translate3d. Transforms skip layout and restyle, so the frames stay
     on the compositor. The data-* attributes are added at runtime, so they sit in :global(). */
  .rail:global([data-rail-ready]) .rail-marker {
    display: block;
    will-change: transform;
  }
  .rail:global([data-rail-ready]) .rail-passed,
  .rail:global([data-rail-ready]) .rail-upcoming {
    top: 0;
    height: 100%;
    will-change: transform;
  }
  .rail:global([data-rail-ready]) .rail-passed {
    transform-origin: top;
  }
  .rail:global([data-rail-ready]) .rail-upcoming {
    transform-origin: bottom;
  }
  .rail:global([data-rail-ready]) .rail-checkpoint {
    transition: background-color 150ms ease-out;
  }

  @media (prefers-reduced-motion: reduce) {
    .rail:global([data-rail-ready]) .rail-checkpoint {
      transition: none;
    }
  }
</style>
