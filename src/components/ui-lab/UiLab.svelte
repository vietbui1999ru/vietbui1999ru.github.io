<script lang="ts">
import { onMount } from "svelte";
import Button from "../primitives/Button.svelte";
import CollectionToolbar from "../patterns/CollectionToolbar.svelte";
import ProjectCollection from "../patterns/ProjectCollection.svelte";
import IconPlayground from "./IconPlayground.svelte";
import { UI_LAB_PROJECTS } from "../../fixtures/projects";
import {
  DEFAULT_COLLECTION_STATE,
  parseCollectionState,
  serializeCollectionState,
} from "../../design-system/collection";
import { PAPER_PALETTES } from "../../design-system/palettes";
import type {
  CollectionExperimentState,
  CollectionPalette,
} from "../../design-system/types";
import {
  collectTags,
  filterAndSortCollection,
  idsForRecords,
  moveRecord,
} from "../../lib/collection-controls";

const tabs = [
  "data",
  "layout",
  "density",
  "style",
  "content",
  "behavior",
] as const;
type LabTab = (typeof tabs)[number];

let experiment = $state<CollectionExperimentState>({
  ...DEFAULT_COLLECTION_STATE,
  tags: [],
  order: [],
});
let activeTab = $state<LabTab>("data");
let copied = $state(false);

const tags = collectTags(UI_LAB_PROJECTS);
const palettes = Object.entries(PAPER_PALETTES) as Array<
  [CollectionPalette, (typeof PAPER_PALETTES)[CollectionPalette]]
>;

let paletteStyle = $derived.by(() => {
  const palette = PAPER_PALETTES[experiment.palette];
  return [
    `--paper:${palette.paper}`,
    `--paper-raised:${palette.raised}`,
    `--ink:${palette.ink}`,
    `--ink-soft:${palette.inkSoft}`,
    `--grey-1:${palette.inkSoft}`,
    `--grey-2:${palette.rule}`,
    `--grey-3:${palette.rule}`,
    `--grey-4:${palette.paper}`,
    `--sage:${palette.accents[0]}`,
    `--dust:${palette.accents[1]}`,
    `--rose:${palette.accents[2]}`,
    `--butter:${palette.accents[3]}`,
    `--texture-opacity:${experiment.texture ? palette.textureOpacity : "0"}`,
  ].join(";");
});

onMount(() => {
  experiment = parseCollectionState(window.location.search);
});

function updateState(patch: Partial<CollectionExperimentState>): void {
  experiment = { ...experiment, ...patch };
  if (typeof window !== "undefined") {
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${serializeCollectionState(experiment)}`,
    );
  }
}

function resetState(): void {
  updateState({ ...DEFAULT_COLLECTION_STATE, tags: [], order: [] });
}

async function copyUrl(): Promise<void> {
  if (typeof navigator !== "undefined" && navigator.clipboard) {
    await navigator.clipboard.writeText(
      `${window.location.origin}${window.location.pathname}${serializeCollectionState(experiment)}`,
    );
    copied = true;
    window.setTimeout(() => (copied = false), 1600);
  }
}

function moveProject(id: string, direction: "up" | "down"): void {
  const current = filterAndSortCollection(UI_LAB_PROJECTS, experiment);
  const moved = moveRecord(current, id, direction);
  updateState({ order: idsForRecords(moved) });
}

function setNumber(event: Event, key: "columns" | "pageSize"): void {
  const value = Number((event.currentTarget as HTMLSelectElement).value);
  updateState({ [key]: value } as Partial<CollectionExperimentState>);
}

function setBoolean(
  event: Event,
  key: keyof Pick<
    CollectionExperimentState,
    | "showImage"
    | "showSummary"
    | "showTags"
    | "showStatus"
    | "showLinks"
    | "texture"
  >,
): void {
  updateState({ [key]: (event.currentTarget as HTMLInputElement).checked });
}
</script>

<svelte:head>
  <title>UI Lab | Viet Bui</title>
  <meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="relative min-h-screen bg-paper text-ink" style={paletteStyle}>
  <div
    class="pointer-events-none fixed inset-0 z-50 opacity-[var(--texture-opacity)] [background-image:radial-gradient(#141412_0.6px,transparent_0.6px)] [background-size:5px_5px]"
    aria-hidden="true"
  ></div>

  <div class="relative z-10 mx-auto w-full max-w-[var(--content-max)] px-4 py-8 sm:px-6 md:py-12">
    <header class="mb-8 flex flex-wrap items-end justify-between gap-4 border-b-[1.5px] border-ink pb-5">
      <div>
        <p class="mb-2 font-mono text-step--1 uppercase tracking-wider text-journal-2">development workbench</p>
        <h1 class="font-serif text-step-3 font-semibold tracking-tight text-ink">ui lab</h1>
      </div>
      <div class="flex items-end gap-3">
        <p class="max-w-md text-right text-step--1 leading-relaxed text-journal-1">
          Layout, density, collection, and paper-stock experiments before production promotion.
        </p>
        {#if copied}<span class="font-mono text-xs uppercase text-journal-1">copied</span>{/if}
      </div>
    </header>

    <div class="grid gap-6 lg:grid-cols-[minmax(15rem,19rem)_minmax(0,1fr)]">
      <aside class="h-fit border-[1.5px] border-ink bg-paper-raised p-4 shadow-hard" aria-label="UI lab inspector">
        <div class="mb-4 flex items-center justify-between border-b border-journal-3 pb-3">
          <h2 class="font-mono text-step--1 uppercase tracking-wider text-ink">inspector</h2>
          <span class="font-mono text-[0.68rem] uppercase text-journal-2">projects</span>
        </div>

        <div class="mb-5 grid grid-cols-3 gap-1 border-b border-journal-3 pb-4 sm:grid-cols-6 lg:grid-cols-3">
          {#each tabs as tab (tab)}
            <button
              type="button"
              aria-pressed={activeTab === tab}
              onclick={() => (activeTab = tab)}
              class="border border-ink px-1 py-1.5 font-mono text-[0.62rem] uppercase tracking-wide text-ink aria-pressed:bg-ink aria-pressed:text-paper"
            >{tab}</button>
          {/each}
        </div>

        {#if activeTab === "data"}
          <label class="mb-4 block">
            <span class="mb-1 block font-mono text-[0.68rem] uppercase tracking-wider text-journal-1">source</span>
            <select class="w-full border-[1.5px] border-ink bg-paper px-2 py-2 font-mono text-xs text-ink">
              <option>deterministic fixtures</option>
              <option disabled>live vault adapter — next</option>
            </select>
          </label>
          <p class="border-l-2 border-pastel-butter pl-3 text-xs leading-relaxed text-journal-1">
            Six fixtures cover featured, long-title, tag-heavy, no-link, no-media, and archived states.
          </p>
        {:else if activeTab === "layout"}
          <label class="mb-4 block"><span class="mb-1 block font-mono text-[0.68rem] uppercase tracking-wider text-journal-1">columns</span><select value={experiment.columns} onchange={(event) => setNumber(event, "columns")}  class="w-full border-[1.5px] border-ink bg-paper px-2 py-2 font-mono text-xs text-ink"><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option></select></label>
          <label class="mb-4 block"><span class="mb-1 block font-mono text-[0.68rem] uppercase tracking-wider text-journal-1">width</span><select value={experiment.width} onchange={(event) => updateState({ width: (event.currentTarget as HTMLSelectElement).value as CollectionExperimentState["width"] })} class="w-full border-[1.5px] border-ink bg-paper px-2 py-2 font-mono text-xs text-ink"><option value="narrow">narrow</option><option value="standard">standard</option><option value="wide">wide</option><option value="fluid">fluid</option></select></label>
          <label class="mb-4 block"><span class="mb-1 block font-mono text-[0.68rem] uppercase tracking-wider text-journal-1">alignment</span><select value={experiment.alignment} onchange={(event) => updateState({ alignment: (event.currentTarget as HTMLSelectElement).value as CollectionExperimentState["alignment"] })} class="w-full border-[1.5px] border-ink bg-paper px-2 py-2 font-mono text-xs text-ink"><option value="start">start</option><option value="center">center</option><option value="end">end</option><option value="stretch">stretch</option></select></label>
        {:else if activeTab === "density"}
          <label class="mb-4 block"><span class="mb-1 block font-mono text-[0.68rem] uppercase tracking-wider text-journal-1">density</span><select value={experiment.density} onchange={(event) => updateState({ density: (event.currentTarget as HTMLSelectElement).value as CollectionExperimentState["density"] })} class="w-full border-[1.5px] border-ink bg-paper px-2 py-2 font-mono text-xs text-ink"><option value="comfortable">comfortable</option><option value="compact">compact</option><option value="minimal">minimal</option></select></label>
          <label class="mb-4 block"><span class="mb-1 block font-mono text-[0.68rem] uppercase tracking-wider text-journal-1">card height</span><select value={experiment.cardHeight} onchange={(event) => updateState({ cardHeight: (event.currentTarget as HTMLSelectElement).value as CollectionExperimentState["cardHeight"] })} class="w-full border-[1.5px] border-ink bg-paper px-2 py-2 font-mono text-xs text-ink"><option value="auto">auto</option><option value="compact">compact + clip</option><option value="fixed">fixed + clip</option></select></label>
          <label class="block"><span class="mb-1 block font-mono text-[0.68rem] uppercase tracking-wider text-journal-1">gap</span><select value={experiment.gap} onchange={(event) => updateState({ gap: (event.currentTarget as HTMLSelectElement).value as CollectionExperimentState["gap"] })} class="w-full border-[1.5px] border-ink bg-paper px-2 py-2 font-mono text-xs text-ink"><option value="sm">small</option><option value="md">medium</option><option value="lg">large</option></select></label>
        {:else if activeTab === "style"}
          <fieldset class="mb-4"><legend class="mb-2 font-mono text-[0.68rem] uppercase tracking-wider text-journal-1">paper stock</legend><div class="grid gap-1.5">{#each palettes as [key, palette] (key)}<label class="flex cursor-pointer items-center gap-2 text-xs text-ink"><input type="radio" name="palette" checked={experiment.palette === key} onchange={() => updateState({ palette: key })} /><span>{palette.label}</span></label>{/each}</div></fieldset>
          <label class="flex cursor-pointer items-center justify-between gap-3 text-xs text-ink"><span>grain texture</span><input type="checkbox" checked={experiment.texture} onchange={(event) => setBoolean(event, "texture")} /></label>
        {:else if activeTab === "content"}
          <div class="grid gap-2">{#each [["showImage", "images"], ["showSummary", "summaries"], ["showTags", "tags"], ["showStatus", "status"], ["showLinks", "links"]] as [key, label] (key)}<label class="flex cursor-pointer items-center justify-between gap-3 text-xs text-ink"><span>{label}</span><input type="checkbox" checked={experiment[key as keyof CollectionExperimentState] as boolean} onchange={(event) => setBoolean(event, key as "showImage" | "showSummary" | "showTags" | "showStatus" | "showLinks")} /></label>{/each}</div>
        {:else}
          <label class="mb-4 block"><span class="mb-1 block font-mono text-[0.68rem] uppercase tracking-wider text-journal-1">overflow</span><select value={experiment.overflow} onchange={(event) => updateState({ overflow: (event.currentTarget as HTMLSelectElement).value as CollectionExperimentState["overflow"] })} class="w-full border-[1.5px] border-ink bg-paper px-2 py-2 font-mono text-xs text-ink"><option value="visible">visible</option><option value="scroll">scroll region</option><option value="fade">fade + view all</option><option value="paginate">paginate</option></select></label>
          <label class="block"><span class="mb-1 block font-mono text-[0.68rem] uppercase tracking-wider text-journal-1">page size</span><select value={experiment.pageSize} onchange={(event) => setNumber(event, "pageSize")} class="w-full border-[1.5px] border-ink bg-paper px-2 py-2 font-mono text-xs text-ink"><option value="3">3</option><option value="6">6</option><option value="9">9</option></select></label>
        {/if}

        <div class="mt-6 flex gap-2 border-t border-journal-3 pt-4">
          <Button variant="outline" size="sm" onclick={resetState}>Reset</Button>
          <Button variant="ghost" size="sm" onclick={copyUrl}>Copy URL</Button>
        </div>
      </aside>

      <main class="min-w-0 space-y-5">
        <section class="border-[1.5px] border-ink bg-paper-raised p-4 shadow-hard sm:p-6" aria-labelledby="collection-heading">
          <div class="mb-5 flex flex-wrap items-baseline justify-between gap-3">
            <div><p class="mb-1 font-mono text-[0.68rem] uppercase tracking-wider text-journal-2">collection experiment</p><h2 id="collection-heading" class="font-serif text-step-1 font-semibold text-ink">projects</h2></div>
            <span class="font-mono text-[0.68rem] uppercase tracking-wider text-journal-2">{experiment.view} / {experiment.density}</span>
          </div>
          <CollectionToolbar state={experiment} {tags} resultCount={filterAndSortCollection(UI_LAB_PROJECTS, experiment).length} onStateChange={updateState} onReset={resetState} onCopy={copyUrl} />
          <div class="mt-5"><ProjectCollection projects={UI_LAB_PROJECTS} experiment={experiment} onMove={moveProject} /></div>
        </section>
        <IconPlayground />
      </main>
    </div>
  </div>
</div>
