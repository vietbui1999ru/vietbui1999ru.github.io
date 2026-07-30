<script lang="ts">
import { onMount } from "svelte";

type IconTheme = "paper-glyph" | "lucide-like" | "font-awesome";

let theme = $state<IconTheme>("lucide-like");
let size = $state(28);
let strokeWidth = $state(1.75);
let gap = $state(8);
let ready = $state(false);

onMount(async () => {
  // Keep the playground ready for an async icon registry or remote theme later.
  await Promise.resolve();
  ready = true;
});
</script>

<section class="border-[1.5px] border-ink bg-paper-raised p-4 shadow-hard sm:p-6" aria-labelledby="icon-playground-heading">
  <div class="mb-5 flex flex-wrap items-baseline justify-between gap-3 border-b border-journal-3 pb-3">
    <div>
      <p class="mb-1 font-mono text-[0.68rem] uppercase tracking-wider text-journal-2">reactive icon experiment</p>
      <h2 id="icon-playground-heading" class="font-serif text-step-1 font-semibold text-ink">icon styling</h2>
    </div>
    <span class="font-mono text-[0.68rem] uppercase tracking-wider text-journal-2">{ready ? "ready" : "loading"}</span>
  </div>

  <div class="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(14rem,18rem)] md:items-center">
    <div class="flex min-h-28 items-center justify-center border border-dashed border-journal-2 bg-paper p-6" style={`gap: ${gap}px`}>
      {#if theme === "font-awesome"}
        <i class="fa-thin fa-arrow-right-long text-ink" style={`font-size: ${size}px`} aria-hidden="true"></i>
      {:else if theme === "paper-glyph"}
        <span class="font-serif text-ink" style={`font-size: ${size}px`} aria-hidden="true">→</span>
      {:else}
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width={strokeWidth} stroke-linecap="round" stroke-linejoin="round" class="text-ink" aria-hidden="true">
          <path d="M5 12h14"></path>
          <path d="m12 5 7 7-7 7"></path>
        </svg>
      {/if}
      <span class="font-mono text-step--1 uppercase tracking-wider text-ink">sample action</span>
    </div>

    <div class="grid gap-3">
      <label class="font-mono text-xs text-ink">theme<select bind:value={theme} class="mt-1 w-full border border-ink bg-paper px-2 py-1.5"><option value="paper-glyph">paper glyph</option><option value="lucide-like">lucide-like SVG</option><option value="font-awesome">Font Awesome class</option></select></label>
      <label class="font-mono text-xs text-ink">size: {size}px<input bind:value={size} type="range" min="12" max="64" step="1" class="mt-1 w-full" /></label>
      <label class="font-mono text-xs text-ink">stroke: {strokeWidth}<input bind:value={strokeWidth} type="range" min="0.75" max="4" step="0.25" class="mt-1 w-full" /></label>
      <label class="font-mono text-xs text-ink">gap: {gap}px<input bind:value={gap} type="range" min="0" max="32" step="1" class="mt-1 w-full" /></label>
    </div>
  </div>

  {#if theme === "font-awesome"}
    <p class="mt-4 border-l-2 border-pastel-butter pl-3 text-xs leading-relaxed text-journal-1">
      This preview uses the requested <code>fa-thin fa-arrow-right-long</code> contract. Load the matching Font Awesome theme in the host page before promoting it.
    </p>
  {/if}
</section>
