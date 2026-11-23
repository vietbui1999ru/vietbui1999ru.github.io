<script lang="ts">
import { onMount } from "svelte";
import { tocEntries, tocVisible, TOC_DEFAULTS, type TocHeading } from "../../lib/toc";

// `sidebar` puts the list beside the article on lg and up (sticky). Without it the
// list is a collapsed <details> at every width. Under minHeadings it renders nothing.
let {
  headings = [],
  minHeadings = TOC_DEFAULTS.minHeadings,
  maxDepth = TOC_DEFAULTS.maxDepth,
  sidebar = false,
}: {
  headings?: TocHeading[];
  minHeadings?: number;
  maxDepth?: number;
  sidebar?: boolean;
} = $props();

// Set when the post's variant switcher changes tab; the TOC then shows that tab's headings.
let tabHeadings = $state<TocHeading[] | null>(null);
const entries = $derived(tocEntries(tabHeadings ?? headings, maxDepth));
const visible = $derived(tocVisible(entries, minHeadings));
let activeSlug = $state("");

let observer: IntersectionObserver | undefined;

// Watches the current entries' headings. Rebuilt whenever the entries change (a tab
// switch swaps in different heading elements), so the highlight follows the active tab.
function observeHeadings() {
  observer?.disconnect();
  observer = undefined;
  activeSlug = "";
  if (!visible || typeof IntersectionObserver === "undefined") return;
  // A heading counts as current while it sits in the upper part of the viewport.
  observer = new IntersectionObserver(
    (records) => {
      for (const record of records) {
        if (record.isIntersecting) activeSlug = record.target.id;
      }
    },
    { rootMargin: "0px 0px -70% 0px" },
  );
  for (const entry of entries) {
    const el = document.getElementById(entry.slug);
    if (el) observer.observe(el);
  }
}

onMount(() => {
  const onVariant = (event: Event) => {
    const detail = (event as CustomEvent<{ headings?: TocHeading[] }>).detail;
    tabHeadings = detail?.headings ?? null;
    observeHeadings();
  };
  window.addEventListener("variant-change", onVariant);
  observeHeadings();
  return () => {
    window.removeEventListener("variant-change", onVariant);
    observer?.disconnect();
  };
});
</script>

{#snippet list()}
  <ol class="space-y-2">
    {#each entries as entry (entry.slug)}
      <li class={entry.depth === 3 ? "pl-4" : ""}>
        <a
          href={`#${entry.slug}`}
          aria-current={activeSlug === entry.slug ? "location" : undefined}
          class="text-step--1 text-journal-1 underline-offset-4 transition-colors motion-reduce:transition-none hover:text-ink aria-[current=location]:text-ink aria-[current=location]:underline"
        >{entry.text}</a>
      </li>
    {/each}
  </ol>
{/snippet}

{#if visible}
  <details
    data-block="toc"
    class={["mb-8 border-[1.5px] border-ink bg-paper-raised p-4 shadow-hard-sm", sidebar && "lg:hidden"]}
  >
    <summary class="cursor-pointer font-mono text-[0.68rem] uppercase tracking-wider text-journal-2">contents</summary>
    <div class="mt-3">{@render list()}</div>
  </details>

  {#if sidebar}
    <nav
      aria-label="On this page"
      data-ink-obstacle="controls"
      class="hidden lg:sticky lg:top-20 lg:block lg:self-start lg:border-l-[1.5px] lg:border-ink lg:pl-4"
    >
      <p class="mb-3 font-mono text-[0.68rem] uppercase tracking-wider text-journal-2">contents</p>
      {@render list()}
    </nav>
  {/if}
{/if}
