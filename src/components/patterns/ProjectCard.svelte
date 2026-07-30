<script lang="ts">
import type { ProjectCardData } from "../../data/projectData";
import type { CollectionDensity } from "../../design-system/types";

type CardHeight = "auto" | "compact" | "fixed";

type ProjectCardProps = {
  project: ProjectCardData;
  index?: number;
  density?: CollectionDensity;
  cardHeight?: CardHeight;
  showImage?: boolean;
  showSummary?: boolean;
  showTags?: boolean;
  showStatus?: boolean;
  showLinks?: boolean;
  onPreview?: () => void;
};

let {
  project,
  index = 0,
  density = "comfortable",
  cardHeight = "auto",
  showImage = true,
  showSummary = true,
  showTags = true,
  showStatus = true,
  showLinks = true,
  onPreview,
}: ProjectCardProps = $props();

const PASTELS = [
  "bg-pastel-sage",
  "bg-pastel-dust",
  "bg-pastel-rose",
  "bg-pastel-butter",
];

const STATUS_PASTEL: Record<ProjectCardData["status"], string> = {
  active: "bg-pastel-sage",
  shipped: "bg-pastel-dust",
  archived: "bg-journal-4",
};

const DENSITY_CLASSES: Record<CollectionDensity, string> = {
  comfortable: "gap-3 p-5",
  compact: "gap-2 p-4",
  minimal: "gap-1.5 p-3",
};

const HEIGHT_CLASSES: Record<CardHeight, string> = {
  auto: "",
  compact: "max-h-80 overflow-hidden",
  fixed: "h-96 overflow-hidden",
};

function imageUrl(image: string, slug: string): string {
  if (image.startsWith("http://") || image.startsWith("https://")) return image;
  return `/assets/projects/${slug}/${image}`;
}

function year(d: Date | string): string {
  return String((d instanceof Date ? d : new Date(d)).getFullYear());
}

function linkLabel(icon: string): string {
  return icon.toLowerCase().replace(/[-_]/g, " ");
}
</script>

<article
  class="relative gleam lift flex flex-col border-[1.5px] border-ink bg-paper-raised shadow-hard {HEIGHT_CLASSES[cardHeight]}"
>
  {#if onPreview}
    <button
      type="button"
      aria-label={`Quick view ${project.title}`}
      onclick={onPreview}
      class="absolute inset-0 z-0 cursor-pointer"
    ></button>
  {/if}

  <div class="pointer-events-none relative z-10 h-1 shrink-0 border-b-[1.5px] border-ink {PASTELS[index % PASTELS.length]}"></div>

  <div
    class="pointer-events-none relative z-10 flex shrink-0 items-baseline justify-between border-b-[1.5px] border-ink bg-journal-4 px-4 py-2 font-mono text-step--1 uppercase tracking-wider text-journal-1"
  >
    <span>{project.featured ? "featured" : "project"}</span>
    <span>{year(project.date)}</span>
  </div>

  {#if showImage && project.cover}
    <img
      src={imageUrl(project.cover, project.slug)}
      alt={project.title}
      loading="lazy"
      class="pointer-events-none relative z-10 aspect-video w-full shrink-0 border-b-[1.5px] border-ink object-cover"
    />
  {/if}

  <div class="pointer-events-none relative z-10 flex min-h-0 flex-1 flex-col {DENSITY_CLASSES[density]}">
    <h3 class="font-serif text-step-1 font-semibold text-ink">
      <a href="/projects/{project.slug}" class="u-draw relative z-10 text-ink no-underline pointer-events-auto">{project.title}</a>
    </h3>

    {#if showSummary}
      <p class="text-step--1 leading-relaxed text-journal-1">{project.summary}</p>
    {/if}

    {#if showTags && project.badges && project.badges.length > 0}
      <span class="flex flex-wrap gap-1.5">
        {#each project.badges as badge (badge)}
          <span class="border border-ink px-2 py-0.5 font-mono text-[0.68rem] tracking-wide text-ink">
            {badge}
          </span>
        {/each}
      </span>
    {/if}

    {#if showStatus || (showLinks && project.links && project.links.length > 0)}
      <div class="mt-auto flex items-center justify-between border-t border-journal-3 pt-3">
        {#if showStatus}
          <span
            class="border border-ink px-2 py-0.5 font-mono text-[0.68rem] uppercase tracking-wider text-ink {STATUS_PASTEL[project.status]}"
          >
            {project.status}
          </span>
        {:else}
          <span></span>
        {/if}

        <span class="flex items-center gap-4">
          {#if onPreview}
            <button type="button" onclick={onPreview} class="u-draw relative z-10 font-mono text-step--1 uppercase tracking-wider text-ink pointer-events-auto">quick view</button>
          {/if}
        {#if showLinks && project.links && project.links.length > 0}
          <span class="flex gap-4">
            {#each project.links as link (link.url)}
              <a
                href={link.url}
                class="u-draw relative z-10 font-mono text-step--1 uppercase tracking-wider text-ink no-underline pointer-events-auto"
              >
                {linkLabel(link.icon)} ↗
              </a>
            {/each}
          </span>
        {/if}
        </span>
      </div>
    {/if}
  </div>
</article>
