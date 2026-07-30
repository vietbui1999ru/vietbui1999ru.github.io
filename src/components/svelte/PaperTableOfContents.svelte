<script lang="ts">
import { on } from "svelte/events";
import { SvelteSet } from "svelte/reactivity";

type Heading = {
  id: string;
  text: string;
  depth: 2 | 3;
};

let { contentId }: { contentId: string } = $props();
let headings = $state.raw<Heading[]>([]);
let activeId = $state("");
let observer: IntersectionObserver | undefined;

function extractHeadings(): Heading[] {
  const root = document.getElementById(contentId);
  if (!root) return [];
  return Array.from(root.querySelectorAll<HTMLElement>("h2, h3"))
    .filter((heading) => heading.id)
    .map((heading) => ({
      id: heading.id,
      text: heading.textContent?.trim() ?? "",
      depth: Number(heading.tagName[1]) as 2 | 3,
    }));
}

function refresh() {
  observer?.disconnect();
  headings = extractHeadings();
  if (headings.length === 0) return;

  const visible = new SvelteSet<string>();
  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) visible.add(entry.target.id);
        else visible.delete(entry.target.id);
      }
      const active = headings.find((heading) => visible.has(heading.id));
      if (active) activeId = active.id;
    },
    { rootMargin: "-80px 0px -66% 0px", threshold: 0 },
  );

  for (const heading of headings) {
    const element = document.getElementById(heading.id);
    if (element) observer.observe(element);
  }
}

function setup(_node: HTMLElement) {
  const timer = window.setTimeout(refresh, 50);
  const removeVariantListener = on(window, "variant-change", () => {
    window.setTimeout(refresh, 0);
  });

  return () => {
    window.clearTimeout(timer);
    removeVariantListener();
    observer?.disconnect();
  };
}

function selectHeading(event: MouseEvent, id: string) {
  event.preventDefault();
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  activeId = id;
}
</script>

{#if headings.length > 0}
  <nav aria-label="Table of contents" {@attach setup}>
    <p class="mb-4 font-mono text-[0.68rem] uppercase tracking-widest text-journal-2">
      on this page
    </p>
    <ul class="space-y-0.5">
      {#each headings as heading (heading.id)}
        <li>
          <a
            href="#{heading.id}"
            onclick={(event) => selectHeading(event, heading.id)}
            aria-current={activeId === heading.id ? "location" : undefined}
            class={[
              "block border-l-[1.5px] py-1 font-mono text-[0.72rem] leading-relaxed no-underline transition-colors",
              heading.depth === 2 ? "pl-3" : "pl-6",
              activeId === heading.id
                ? "border-ink font-medium text-ink"
                : "border-transparent text-journal-2 hover:border-journal-2 hover:text-ink",
            ]}
          >
            {heading.text}
          </a>
        </li>
      {/each}
    </ul>
  </nav>
{:else}
  <div class="hidden" {@attach setup}></div>
{/if}
