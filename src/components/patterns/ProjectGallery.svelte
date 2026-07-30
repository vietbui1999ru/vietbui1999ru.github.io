<script lang="ts">
import type { ProjectMedia } from "../../data/projectData";
import ChevronLeftIcon from "../primitives/ChevronLeftIcon.svelte";
import ChevronRightIcon from "../primitives/ChevronRightIcon.svelte";

let { media }: { media: ProjectMedia[] } = $props();

let activeIndex = $state(0);

const hasPrev = $derived(activeIndex > 0);
const hasNext = $derived(activeIndex < media.length - 1);
const active = $derived(media[activeIndex]);

function goPrev(): void {
  if (hasPrev) activeIndex -= 1;
}

function goNext(): void {
  if (hasNext) activeIndex += 1;
}

function handleKeydown(event: KeyboardEvent): void {
  if (media.length <= 1) return;
  if (event.key === "ArrowLeft") goPrev();
  else if (event.key === "ArrowRight") goNext();
}

function embedUrl(
  item: Extract<ProjectMedia, { kind: "youtube" | "vimeo" }>,
): string {
  return item.kind === "youtube"
    ? `https://www.youtube-nocookie.com/embed/${item.id}`
    : `https://player.vimeo.com/video/${item.id}`;
}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if media.length > 0}
  <section class="mt-10" aria-label="Project media">
    <figure class="overflow-hidden border-[1.5px] border-ink bg-paper-raised">
      <div class="relative">
        {#if active.kind === "image"}
          <img
            src={active.src}
            alt={active.alt}
            loading="lazy"
            class="max-h-[32rem] w-full object-contain"
          />
        {:else if active.kind === "video"}
          <video
            controls
            preload="metadata"
            class="max-h-[32rem] w-full"
            aria-label={active.title}
          >
            <source src={active.src} />
            Your browser does not support embedded video.
          </video>
        {:else}
          <iframe
            src={embedUrl(active)}
            title={active.title}
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen
            class="aspect-video w-full"
          ></iframe>
        {/if}

        {#if media.length > 1}
          <button
            type="button"
            onclick={goPrev}
            disabled={!hasPrev}
            aria-label="Previous image"
            class="absolute left-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center border-[1.5px] border-ink bg-paper-raised/90 text-ink disabled:pointer-events-none disabled:opacity-25"
          ><ChevronLeftIcon /></button>
          <button
            type="button"
            onclick={goNext}
            disabled={!hasNext}
            aria-label="Next image"
            class="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center border-[1.5px] border-ink bg-paper-raised/90 text-ink disabled:pointer-events-none disabled:opacity-25"
          ><ChevronRightIcon /></button>
          <p
            class="absolute bottom-2 right-2 border-[1.5px] border-ink bg-paper-raised/90 px-2 py-0.5 font-mono text-[0.65rem] text-journal-1"
            aria-live="polite"
          >{activeIndex + 1} / {media.length}</p>
        {/if}
      </div>
      {#if active.caption}
        <figcaption class="border-t border-journal-3 px-3 py-2 font-mono text-[0.68rem] text-journal-1">{active.caption}</figcaption>
      {/if}
    </figure>
  </section>
{/if}
