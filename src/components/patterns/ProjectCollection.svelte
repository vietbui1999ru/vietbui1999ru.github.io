<script lang="ts">
import ProjectCard from "./ProjectCard.svelte";
import type { ProjectCardData } from "../../data/projectData";
import { filterAndSortCollection } from "../../lib/collection-controls";
import type { CollectionExperimentState } from "../../design-system/types";

let {
  projects,
  experiment,
  onMove,
}: {
  projects: ProjectCardData[];
  experiment: CollectionExperimentState;
  onMove: (id: string, direction: "up" | "down") => void;
} = $props();

let filtered = $derived(filterAndSortCollection(projects, experiment));
let page = $state(1);
let showAll = $state(false);
let maxPage = $derived(
  Math.max(1, Math.ceil(filtered.length / experiment.pageSize)),
);
let visible = $derived.by(() => {
  if (
    showAll ||
    experiment.overflow === "visible" ||
    experiment.overflow === "scroll"
  )
    return filtered;
  if (experiment.view === "showcase" && experiment.overflow === "fade") {
    return filtered.slice(0, experiment.columns * 2);
  }
  const start = (page - 1) * experiment.pageSize;
  return filtered.slice(start, start + experiment.pageSize);
});

const GAP_VALUES = { sm: "0.5rem", md: "1rem", lg: "1.5rem" };
const WIDTH_CLASSES = {
  narrow: "max-w-3xl",
  standard: "max-w-5xl",
  wide: "max-w-7xl",
  fluid: "max-w-none",
};
const DENSITY_GAP = {
  comfortable: "gap-6",
  compact: "gap-3",
  minimal: "gap-1",
};
const ALIGNMENT_CLASSES = {
  start: "items-start",
  center: "items-center",
  end: "items-end",
  stretch: "items-stretch",
};

function idFor(project: ProjectCardData): string {
  return project.slug;
}

function date(project: ProjectCardData): string {
  return new Date(project.date).getFullYear().toString();
}

function moveButton(
  project: ProjectCardData,
  direction: "up" | "down",
): string {
  return `Move ${project.title} ${direction}`;
}
</script>

<div class="{WIDTH_CLASSES[experiment.width]} w-full" style={`--lab-gap: ${GAP_VALUES[experiment.gap]}`}>
  {#if visible.length === 0}
    <p class="border border-dashed border-ink p-8 text-center font-mono text-step--1 text-journal-1">No records match this experiment.</p>
  {:else if experiment.view === "table"}
    <div class="overflow-x-auto border-[1.5px] border-ink">
      <table class="w-full min-w-[42rem] border-collapse text-left">
        <caption class="sr-only">Project collection table preview</caption>
        <thead class="bg-journal-4 font-mono text-[0.68rem] uppercase tracking-wider text-journal-1">
          <tr>
            <th scope="col" class="border-b border-ink px-3 py-2">project</th>
            <th scope="col" class="border-b border-ink px-3 py-2">status</th>
            <th scope="col" class="border-b border-ink px-3 py-2">tags</th>
            <th scope="col" class="border-b border-ink px-3 py-2">year</th>
            <th scope="col" class="border-b border-ink px-3 py-2"><span class="sr-only">reorder</span></th>
          </tr>
        </thead>
        <tbody>
          {#each visible as project (project.slug)}
            <tr class="border-b border-journal-3 align-top last:border-b-0 hover:bg-journal-4">
              <th scope="row" class="px-3 py-3 font-serif text-step--1 font-semibold text-ink">
                {project.title}
                {#if experiment.showSummary}<p class="mt-1 font-sans text-xs font-normal leading-relaxed text-journal-1">{project.summary}</p>{/if}
              </th>
              <td class="px-3 py-3 font-mono text-xs uppercase text-ink">{project.status}</td>
              <td class="px-3 py-3 font-mono text-xs text-journal-1">{#if experiment.showTags}{project.badges?.join(" · ") || "—"}{:else}—{/if}</td>
              <td class="px-3 py-3 font-mono text-xs text-journal-1">{date(project)}</td>
              <td class="px-3 py-3"><div class="flex gap-1"><button type="button" aria-label={moveButton(project, "up")} onclick={() => onMove(idFor(project), "up")} class="border border-ink px-1.5 text-xs">↑</button><button type="button" aria-label={moveButton(project, "down")} onclick={() => onMove(idFor(project), "down")} class="border border-ink px-1.5 text-xs">↓</button></div></td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {:else if experiment.view === "rows" || experiment.view === "compact"}
    <div class="divide-y divide-journal-3 border-y border-journal-3">
      {#each visible as project (project.slug)}
        <div class="flex flex-wrap items-center justify-between gap-3 py-3 {experiment.view === "compact" ? "text-sm" : ""}">
          <div class="min-w-0 flex-1"><h3 class="font-serif font-semibold text-ink"><a href="/projects/{project.slug}" class="u-draw text-ink no-underline">{project.title}</a></h3>{#if experiment.showSummary && experiment.view === "rows"}<p class="mt-1 text-sm leading-relaxed text-journal-1">{project.summary}</p>{/if}</div>
          <div class="flex shrink-0 items-center gap-3 font-mono text-xs uppercase text-journal-1">{#if experiment.showStatus}<span>{project.status}</span>{/if}<span>{date(project)}</span><button type="button" aria-label={moveButton(project, "up")} onclick={() => onMove(idFor(project), "up")} class="border border-ink px-1.5 text-ink">↑</button><button type="button" aria-label={moveButton(project, "down")} onclick={() => onMove(idFor(project), "down")} class="border border-ink px-1.5 text-ink">↓</button></div>
        </div>
      {/each}
    </div>
  {:else}
    <div class="grid {DENSITY_GAP[experiment.density]} {ALIGNMENT_CLASSES[experiment.alignment]}" class:overflow-y-auto={experiment.overflow === "scroll"} class:max-h-[42rem]={experiment.view === "showcase" && experiment.overflow !== "visible"} style={`grid-template-columns: repeat(${experiment.view === "showcase" ? Math.min(experiment.columns, 2) : experiment.columns}, minmax(0, 1fr)); gap: var(--lab-gap)`}>
      {#each visible as project, index (project.slug)}
        <ProjectCard project={project} {index} density={experiment.density} cardHeight={experiment.cardHeight} showImage={experiment.showImage} showSummary={experiment.showSummary} showTags={experiment.showTags} showStatus={experiment.showStatus} showLinks={experiment.showLinks} />
      {/each}
    </div>
    {#if experiment.view === "showcase" && experiment.overflow === "fade" && filtered.length > visible.length}
      {#if showAll}<button type="button" onclick={() => (showAll = false)} class="mt-3 w-full border border-dashed border-ink py-2 font-mono text-xs uppercase tracking-wider text-ink">Collapse showcase</button>{:else}<button type="button" onclick={() => (showAll = true)} class="mt-3 w-full border border-dashed border-ink py-2 font-mono text-xs uppercase tracking-wider text-ink">View all {filtered.length} projects ({filtered.length - visible.length} hidden)</button>{/if}
    {/if}
  {/if}

  {#if experiment.overflow === "paginate" && filtered.length > experiment.pageSize}
    <div class="mt-4 flex items-center justify-center gap-4 font-mono text-xs uppercase tracking-wider text-journal-1"><button type="button" disabled={page === 1} onclick={() => (page = Math.max(1, page - 1))} class="u-draw disabled:opacity-40">← previous</button><span>page {page} / {maxPage}</span><button type="button" disabled={page === maxPage} onclick={() => (page = Math.min(maxPage, page + 1))} class="u-draw disabled:opacity-40">next →</button></div>
  {/if}
</div>
