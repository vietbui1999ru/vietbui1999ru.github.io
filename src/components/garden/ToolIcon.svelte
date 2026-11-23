<script lang="ts">
// Monochrome simple-icons glyph. The path is trusted build-time data, set as an attribute.
let { path, label }: { path: string; label: string } = $props();
</script>

<svg
  role="img"
  aria-label={label}
  viewBox="0 0 24 24"
  class="h-4 w-4 shrink-0 text-ink"
  fill="currentColor"
>
  <path d={path} />
</svg>
