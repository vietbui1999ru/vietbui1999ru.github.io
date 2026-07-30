<script lang="ts">
import Modal from "../primitives/Modal.svelte";
import ProjectCard from "../patterns/ProjectCard.svelte";
import ProjectDetail from "../patterns/ProjectDetail.svelte";
import type { ProjectCardData } from "../../data/projectData";

let { projects }: { projects: ProjectCardData[] } = $props();
let selected = $state<ProjectCardData | null>(null);
</script>

<section id="projects" class="relative w-full py-16 md:py-20">
  <div data-section-id="projects" aria-hidden="true" class="pointer-events-none absolute inset-0"></div>

  <div class="relative z-10 mx-auto w-full max-w-[var(--content-max)] px-4 sm:px-6">
    <header class="mb-8 flex items-baseline gap-4">
      <span class="font-mono text-step--1 text-journal-2">04</span>
      <h2 class="font-serif text-step-2 font-semibold tracking-tight text-ink">projects</h2>
      <span class="h-px flex-1 -translate-y-1 bg-journal-3"></span>
      <span class="font-mono text-step--1 uppercase tracking-wider text-journal-2">selected work</span>
    </header>

    <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
      {#each projects as project, p (project.slug)}
        <ProjectCard project={project} index={p} onPreview={() => (selected = project)} />
      {/each}
    </div>

    <div class="mt-8 flex justify-end">
      <a href="/projects" class="u-draw font-mono text-step--1 uppercase tracking-wider text-ink no-underline">all projects →</a>
    </div>
  </div>

  {#if selected}
    <Modal open={true} title={selected.title} onClose={() => (selected = null)}>
      <ProjectDetail project={selected} />
    </Modal>
  {/if}
</section>
