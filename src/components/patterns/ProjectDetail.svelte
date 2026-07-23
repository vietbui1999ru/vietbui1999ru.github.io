<script lang="ts">
import ProjectMedia from "./ProjectMedia.svelte";
import type { ProjectCardData } from "../../data/projectData";

let { project }: { project: ProjectCardData } = $props();

function plainText(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
</script>

<div>
  <p class="mb-5 font-mono text-step--1 uppercase tracking-wider text-journal-1">{project.status} · {new Date(project.date).getFullYear()}</p>
  <p class="max-w-3xl text-step-0 leading-relaxed text-journal-1">
    {project.bodyHtml ? plainText(project.bodyHtml) : project.summary}
  </p>
  <ProjectMedia media={project.media ?? []} />
  {#if project.links?.length}
    <div class="mt-8 flex flex-wrap gap-4 border-t border-journal-3 pt-4">
      {#each project.links as link (link.url)}
        <a href={link.url} target="_blank" rel="noopener noreferrer" class="u-draw font-mono text-step--1 uppercase tracking-wider text-ink no-underline">{link.icon} ↗</a>
      {/each}
    </div>
  {/if}
</div>
