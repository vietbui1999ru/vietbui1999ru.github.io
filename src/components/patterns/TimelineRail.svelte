<script lang="ts" generics="T">
import type { Snippet } from "svelte";
import type { ClassValue } from "svelte/elements";
import { PASTEL_BG, type Pastel } from "../../design-system/tone";

// Vertical timeline with a marker that follows a mouse or pen pointer, or the
// scroll position otherwise. The markup is static: installTimelineRails (BaseLayout script)
// springs --rail-y and sets the checkpoint states each frame; CSS draws the marker and line there.
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
    transform: translateY(calc(var(--rail-y, 0px) - 6.5px));
  }
  .rail-checkpoint:global([data-state="upcoming"]) {
    background-color: var(--color-paper-raised);
  }

  /* Script ready: the marker and the line sit at --rail-y. */
  .rail:global([data-rail-ready]) .rail-marker {
    display: block;
  }
  .rail:global([data-rail-ready]) .rail-passed {
    height: var(--rail-y, 0px);
  }
  .rail:global([data-rail-ready]) .rail-upcoming {
    top: var(--rail-y, 0px);
  }

  /* The script springs --rail-y each frame (rail-motion.ts), so the marker and the line
     need no transition. The data-* attributes are added at runtime, so they sit in :global(). */
  .rail:global([data-rail-ready]) .rail-checkpoint {
    transition: background-color 150ms ease-out;
  }
  /* The script spins checkpoints near the marker (style.rotate) and sets data-pop when one
     changes state: a short stamp-like pop. */
  .rail-checkpoint:global([data-pop]) {
    animation: rail-pop 260ms cubic-bezier(0.3, 1.6, 0.5, 1);
  }
  @keyframes rail-pop {
    0% {
      scale: 1;
    }
    40% {
      scale: 1.45;
    }
    100% {
      scale: 1;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .rail:global([data-rail-ready]) .rail-checkpoint {
      transition: none;
    }
    .rail-checkpoint:global([data-pop]) {
      animation: none;
    }
  }
</style>
