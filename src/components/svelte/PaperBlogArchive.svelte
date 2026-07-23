<script lang="ts">
import type { SerializedPost } from "../../data/blogData";

let { posts }: { posts: SerializedPost[] } = $props();
let activeTag = $state<string | null>(null);

const tags = $derived([...new Set(posts.flatMap((post) => post.tags))].sort());
const filteredPosts = $derived(
  activeTag ? posts.filter((post) => post.tags.includes(activeTag as string)) : posts,
);

function stamp(iso: string): string {
  const date = new Date(iso);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}·${mm}·${dd}`;
}
</script>

<section class="mx-auto w-full max-w-[var(--content-max)] px-4 py-20 sm:px-6">
  <a
    href="/"
    class="u-draw mb-10 inline-block font-mono text-step--1 uppercase tracking-wider text-journal-1 no-underline"
    >← portfolio</a
  >

  <header class="mb-12 flex items-baseline gap-4">
    <span class="font-mono text-step--1 text-journal-2">archive</span>
    <h1 class="font-serif text-step-3 font-semibold tracking-tight text-ink">field notes</h1>
    <span class="h-px flex-1 -translate-y-1 bg-journal-3"></span>
    <span class="font-mono text-step--1 uppercase tracking-wider text-journal-2"
      >{posts.length} entries</span
    >
  </header>

  {#if tags.length > 0}
    <div class="mb-10 flex flex-wrap gap-2" aria-label="Filter posts by tag">
      <button
        type="button"
        aria-pressed={activeTag === null}
        onclick={() => (activeTag = null)}
        class={[
          "cursor-pointer border border-ink px-3 py-1 font-mono text-[0.7rem] uppercase tracking-wider transition-colors",
          activeTag === null ? "bg-ink text-paper" : "bg-paper-raised text-ink hover:bg-journal-4",
        ]}
      >
        all
      </button>
      {#each tags as tag (tag)}
        <button
          type="button"
          aria-pressed={activeTag === tag}
          onclick={() => (activeTag = activeTag === tag ? null : tag)}
          class={[
            "cursor-pointer border border-ink px-3 py-1 font-mono text-[0.7rem] uppercase tracking-wider transition-colors",
            activeTag === tag
              ? "bg-pastel-butter text-ink"
              : "bg-paper-raised text-ink hover:bg-journal-4",
          ]}
        >
          {tag}
        </button>
      {/each}
    </div>
  {/if}

  <ul class="border-t-[1.5px] border-ink">
    {#each filteredPosts as post (post.slug)}
      <li class="border-b border-journal-3">
        <a
          href="/blog/{post.slug}"
          class="group grid gap-2 px-1 py-5 no-underline transition-all duration-200 hover:bg-journal-4 hover:pl-4 sm:grid-cols-[7rem_1fr_auto] sm:items-baseline sm:gap-5"
        >
          <time class="font-mono text-step--1 text-journal-2">{stamp(post.date)}</time>
          <span>
            <span class="block font-serif text-step-1 font-semibold text-ink">{post.title}</span>
            {#if post.description}
              <span class="mt-1 block max-w-3xl text-step--1 leading-relaxed text-journal-1"
                >{post.description}</span
              >
            {/if}
            {#if post.tags.length > 0}
              <span class="mt-2 flex flex-wrap gap-1.5">
                {#each post.tags as tag (tag)}
                  <span class="border border-journal-2 px-2 py-0.5 font-mono text-[0.64rem] tracking-wide text-journal-1"
                    >{tag}</span
                  >
                {/each}
              </span>
            {/if}
          </span>
          <span class="font-mono text-ink opacity-0 transition-opacity group-hover:opacity-100">→</span>
        </a>
      </li>
    {:else}
      <li class="border-b border-journal-3 py-14 text-center font-mono text-step--1 uppercase tracking-wider text-journal-1">
        No entries tagged “{activeTag}”.
      </li>
    {/each}
  </ul>
</section>
