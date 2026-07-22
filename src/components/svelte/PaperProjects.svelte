<script lang="ts">
import type { ProjectCardData } from "../../data/projectData";

let { projects }: { projects: ProjectCardData[] } = $props();

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

function imageUrl(image: string, slug: string): string {
  if (image.startsWith("http://") || image.startsWith("https://")) return image;
  return `/assets/projects/${slug}/${image}`;
}

function year(d: Date | string): string {
  return String((d instanceof Date ? d : new Date(d)).getFullYear());
}

function linkLabel(icon: string): string {
  // icon names come from the vault frontmatter (e.g. "github", "globe")
  return icon.toLowerCase().replace(/[-_]/g, " ");
}
</script>

<section id="projects" class="relative w-full py-24">
  <div data-section-id="projects" aria-hidden="true" class="pointer-events-none absolute inset-0"></div>

  <div class="relative z-10 mx-auto w-full max-w-[var(--content-max)] px-4 sm:px-6">
    <header class="mb-12 flex items-baseline gap-4">
      <span class="font-mono text-step--1 text-journal-2">04</span>
      <h2 class="font-serif text-step-2 font-semibold tracking-tight text-ink">projects</h2>
      <span class="h-px flex-1 -translate-y-1 bg-journal-3"></span>
      <span class="font-mono text-step--1 uppercase tracking-wider text-journal-2"
        >selected work</span
      >
    </header>

    <div class="grid grid-cols-1 gap-8 sm:grid-cols-2 xl:grid-cols-3">
      {#each projects as project, p (project.slug)}
        <article
          class="gleam lift flex flex-col border-[1.5px] border-ink bg-paper-raised shadow-hard"
        >
          <div class="h-1 border-b-[1.5px] border-ink {PASTELS[p % PASTELS.length]}"></div>

          <div
            class="flex items-baseline justify-between border-b-[1.5px] border-ink bg-journal-4 px-4 py-2 font-mono text-step--1 uppercase tracking-wider text-journal-1"
          >
            <span>{project.featured ? "featured" : "project"}</span>
            <span>{year(project.date)}</span>
          </div>

          {#if project.cover}
            <img
              src={imageUrl(project.cover, project.slug)}
              alt={project.title}
              loading="lazy"
              class="aspect-video w-full border-b-[1.5px] border-ink object-cover"
            />
          {/if}

          <div class="flex flex-1 flex-col gap-3 p-5">
            <h3 class="font-serif text-step-1 font-semibold text-ink">{project.title}</h3>
            <p class="text-step--1 leading-relaxed text-journal-1">{project.summary}</p>

            {#if project.badges && project.badges.length > 0}
              <span class="flex flex-wrap gap-1.5">
                {#each project.badges as badge (badge)}
                  <span class="border border-ink px-2 py-0.5 font-mono text-[0.68rem] tracking-wide text-ink">
                    {badge}
                  </span>
                {/each}
              </span>
            {/if}

            <div class="mt-auto flex items-center justify-between border-t border-journal-3 pt-3">
              <span
                class="border border-ink px-2 py-0.5 font-mono text-[0.68rem] uppercase tracking-wider text-ink {STATUS_PASTEL[project.status]}"
              >
                {project.status}
              </span>
              <span class="flex gap-4">
                {#each project.links ?? [] as link (link.url)}
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="u-draw font-mono text-step--1 uppercase tracking-wider text-ink no-underline"
                  >
                    {linkLabel(link.icon)} ↗
                  </a>
                {/each}
              </span>
            </div>
          </div>
        </article>
      {/each}
    </div>
  </div>
</section>
