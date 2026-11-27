<script lang="ts">
import TimelineRail from "../patterns/TimelineRail.svelte";
import { toneFor } from "../../design-system/tone";

// /ui-lab fixture: the rail with four checkpoints. Motion values live in src/lib/rail-motion.ts.
const items = ["checkpoint one", "checkpoint two", "checkpoint three", "checkpoint four"];
</script>

<section class="page-container py-section">
  <TimelineRail {items} key={(item) => item} tone={toneFor} class="max-w-xl">
    {#snippet entry(item)}
      <p class="font-mono text-step--1 text-ink">{item}</p>
      <p class="mt-2 h-24 text-step--1 text-journal-2">fixture entry</p>
    {/snippet}
  </TimelineRail>
</section>
