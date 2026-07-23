<script lang="ts">
import type { ProjectMedia } from "../../data/projectData";

let { media }: { media: ProjectMedia[] } = $props();

function embedUrl(
  item: Extract<ProjectMedia, { kind: "youtube" | "vimeo" }>,
): string {
  return item.kind === "youtube"
    ? `https://www.youtube-nocookie.com/embed/${item.id}`
    : `https://player.vimeo.com/video/${item.id}`;
}
</script>

{#if media.length > 0}
  <section class="mt-10 grid gap-6 sm:grid-cols-2" aria-label="Project media">
    {#each media as item (item.kind === "image" || item.kind === "video" ? item.src : `${item.kind}-${item.id}`)}
      <figure class="overflow-hidden border-[1.5px] border-ink bg-paper-raised">
        {#if item.kind === "image"}
          <img src={item.src} alt={item.alt} loading="lazy" class="max-h-[32rem] w-full object-contain" />
        {:else if item.kind === "video"}
          <video controls preload="metadata" class="max-h-[32rem] w-full" aria-label={item.title}>
            <source src={item.src} />
            Your browser does not support embedded video.
          </video>
        {:else}
          <iframe
            src={embedUrl(item)}
            title={item.title}
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen
            class="aspect-video w-full"
          ></iframe>
        {/if}
        {#if item.caption}
          <figcaption class="border-t border-journal-3 px-3 py-2 font-mono text-[0.68rem] text-journal-1">{item.caption}</figcaption>
        {/if}
      </figure>
    {/each}
  </section>
{/if}
