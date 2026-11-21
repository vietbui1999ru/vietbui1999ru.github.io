<script lang="ts">
import type { Snippet } from "svelte";
import type { ClassValue, HTMLAttributes } from "svelte/elements";

type SectionProps = Omit<HTMLAttributes<HTMLElement>, "class"> & {
  id: string;
  /** Emit the `data-section-id` sentinel InkAmbient uses to track sections. */
  sentinel?: boolean;
  class?: ClassValue;
  children: Snippet;
};

let { id, sentinel = true, class: className, children, ...rest }: SectionProps = $props();
</script>

<section {...rest} {id} class={["relative w-full py-section", className]}>
  {#if sentinel}
    <div data-section-id={id} aria-hidden="true" class="pointer-events-none absolute inset-0"></div>
  {/if}

  <div class="page-container relative z-10">
    {@render children()}
  </div>
</section>
