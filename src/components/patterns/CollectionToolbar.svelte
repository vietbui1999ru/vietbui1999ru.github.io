<script lang="ts">
import type {
  CollectionExperimentState,
  CollectionSort,
  CollectionView,
} from "../../design-system/types";

let {
  state,
  tags,
  resultCount,
  onStateChange,
  onReset,
  onCopy,
}: {
  state: CollectionExperimentState;
  tags: string[];
  resultCount: number;
  onStateChange: (patch: Partial<CollectionExperimentState>) => void;
  onReset: () => void;
  onCopy: () => void;
} = $props();

const views: CollectionView[] = [
  "grid",
  "table",
  "rows",
  "compact",
  "showcase",
];
const sorts: Array<{ value: CollectionSort; label: string }> = [
  { value: "featured", label: "featured" },
  { value: "date-desc", label: "date, newest" },
  { value: "title-asc", label: "title, A–Z" },
  { value: "status", label: "status" },
];

function inputValue(event: Event): string {
  return (event.currentTarget as HTMLInputElement).value;
}

function selectValue(event: Event): string {
  return (event.currentTarget as HTMLSelectElement).value;
}
</script>

<div class="flex flex-wrap items-end gap-3 border-b border-journal-3 pb-4" aria-label="Collection controls">
  <label class="min-w-48 flex-1">
    <span class="mb-1 block font-mono text-[0.68rem] uppercase tracking-wider text-journal-1">search</span>
    <input
      value={state.query}
      oninput={(event) => onStateChange({ query: inputValue(event) })}
      placeholder="title, summary, tag…"
      class="w-full border-[1.5px] border-ink bg-paper px-3 py-2 font-mono text-step--1 text-ink placeholder:text-journal-2"
    />
  </label>

  <label>
    <span class="mb-1 block font-mono text-[0.68rem] uppercase tracking-wider text-journal-1">view</span>
    <select
      value={state.view}
      onchange={(event) => onStateChange({ view: selectValue(event) as CollectionView })}
      class="border-[1.5px] border-ink bg-paper px-3 py-2 font-mono text-step--1 text-ink"
    >
      {#each views as view (view)}
        <option value={view}>{view}</option>
      {/each}
    </select>
  </label>

  <label>
    <span class="mb-1 block font-mono text-[0.68rem] uppercase tracking-wider text-journal-1">sort</span>
    <select
      value={state.sort}
      onchange={(event) => onStateChange({ sort: selectValue(event) as CollectionSort })}
      class="border-[1.5px] border-ink bg-paper px-3 py-2 font-mono text-step--1 text-ink"
    >
      {#each sorts as option (option.value)}
        <option value={option.value}>{option.label}</option>
      {/each}
    </select>
  </label>

  <div class="flex items-center gap-2 font-mono text-[0.68rem] uppercase tracking-wider text-journal-1">
    <span>{resultCount} results</span>
    <button type="button" onclick={onReset} class="u-draw text-ink">reset</button>
    <button type="button" onclick={onCopy} class="u-draw text-ink">copy url</button>
  </div>
</div>

{#if tags.length > 0}
  <fieldset class="flex flex-wrap items-center gap-x-3 gap-y-2 pt-3">
    <legend class="mr-1 font-mono text-[0.68rem] uppercase tracking-wider text-journal-1">tags</legend>
    {#each tags as tag (tag)}
      <label class="flex cursor-pointer items-center gap-1.5 font-mono text-[0.68rem] text-ink">
        <input
          type="checkbox"
          checked={state.tags.includes(tag)}
          onchange={(event) => {
            const checked = (event.currentTarget as HTMLInputElement).checked;
            onStateChange({
              tags: checked
                ? [...state.tags, tag]
                : state.tags.filter((selected) => selected !== tag),
            });
          }}
        />
        {tag}
      </label>
    {/each}
  </fieldset>
{/if}
