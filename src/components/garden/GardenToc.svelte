<script lang="ts">
import { onMount } from "svelte";
import { tocEntries, tocVisible, TOC_DEFAULTS, type TocHeading } from "../../lib/toc";
import { installReadingRail } from "../../lib/reading-rail-dom";
import { PASTEL_BG, toneFor } from "../../design-system/tone";

// `sidebar` puts the list beside the article on lg and up (sticky), as a reading rail:
// a line with one checkpoint per heading and a marker at the reading position. Without
// it the list is a collapsed <details> at every width. Under minHeadings it renders nothing.
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
let nav = $state<HTMLElement>();

// The rail is installed again whenever the entries change (a tab switch), after the
// list has re-rendered, so it measures the current checkpoints and headings.
$effect(() => {
  if (!nav || entries.length === 0) return;
  return installReadingRail(nav);
});

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
      bind:this={nav}
      aria-label="On this page"
      data-ink-obstacle="controls"
      class="hidden lg:sticky lg:top-20 lg:block lg:self-start"
    >
      <p class="mb-3 pl-5 font-mono text-[0.68rem] uppercase tracking-wider text-journal-2">contents</p>
      <div data-reading-rail class="reading-rail relative">
        <span aria-hidden="true" data-rail-line="passed" class="rail-passed absolute top-0 left-0 w-[1.5px] bg-ink"></span>
        <span aria-hidden="true" data-rail-line="upcoming" class="rail-upcoming absolute bottom-0 left-0 w-[1.5px] bg-journal-3"></span>
        <span aria-hidden="true" data-rail-marker class="rail-marker absolute top-0 -left-[6px] z-10">
          <span class="block h-[13px] w-[13px] border-2 border-ink bg-paper-raised shadow-hard-sm"></span>
        </span>
        <ol class="space-y-2 py-1">
          {#each entries as entry, i (entry.slug)}
            <li>
              <a
                href={`#${entry.slug}`}
                aria-current={activeSlug === entry.slug ? "location" : undefined}
                class={[
                  "relative block text-step--1 text-journal-1 underline-offset-4 transition-colors motion-reduce:transition-none hover:text-ink aria-[current=location]:text-ink aria-[current=location]:underline",
                  entry.depth === 3 ? "pl-9" : "pl-5",
                ]}
              >
                <span
                  aria-hidden="true"
                  data-checkpoint
                  data-index={i}
                  data-slug={entry.slug}
                  data-depth={entry.depth}
                  data-state="passed"
                  class={[
                    "rail-checkpoint absolute top-[0.55em] border-[1.5px] border-ink",
                    PASTEL_BG[toneFor(entry.slug)],
                    entry.depth === 3 ? "-left-[3px] h-[7px] w-[7px]" : "-left-[4.5px] h-[10px] w-[10px]",
                  ]}
                ></span>{entry.text}</a>
            </li>
          {/each}
        </ol>
      </div>
    </nav>
  {/if}
{/if}

<style>
  /* Static fallback: full passed line, no marker, every checkpoint passed. */
  .rail-passed {
    height: 100%;
  }
  .rail-upcoming {
    top: 100%;
  }
  .rail-marker {
    display: none;
  }
  .rail-checkpoint:global([data-state="upcoming"]) {
    background-color: var(--color-paper-raised);
  }

  /* Script ready: both segments span the rail and the script scales them (scaleY), and it
     moves the marker with translate3d, so frames stay on the compositor. */
  .reading-rail:global([data-rail-ready]) .rail-marker {
    display: block;
    will-change: transform;
  }
  .reading-rail:global([data-rail-ready]) .rail-passed,
  .reading-rail:global([data-rail-ready]) .rail-upcoming {
    top: 0;
    height: 100%;
    will-change: transform;
  }
  .reading-rail:global([data-rail-ready]) .rail-passed {
    transform-origin: top;
  }
  .reading-rail:global([data-rail-ready]) .rail-upcoming {
    transform-origin: bottom;
  }
  .reading-rail:global([data-rail-ready]) .rail-checkpoint {
    transition: background-color 150ms ease-out;
  }

  @media (prefers-reduced-motion: reduce) {
    .reading-rail:global([data-rail-ready]) .rail-checkpoint {
      transition: none;
    }
  }
</style>
