<script lang="ts">
import type { Snippet } from "svelte";
import Section from "../primitives/Section.svelte";
import { PROSE } from "../../design-system/prose";

// The page passes Site/About.md's rendered body as children.
let { children }: { children?: Snippet } = $props();
</script>

<Section id="about-prose" sentinel={false} data-block="about-prose">
  <div class="{PROSE} max-w-3xl text-step-0">
    {@render children?.()}
  </div>
</Section>
