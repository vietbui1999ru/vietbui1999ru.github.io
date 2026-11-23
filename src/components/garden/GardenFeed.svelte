<script lang="ts">
import Section from "../primitives/Section.svelte";
import SectionHeader from "../primitives/SectionHeader.svelte";
import Chip from "../primitives/Chip.svelte";
import type { FeedItem } from "../../lib/garden-feed";

// `items` holds every published post and thought, newest first. The block's
// `limit` prop caps how many show here.
let { items = [], limit = 8 }: { items?: FeedItem[]; limit?: number } = $props();
const shown = $derived(items.slice(0, limit));

const dateFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });
</script>

<Section id="feed" data-block="feed">
  <SectionHeader title="recently tended" />

  <ol class="mt-8 divide-y divide-journal-3 border-y border-journal-3">
    {#each shown as item (item.href)}
      <li class="flex flex-wrap items-baseline gap-x-4 gap-y-1 py-3">
        <time class="font-mono text-[0.68rem] text-journal-2">{dateFormat.format(item.date)}</time>
        <Chip tone="muted" size="sm">{item.kind}</Chip>
        <a href={item.href} class="font-serif text-step-0 text-ink underline decoration-journal-2 underline-offset-4">
          {item.title ?? "thought"}
        </a>
      </li>
    {/each}
  </ol>
</Section>
