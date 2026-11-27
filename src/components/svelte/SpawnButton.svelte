<script lang="ts">
import { onDestroy, type Snippet } from "svelte";
import { createSubscriber } from "svelte/reactivity";
import { getSpawnState, subscribeSpawnState } from "@/lib/ink-ambient/spawn-state";

// A pen or pencil button with the manual spawn cap (#42). At the cap it looks disabled
// (aria-disabled, greyed) but still takes clicks: a click spawns nothing, shakes the
// button (not under reduced motion) and shows a short note in a polite live region.
let {
  role,
  label,
  limitLabel,
  children,
}: {
  role: "predator" | "prey";
  label: string;
  limitLabel: string;
  children: Snippet;
} = $props();

const NOTE_MS = 1500;
// The store is external, so createSubscriber links it to Svelte: a read of `full`
// in a reactive context subscribes, and the last reader leaving unsubscribes.
const subscribe = createSubscriber((update) => subscribeSpawnState(() => update()));
const full = $derived.by(() => {
  subscribe();
  return getSpawnState()[role].full;
});
let note = $state("");
let shaking = $state(false);
let noteTimer: ReturnType<typeof setTimeout> | undefined;

onDestroy(() => clearTimeout(noteTimer));

function click() {
  if (!full) {
    window.dispatchEvent(new CustomEvent(role === "predator" ? "ink-ambient-add-predator" : "ink-ambient-add-prey"));
    return;
  }
  note = limitLabel;
  shaking = !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  clearTimeout(noteTimer);
  noteTimer = setTimeout(() => {
    note = "";
    shaking = false;
  }, NOTE_MS);
}
</script>

<span class="relative">
  <button
    type="button"
    onclick={click}
    aria-label={full ? limitLabel : label}
    aria-disabled={full ? "true" : undefined}
    data-shake={shaking ? "" : undefined}
    class={[
      "spawn-button grid h-8 w-8 cursor-pointer place-items-center border-[1.5px] border-ink bg-paper-raised shadow-hard-sm",
      full ? "opacity-45" : "lift",
    ]}
  >
    {@render children()}
  </button>
  <span
    role="status"
    aria-live="polite"
    class="pointer-events-none absolute top-full left-1/2 mt-2 -translate-x-1/2 whitespace-nowrap font-mono text-[0.65rem] tracking-wider text-journal-1"
  >{note}</span>
</span>

<style>
  .spawn-button:global([data-shake]) {
    animation: spawn-shake 360ms ease-in-out;
  }
  @keyframes spawn-shake {
    0%,
    100% {
      translate: 0;
    }
    20%,
    60% {
      translate: -3px;
    }
    40%,
    80% {
      translate: 3px;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .spawn-button:global([data-shake]) {
      animation: none;
    }
  }
</style>
