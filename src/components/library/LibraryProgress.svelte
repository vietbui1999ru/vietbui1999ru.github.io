<script lang="ts">
let { value, label }: { value: number; label: string } = $props();

const clamped = $derived(Math.min(100, Math.max(0, value)));
</script>

<div
  role="progressbar"
  aria-label={label}
  aria-valuemin={0}
  aria-valuemax={100}
  aria-valuenow={clamped}
  class="h-2 w-full max-w-sm border border-ink bg-paper-raised"
  data-library-progress
>
  <div class="h-full bg-ink" style:width="{clamped}%"></div>
</div>
