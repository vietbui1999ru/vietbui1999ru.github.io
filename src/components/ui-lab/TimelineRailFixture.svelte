<script lang="ts">
import TimelineRail from "../patterns/TimelineRail.svelte";
import { toneFor } from "../../design-system/tone";

// /ui-lab fixture: the rail with live controls for its breath variables.
const items = ["checkpoint one", "checkpoint two", "checkpoint three", "checkpoint four"];
let scale = $state(1.25);
let duration = $state(2.4);
</script>

<section class="page-container py-section" style="--rail-breath-scale: {scale}; --rail-breath-duration: {duration}s">
  <div class="mb-6 flex flex-wrap gap-6 font-mono text-[0.68rem] text-journal-1">
    <label class="flex items-center gap-2">
      --rail-breath-scale
      <input type="range" min="1" max="2" step="0.05" bind:value={scale} />
      <output>{scale}</output>
    </label>
    <label class="flex items-center gap-2">
      --rail-breath-duration
      <input type="range" min="0.5" max="6" step="0.1" bind:value={duration} />
      <output>{duration}s</output>
    </label>
  </div>

  <TimelineRail {items} key={(item) => item} tone={toneFor} class="max-w-xl">
    {#snippet entry(item)}
      <p class="font-mono text-step--1 text-ink">{item}</p>
      <p class="mt-2 h-24 text-step--1 text-journal-2">fixture entry</p>
    {/snippet}
  </TimelineRail>
</section>
