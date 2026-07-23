<script lang="ts">
import type { SerializedPost } from "../../data/blogData";

let { posts }: { posts: SerializedPost[] } = $props();
let activeTag = $state<string | null>(null);
let query = $state("");
let sort = $state<"date" | "title">("date");

const tags = $derived([...new Set(posts.flatMap((post) => post.tags))].sort());
const filteredPosts = $derived.by(() => {
  const needle = query.trim().toLocaleLowerCase();
  return [...posts]
    .filter((post) => {
      const haystack =
        `${post.title} ${post.description} ${post.tags.join(" ")}`.toLocaleLowerCase();
      return (
        (!activeTag || post.tags.includes(activeTag)) &&
        (!needle || haystack.includes(needle))
      );
    })
    .toSorted((a, b) =>
      sort === "title"
        ? a.title.localeCompare(b.title)
        : new Date(b.date).valueOf() - new Date(a.date).valueOf(),
    );
});

function stamp(iso: string): string {
  const date = new Date(iso);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}·${mm}·${dd}`;
}
</script>

<section class="mx-auto w-full max-w-[var(--content-max)] px-4 py-16 sm:px-6 md:py-20">
  <a href="/" class="u-draw mb-8 inline-block font-mono text-step--1 uppercase tracking-wider text-journal-1 no-underline">← portfolio</a>

  <header class="mb-8 flex flex-wrap items-baseline gap-4">
    <span class="font-mono text-step--1 text-journal-2">archive</span>
    <h1 class="font-serif text-step-3 font-semibold tracking-tight text-ink">field notes</h1>
    <span class="h-px min-w-12 flex-1 -translate-y-1 bg-journal-3"></span>
    <span class="font-mono text-step--1 uppercase tracking-wider text-journal-2">{filteredPosts.length} / {posts.length}</span>
  </header>

  <div class="mb-8 flex flex-wrap items-end gap-3 border-b border-journal-3 pb-5">
    <label class="min-w-56 flex-1">
      <span class="mb-1 block font-mono text-[0.68rem] uppercase tracking-wider text-journal-1">search writing</span>
      <input bind:value={query} placeholder="title, description, tag…" class="w-full border-[1.5px] border-ink bg-paper-raised px-3 py-2 font-mono text-step--1 text-ink placeholder:text-journal-2" />
    </label>
    <label>
      <span class="mb-1 block font-mono text-[0.68rem] uppercase tracking-wider text-journal-1">sort</span>
      <select bind:value={sort} class="border-[1.5px] border-ink bg-paper-raised px-3 py-2 font-mono text-step--1 text-ink">
        <option value="date">newest</option>
        <option value="title">title</option>
      </select>
    </label>
  </div>

  {#if tags.length > 0}
    <div class="mb-8 flex flex-wrap gap-2" aria-label="Filter posts by tag">
      <button type="button" aria-pressed={activeTag === null} onclick={() => (activeTag = null)} class={["cursor-pointer border border-ink px-3 py-1 font-mono text-[0.7rem] uppercase tracking-wider transition-colors", activeTag === null ? "bg-ink text-paper" : "bg-paper-raised text-ink hover:bg-journal-4"]}>all</button>
      {#each tags as tag (tag)}
        <button type="button" aria-pressed={activeTag === tag} onclick={() => (activeTag = activeTag === tag ? null : tag)} class={["cursor-pointer border border-ink px-3 py-1 font-mono text-[0.7rem] uppercase tracking-wider transition-colors", activeTag === tag ? "bg-pastel-butter text-ink" : "bg-paper-raised text-ink hover:bg-journal-4"]}>{tag}</button>
      {/each}
    </div>
  {/if}

  <ul class="border-t-[1.5px] border-ink">
    {#each filteredPosts as post (post.slug)}
      <li class="border-b border-journal-3">
        <a href="/blog/{post.slug}" class="group grid gap-2 px-1 py-4 no-underline transition-all duration-200 hover:bg-journal-4 hover:pl-4 sm:grid-cols-[7rem_1fr_auto] sm:items-baseline sm:gap-5">
          <time class="font-mono text-step--1 text-journal-2">{stamp(post.date)}</time>
          <span>
            <span class="block font-serif text-step-1 font-semibold text-ink">{post.title}</span>
            {#if post.description}<span class="mt-1 block max-w-4xl text-step--1 leading-relaxed text-journal-1">{post.description}</span>{/if}
            {#if post.tags.length > 0}<span class="mt-2 flex flex-wrap gap-1.5">{#each post.tags as tag (tag)}<span class="border border-journal-2 px-2 py-0.5 font-mono text-[0.64rem] tracking-wide text-journal-1">{tag}</span>{/each}</span>{/if}
          </span>
          <span class="font-mono text-ink opacity-0 transition-opacity group-hover:opacity-100">→</span>
        </a>
      </li>
    {:else}
      <li class="border-b border-journal-3 py-14 text-center font-mono text-step--1 uppercase tracking-wider text-journal-1">No entries match the current filters.</li>
    {/each}
  </ul>
</section>
