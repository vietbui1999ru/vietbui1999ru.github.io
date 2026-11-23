<script lang="ts">
import { PROJECT_SORT_KEYS, type ProjectSortKey } from "../../lib/project-sort";

let {
  value,
  onChange,
}: { value: ProjectSortKey; onChange: (key: ProjectSortKey) => void } = $props();
</script>

<label class="inline-flex items-center gap-2 font-mono text-[0.68rem] uppercase tracking-wider text-journal-2">
  <span>sort</span>
  <select
    class="border-[1.5px] border-ink bg-paper-raised px-2 py-1 font-mono text-step--1 text-ink"
    {value}
    onchange={(event) => onChange(event.currentTarget.value as ProjectSortKey)}
  >
    {#each PROJECT_SORT_KEYS as key (key)}
      <option value={key}>{key}</option>
    {/each}
  </select>
</label>
