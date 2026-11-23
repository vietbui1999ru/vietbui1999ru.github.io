<script lang="ts">
import Section from "../primitives/Section.svelte";
import SectionHeader from "../primitives/SectionHeader.svelte";
import Chip from "../primitives/Chip.svelte";

// Focus text is plain prose from the note body; Markdown formatting is not applied here.
type FocusArea = { id: string; title: string; text: string; tools: string[] };

// Areas come from Site/Focus/*.md, already sorted by `order` by the page.
let { areas = [] }: { areas?: FocusArea[] } = $props();
</script>

<Section id="focus" data-block="focus">
  <SectionHeader title="focus" />

  <div class="mt-8 grid gap-6 md:grid-cols-2">
    {#each areas as area (area.id)}
      <article class="border-[1.5px] border-ink bg-paper-raised p-5 shadow-hard-sm">
        <h3 class="font-serif text-step-1 font-semibold text-ink">{area.title}</h3>
        <p class="mt-3 whitespace-pre-line text-step-0 leading-relaxed text-journal-1">{area.text}</p>
        <ul class="mt-4 flex flex-wrap gap-2">
          {#each area.tools.slice(0, 4) as tool (tool)}
            <li><Chip tone="muted">{tool}</Chip></li>
          {/each}
        </ul>
      </article>
    {/each}
  </div>
</Section>
