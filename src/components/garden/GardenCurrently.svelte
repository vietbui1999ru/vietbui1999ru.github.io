<script lang="ts">
import Section from "../primitives/Section.svelte";
import SectionHeader from "../primitives/SectionHeader.svelte";
import Chip from "../primitives/Chip.svelte";
import type { CurrentlyItem } from "../../lib/library-view";

// `currently` holds active library items across types, built at build time.
// The block renders only when Site/Home.md lists it, and hides itself when empty.
let { currently = [] }: { currently?: CurrentlyItem[] } = $props();
</script>

{#if currently.length > 0}
  <Section id="currently" data-block="currently">
    <SectionHeader title="currently" />

    <ul class="mt-8 divide-y divide-journal-3 border-y border-journal-3">
      {#each currently as item (item.href)}
        <li class="flex flex-wrap items-baseline gap-x-4 gap-y-1 py-3">
          <Chip tone="muted" size="sm">{item.statusLabel}</Chip>
          <a href={item.href} class="font-serif text-step-0 text-ink underline decoration-journal-2 underline-offset-4">
            {item.title}
          </a>
          {#if item.progress !== undefined}
            <span class="font-mono text-[0.68rem] text-journal-2">{item.progress}%</span>
          {/if}
        </li>
      {/each}
    </ul>
  </Section>
{/if}
