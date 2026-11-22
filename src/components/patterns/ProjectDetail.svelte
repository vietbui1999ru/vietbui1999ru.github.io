<script lang="ts">
import ProjectGallery from "./ProjectGallery.svelte";
import type { ProjectCardData } from "../../data/projectData";
import InkLink from "../primitives/InkLink.svelte";

let { project }: { project: ProjectCardData } = $props();

function plainText(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
</script>

<div>
  <p class="label-mono mb-5 text-journal-1">{project.status} · {new Date(project.date).getFullYear()}</p>
  <p class="max-w-3xl text-step-0 leading-relaxed text-journal-1">
    {project.bodyHtml ? plainText(project.bodyHtml) : project.summary}
  </p>
  <ProjectGallery media={project.media ?? []} />
  {#if project.links?.length}
    <div class="mt-8 flex flex-wrap gap-4 border-t border-journal-3 pt-4">
      {#each project.links as link (link.url)}
        <InkLink href={link.url} external>{link.icon}</InkLink>
      {/each}
    </div>
  {/if}
</div>
