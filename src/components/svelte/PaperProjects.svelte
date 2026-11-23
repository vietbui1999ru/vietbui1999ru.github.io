<script lang="ts">
import Modal from "../primitives/Modal.svelte";
import InkLink from "../primitives/InkLink.svelte";
import Section from "../primitives/Section.svelte";
import SectionHeader from "../primitives/SectionHeader.svelte";
import ProjectCard from "../patterns/ProjectCard.svelte";
import ProjectDetail from "../patterns/ProjectDetail.svelte";
import ProjectSortControl from "../patterns/ProjectSortControl.svelte";
import { sortProjects, type ProjectSortKey } from "../../lib/project-sort";
import type { ProjectCardData } from "../../data/projectData";

let {
  projects,
  standalone = false,
}: {
  projects: ProjectCardData[];
  /** On /projects the page owns the h1, so skip the section header and self-link. */
  standalone?: boolean;
} = $props();
let selected = $state<ProjectCardData | null>(null);
let sortKey = $state<ProjectSortKey>("featured");
const sorted = $derived(sortProjects(projects, sortKey));
</script>

<Section id="projects" class={standalone ? "pt-0" : undefined}>
  {#if !standalone}
    <SectionHeader index="04" title="projects" kicker="selected work" />
  {:else}
    <div class="mb-6 flex justify-end">
      <ProjectSortControl value={sortKey} onChange={(key) => (sortKey = key)} />
    </div>
  {/if}

  <div data-ink-obstacle="cards" class="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
    {#each sorted as project (project.slug)}
      <ProjectCard project={project} onPreview={() => (selected = project)} />
    {/each}
  </div>

  {#if !standalone}
    <div class="mt-8 flex justify-end">
      <InkLink href="/projects" arrow="forward">all projects</InkLink>
    </div>
  {/if}

  {#if selected}
    <Modal open={true} title={selected.title} onClose={() => (selected = null)}>
      <ProjectDetail project={selected} />
    </Modal>
  {/if}
</Section>
