<script lang="ts">
import { EDUCATION_ITEMS } from "../../data/educationData";
import Chip from "../primitives/Chip.svelte";
import InkLink from "../primitives/InkLink.svelte";
import Section from "../primitives/Section.svelte";
import SectionHeader from "../primitives/SectionHeader.svelte";
import { toneFor } from "../../design-system/tone";
import TimelineRail from "../patterns/TimelineRail.svelte";
</script>

<Section id="education">
    <SectionHeader index="07" title="education" kicker="academic record" />

    <TimelineRail items={EDUCATION_ITEMS} key={(item) => item.title} tone={(item) => toneFor(item.school.name)} class="max-w-5xl">
      {#snippet entry(item)}

          <time class="label-mono text-journal-2">{item.date}</time>
          <h3 class="mt-2 font-serif text-step-1 font-semibold text-ink">{item.title}</h3>
          <InkLink href={item.school.url} tone="muted" class="mt-1 inline-block">{item.school.name}</InkLink>

          {#if item.columns && item.columns.length > 0}
            <div class="mt-5 grid gap-x-8 gap-y-2 sm:grid-cols-2">
              {#each item.columns as column, columnIndex (`${item.title}-${columnIndex}`)}
                <ul class="space-y-1.5">
                  {#each column as course (course)}
                    <li class="flex gap-2 text-step--1 leading-relaxed text-journal-1">
                      <span class="font-mono text-journal-2">—</span>
                      <span>{course}</span>
                    </li>
                  {/each}
                </ul>
              {/each}
            </div>
          {:else if item.content}
            <p class="mt-4 max-w-3xl whitespace-pre-line text-step--1 leading-relaxed text-journal-1">
              {item.content}
            </p>
          {/if}

          <div class="mt-4 flex flex-wrap items-center gap-4">
            {#if item.GPA}
              <Chip tone="butter" caps>GPA {item.GPA}</Chip>
            {/if}
            {#if item.featuredLink?.enable && item.featuredLink.url}
              <InkLink href={item.featuredLink.url}>{item.featuredLink.name ?? "view program"}</InkLink>
            {/if}
          </div>
      {/snippet}
    </TimelineRail>
</Section>
