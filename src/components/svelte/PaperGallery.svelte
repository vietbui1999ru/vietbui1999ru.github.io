<script lang="ts">
import type { GalleryItem } from "../../data/galleryData";

let { items }: { items: GalleryItem[] } = $props();

const visibleItems = $derived(items.filter((item) => item.image));
const PASTELS = [
  "bg-pastel-sage",
  "bg-pastel-dust",
  "bg-pastel-rose",
  "bg-pastel-butter",
];
</script>

<section id="gallery" class="relative w-full py-24">
  <div data-section-id="gallery" aria-hidden="true" class="pointer-events-none absolute inset-0"></div>

  <div class="relative z-10 mx-auto w-full max-w-[var(--content-max)] px-4 sm:px-6">
    <header class="mb-12 flex items-baseline gap-4">
      <span class="font-mono text-step--1 text-journal-2">05</span>
      <h2 class="font-serif text-step-2 font-semibold tracking-tight text-ink">gallery</h2>
      <span class="h-px flex-1 -translate-y-1 bg-journal-3"></span>
      <span class="font-mono text-step--1 uppercase tracking-wider text-journal-2"
        >visual field notes</span
      >
    </header>

    {#if visibleItems.length > 0}
      <div class="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {#each visibleItems as item, i (item.id)}
          <figure class="gleam lift border-[1.5px] border-ink bg-paper-raised shadow-hard-sm">
            <div class="h-1 border-b-[1.5px] border-ink {PASTELS[i % PASTELS.length]}"></div>
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
                    <span class="border border-ink px-2 py-0.5 font-mono text-[0.68rem] tracking-wide text-ink"
                      >{tag}</span
                    >
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
  </div>
</section>
