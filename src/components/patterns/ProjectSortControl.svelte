<script lang="ts">
import { ChevronDown } from "@lucide/svelte";
import { PROJECT_SORT_KEYS, type ProjectSortKey } from "../../lib/project-sort";

let {
  value,
  onChange,
}: { value: ProjectSortKey; onChange: (key: ProjectSortKey) => void } = $props();
</script>

<label class="inline-flex items-center gap-3 font-mono text-[0.68rem] uppercase tracking-wider text-journal-2">
  <span>sort</span>
  <span class="relative inline-flex">
    <select
      class="lift h-9 cursor-pointer appearance-none border-[1.5px] border-ink bg-paper-raised py-1 pr-9 pl-3 font-mono text-step--1 lowercase text-ink shadow-hard-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      {value}
      onchange={(event) => onChange(event.currentTarget.value as ProjectSortKey)}
    >
      {#each PROJECT_SORT_KEYS as key (key)}
        <option value={key}>{key}</option>
      {/each}
    </select>
    <ChevronDown
      size={16}
      strokeWidth={1.75}
      aria-hidden="true"
      class="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-ink"
    />
  </span>
</label>
