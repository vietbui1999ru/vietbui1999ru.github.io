<script lang="ts">
import { SvelteSet } from "svelte/reactivity";
import { chipClass } from "../primitives/Chip.svelte";
import LibraryCollection from "./LibraryCollection.svelte";
import type { LibraryType } from "../../content/schemas";
import type { LibraryCardData } from "../../lib/library-view";

interface Shelf {
  type: LibraryType;
  label: string;
  enabled: boolean;
  cards: LibraryCardData[];
}

// Every category's cards arrive with the page. Only the open category's grid is
// built; another is built the first time its tab opens, then kept. Switching
// never loads a page: the address bar follows with pushState, so links and
// the back button still work.
let { shelves, initial }: { shelves: Shelf[]; initial?: LibraryType } = $props();

const start = () => initial ?? shelves[0]?.type;
let current = $state<LibraryType | undefined>(start());
// Seeded here (not in an effect) so the server-rendered HTML holds the first grid.
const first = start();
const built = new SvelteSet<LibraryType>(first ? [first] : []);

function open(type: LibraryType, push = true) {
  if (type === current) return;
  built.add(type);
  current = type;
  if (push) history.pushState({ libraryType: type }, "", `/library/${type}`);
}

function typeFromPath(): LibraryType | undefined {
  const match = /^\/library\/([a-z]+)\/?$/.exec(location.pathname);
  const found = shelves.find((shelf) => shelf.type === match?.[1]);
  return found?.type ?? shelves[0]?.type;
}

$effect(() => {
  const onPop = () => {
    const type = typeFromPath();
    if (type) open(type, false);
  };
  window.addEventListener("popstate", onPop);
  return () => window.removeEventListener("popstate", onPop);
});

// Left and right arrows move between tabs, as in a standard tab list.
function onKey(event: KeyboardEvent, index: number) {
  if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
  event.preventDefault();
  const step = event.key === "ArrowRight" ? 1 : -1;
  const next = shelves[(index + step + shelves.length) % shelves.length];
  open(next.type);
  document.getElementById(`library-tab-${next.type}`)?.focus();
}
</script>

{#if shelves.length === 0}
  <p class="font-mono text-step--1 text-journal-1">nothing here yet</p>
{:else}
  <div role="tablist" aria-label="library categories" class="mb-10 flex flex-wrap gap-2" data-library-tabs>
    {#each shelves as shelf, index (shelf.type)}
      <button
        type="button"
        role="tab"
        id="library-tab-{shelf.type}"
        aria-selected={shelf.type === current}
        aria-controls="library-panel-{shelf.type}"
        tabindex={shelf.type === current ? 0 : -1}
        class={chipClass(shelf.type === current ? "grey" : "ink", false, "md")}
        data-library-tab={shelf.type}
        onclick={() => open(shelf.type)}
        onkeydown={(event) => onKey(event, index)}
      >
        {shelf.label}{shelf.enabled ? "" : " (hidden)"}
      </button>
    {/each}
  </div>

  {#each shelves as shelf (shelf.type)}
    {#if built.has(shelf.type)}
      <div
        role="tabpanel"
        id="library-panel-{shelf.type}"
        aria-labelledby="library-tab-{shelf.type}"
        hidden={shelf.type !== current}
        data-library-panel={shelf.type}
      >
        <LibraryCollection type={shelf.type} items={shelf.cards} />
      </div>
    {/if}
  {/each}
{/if}
