<script lang="ts">
import { chipClass } from "../primitives/Chip.svelte";
import LibraryCard from "./LibraryCard.svelte";
import type { LibraryStatus, LibraryType } from "../../content/schemas";
import { statusLabel, statusesFor } from "../../lib/library-status";
import { filterCards, sortByRecent, type LibraryCardData } from "../../lib/library-view";

let { type, items }: { type: LibraryType; items: LibraryCardData[] } = $props();

let status = $state<LibraryStatus | "all">("all");
let tag = $state<string>("all");
let staplesOnly = $state(false);

const now = $derived(items.filter((item) => item.status === "active"));
const statusOptions = $derived<Array<LibraryStatus | "all">>([
  "all",
  ...statusesFor(type).filter((s) => items.some((item) => item.status === s)),
]);
const tags = $derived([...new Set(items.flatMap((item) => item.tags))].sort());
const shown = $derived(sortByRecent(filterCards(items, { status, tag, staplesOnly })));
</script>

<div data-library-collection={type}>
  {#if now.length > 0}
    <section aria-label="now" class="mb-10" data-library-now>
      <h2 class="mb-4 font-serif text-step-1 text-ink">now</h2>
      <ul class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {#each now as item (item.href)}
          <li><LibraryCard {item} /></li>
        {/each}
      </ul>
    </section>
  {/if}

  <div class="mb-6 flex flex-wrap items-center gap-2" role="group" aria-label="filter by status">
    {#each statusOptions as option (option)}
      <button
        type="button"
        aria-pressed={status === option}
        class={chipClass(status === option ? "grey" : "ink", false, "md")}
        onclick={() => (status = option)}
      >
        {option === "all" ? "all" : statusLabel(type, option)}
      </button>
    {/each}
    {#if type === "recipe"}
      <button
        type="button"
        aria-pressed={staplesOnly}
        class={chipClass(staplesOnly ? "grey" : "ink", false, "md")}
        onclick={() => (staplesOnly = !staplesOnly)}
      >
        staples
      </button>
    {/if}
  </div>

  {#if tags.length > 0}
    <div class="mb-6 flex flex-wrap gap-2" role="group" aria-label="filter by tag">
      {#each ["all", ...tags] as option (option)}
        <button
          type="button"
          aria-pressed={tag === option}
          class={chipClass(tag === option ? "grey" : "muted")}
          onclick={() => (tag = option)}
        >
          {option === "all" ? "all tags" : option}
        </button>
      {/each}
    </div>
  {/if}

  <ul class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4" data-library-grid>
    {#each shown as item (item.href)}
      <li><LibraryCard {item} /></li>
    {:else}
      <li class="col-span-full font-mono text-step--1 text-journal-1">nothing here yet</li>
    {/each}
  </ul>
</div>
