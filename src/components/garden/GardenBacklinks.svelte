<script lang="ts">
import Section from "../primitives/Section.svelte";
import SectionHeader from "../primitives/SectionHeader.svelte";
import type { Backlink } from "../../lib/garden-backlinks";

// `backlinks` is the published pages that link to this one, computed at build.
// An empty list renders nothing, so the block is hidden on pages nothing links to.
let { backlinks = [] }: { backlinks?: Backlink[] } = $props();
</script>

{#if backlinks.length > 0}
  <Section id="backlinks" data-block="backlinks">
    <SectionHeader title="linked from" />

    <ul class="mt-8 divide-y divide-journal-3 border-y border-journal-3">
      {#each backlinks as link (link.url)}
        <li class="py-3">
          <a href={link.url} class="font-serif text-step-0 text-ink underline decoration-journal-2 underline-offset-4">
            {link.title}
          </a>
        </li>
      {/each}
    </ul>
  </Section>
{/if}
