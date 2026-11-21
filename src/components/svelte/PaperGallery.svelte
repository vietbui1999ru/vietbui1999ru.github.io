<script lang="ts">
import type { GalleryItem } from "../../data/galleryData";
import Chip from "../primitives/Chip.svelte";
import Section from "../primitives/Section.svelte";
import { PASTEL_BG, toneFor } from "../../design-system/tone";

let { items }: { items: GalleryItem[] } = $props();

const visibleItems = $derived(items.filter((item) => item.image));
</script>

<Section id="gallery" class="pt-0">

    {#if visibleItems.length > 0}
      <div data-ink-obstacle="media" class="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {#each visibleItems as item (item.id)}
          <figure data-ink-obstacle="media" class="gleam lift border-[1.5px] border-ink bg-paper-raised shadow-hard-sm">
            <div class="h-1 border-b-[1.5px] border-ink {PASTEL_BG[toneFor(item.tags?.[0] ?? item.title)]}"></div>
            <a
              href={item.href ?? item.image}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open {item.title}"
              class="block overflow-hidden border-b-[1.5px] border-ink"
            >
              <img
                src={item.image}
                alt={item.title}
                loading="lazy"
                class="aspect-[4/3] w-full object-cover transition-transform duration-500 hover:scale-[1.02]"
              />
            </a>

            <figcaption class="space-y-3 p-4">
              <div class="flex items-baseline justify-between gap-4">
                <h3 class="font-serif text-step-1 font-semibold text-ink">{item.title}</h3>
                <span class="font-mono text-step--1 text-journal-2">↗</span>
              </div>

              {#if item.description}
                <p class="text-step--1 leading-relaxed text-journal-1">{item.description}</p>
              {/if}

              {#if item.tags && item.tags.length > 0}
                <div class="flex flex-wrap gap-1.5">
                  {#each item.tags as tag (tag)}
                    <Chip>{tag}</Chip>
                  {/each}
                </div>
              {/if}
            </figcaption>
          </figure>
        {/each}
      </div>
    {:else}
      <p class="border-y border-dashed border-journal-2 py-16 text-center font-mono text-step--1 uppercase tracking-wider text-journal-1">
        No visual field notes yet.
      </p>
    {/if}
</Section>
