<script lang="ts">
let { size = 18, strokeWidth = 1.75 }: { size?: number; strokeWidth?: number } =
  $props();
</script>

<svg
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width={strokeWidth}
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"
>
  <path d="m9 18 6-6-6-6"></path>
</svg>
