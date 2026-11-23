<script lang="ts">
import type { Snippet } from "svelte";
import Section from "../primitives/Section.svelte";
import { PROSE } from "../../design-system/prose";

// The page passes Site/Home.md's rendered body as children.
let { children }: { children?: Snippet } = $props();
</script>

<Section id="identity" sentinel={false} data-block="identity">
  <div class="{PROSE} max-w-3xl text-step-1">
    {@render children?.()}
  </div>
</Section>
