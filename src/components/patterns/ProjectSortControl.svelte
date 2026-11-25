<script lang="ts">
import InkSelect from "../primitives/InkSelect.svelte";
import { PROJECT_SORT_KEYS, type ProjectSortKey } from "../../lib/project-sort";

let {
  value,
  onChange,
}: { value: ProjectSortKey; onChange: (key: ProjectSortKey) => void } = $props();

const options = PROJECT_SORT_KEYS.map((key) => ({ value: key, label: key }));
</script>

<InkSelect {options} {value} label="sort" {onChange} align="end" />
