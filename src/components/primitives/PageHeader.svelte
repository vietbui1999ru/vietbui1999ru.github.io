<script lang="ts">
import type { Snippet } from "svelte";
import type { ClassValue } from "svelte/elements";
import InkLink from "./InkLink.svelte";

let {
  title,
  kicker,
  description,
  back,
  meta,
  children,
  class: className,
}: {
  title: string;
  /** Journal label above the title, e.g. "field note". */
  kicker?: string;
  description?: string;
  back?: { href: string; label: string };
  /** Mono metadata row (dates, counts, reading time). */
  meta?: Snippet;
  /** Extra content under the header text, e.g. tag chips. */
  children?: Snippet;
  class?: ClassValue;
} = $props();
</script>

{#if back}
  <InkLink href={back.href} arrow="back" tone="muted" class="mb-8 inline-block">{back.label}</InkLink>
{/if}

<header class={["mb-12 border-b-[1.5px] border-ink pb-8", className]}>
  {#if kicker}
    <span class="label-mono mb-4 block text-journal-2">{kicker}</span>
  {/if}
  <h1 class="font-serif text-step-3 font-semibold leading-tight tracking-tight text-ink">
    {title}
  </h1>
  {#if description}
    <p class="mt-4 max-w-3xl text-step-0 leading-relaxed text-journal-1">{description}</p>
  {/if}
  {#if meta}
    <div class="label-mono mt-5 flex flex-wrap items-center gap-3 text-journal-2">
      {@render meta()}
    </div>
  {/if}
  {#if children}
    <div class="mt-5">{@render children()}</div>
  {/if}
</header>
