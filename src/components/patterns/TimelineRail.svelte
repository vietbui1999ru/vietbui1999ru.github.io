<script lang="ts" generics="T">
import type { Snippet } from "svelte";
import type { Attachment } from "svelte/attachments";
import type { ClassValue } from "svelte/elements";
import { PASTEL_BG, type Pastel } from "../../design-system/tone";
import { checkpointStates, markerOffset, type RailMode } from "../../lib/timeline-rail";

// Vertical timeline with a breathing marker that follows a mouse or pen pointer,
// or the scroll position otherwise. Before it mounts it renders as a static timeline.
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

let measured = $state(false);
let marker = $state(0);
let offsets = $state<number[]>([]);
let mode: RailMode = "scroll";
let pointerY = 0;

const states = $derived(
  measured ? checkpointStates(offsets, marker) : items.map(() => "passed" as const),
);

function measure(rail: HTMLElement) {
  const rect = rail.getBoundingClientRect();
  offsets = [...rail.querySelectorAll<HTMLElement>("[data-checkpoint]")].map((cp) => {
    const r = cp.getBoundingClientRect();
    return r.top + r.height / 2 - rect.top;
  });
  marker = markerOffset({ mode, pointerY, viewportHeight: window.innerHeight }, rect);
  measured = true;
}

const track: Attachment<HTMLElement> = (rail) => {
  const update = () => measure(rail);
  const onMove = (event: PointerEvent) => {
    if (event.pointerType !== "mouse" && event.pointerType !== "pen") return;
    mode = "pointer";
    pointerY = event.clientY;
    update();
  };
  const onLeave = () => {
    mode = "scroll";
    update();
  };
  rail.addEventListener("pointermove", onMove);
  rail.addEventListener("pointerleave", onLeave);
  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);
  update();
  return () => {
    rail.removeEventListener("pointermove", onMove);
    rail.removeEventListener("pointerleave", onLeave);
    window.removeEventListener("scroll", update);
    window.removeEventListener("resize", update);
  };
};
</script>

<div {@attach track} data-rail data-ink-obstacle="prose" class={["relative ml-2", className]}>
  <span
    aria-hidden="true"
    data-rail-line="passed"
    class="absolute top-0 left-0 w-[1.5px] bg-ink"
    style:height={measured ? `${marker}px` : "100%"}
  ></span>
  <span
    aria-hidden="true"
    data-rail-line="upcoming"
    class="absolute bottom-0 left-0 w-[1.5px] bg-journal-3"
    style:top={measured ? `${marker}px` : "100%"}
  ></span>
  <span
    aria-hidden="true"
    data-rail-marker
    class="rail-marker absolute top-0 -left-[7px] z-10 {measured ? '' : 'hidden'}"
    style:transform="translateY({marker - 6.5}px)"
  >
    <span class="rail-breath block h-[13px] w-[13px] border-2 border-ink bg-paper-raised shadow-hard-sm"></span>
  </span>

  <ol>
  {#each items as item, i (key(item))}
    <li class="relative pb-10 pl-8 last:pb-0">
      <span
        aria-hidden="true"
        data-checkpoint
        data-index={i}
        data-state={states[i]}
        class="absolute top-1 -left-[6px] h-[11px] w-[11px] border-[1.5px] border-ink transition-colors motion-reduce:transition-none {states[i] === 'passed' ? PASTEL_BG[tone(item)] : 'bg-paper-raised'}"
      ></span>
      {@render entry(item)}
    </li>
  {/each}
  </ol>
</div>

<style>
  .rail-marker {
    transition: transform 160ms ease-out;
  }
  .rail-breath {
    animation: rail-breathe var(--rail-breath-duration, 2.4s) ease-in-out infinite;
  }
  @keyframes rail-breathe {
    0%,
    100% {
      scale: 1;
    }
    50% {
      scale: var(--rail-breath-scale, 1.25);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .rail-marker {
      transition: none;
    }
    .rail-breath {
      animation: none;
    }
  }
</style>
