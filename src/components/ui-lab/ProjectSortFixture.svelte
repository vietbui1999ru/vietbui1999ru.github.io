<script lang="ts">
import ProjectSortControl from "../patterns/ProjectSortControl.svelte";
import type { ProjectSortKey } from "../../lib/project-sort";

// /ui-lab fixture: the control with live state, so each sort key can be tried.
let sortKey = $state<ProjectSortKey>("featured");
</script>

<div class="p-6">
  <ProjectSortControl value={sortKey} onChange={(key) => (sortKey = key)} />
  <p class="mt-3 font-mono text-[0.68rem] text-journal-2">current: {sortKey}</p>
</div>
