<script lang="ts">
import type { ClassValue } from "svelte/elements";

let {
  title,
  index,
  kicker,
  as = "h2",
  class: className,
}: {
  title: string;
  /** Optional section number, e.g. "02". */
  index?: string;
  /** Right-aligned journal label, e.g. "recent writing". */
  kicker?: string;
  as?: "h1" | "h2";
  class?: ClassValue;
} = $props();
</script>

<header class={["mb-8 flex items-baseline gap-4", className]}>
  {#if index}
    <span class="font-mono text-step--1 text-journal-2">{index}</span>
  {/if}
  <svelte:element this={as} class="font-serif text-step-2 font-semibold tracking-tight text-ink">
    {title}
  </svelte:element>
  <span class="h-px flex-1 -translate-y-1 bg-journal-3"></span>
  {#if kicker}
    <span class="label-mono text-journal-2">{kicker}</span>
  {/if}
</header>
