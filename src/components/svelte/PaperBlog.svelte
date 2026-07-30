<script lang="ts">
import ArrowRightIcon from "../primitives/ArrowRightIcon.svelte";

type BlogPost = {
  slug: string;
  title: string;
  description: string;
  date: Date;
  draft?: boolean;
  tags?: string[];
  cover?: string;
};

let { posts }: { posts: BlogPost[] } = $props();

function stamp(d: Date | string): string {
  const date = d instanceof Date ? d : new Date(d);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}·${mm}·${dd}`;
}
</script>

<section id="blog" class="relative w-full py-12 md:py-16">
  <div data-section-id="blog" aria-hidden="true" class="pointer-events-none absolute inset-0"></div>

  <div class="relative z-10 mx-auto w-full max-w-[var(--content-max)] px-4 sm:px-6">
    <header class="mb-8 flex items-baseline gap-4">
      <span class="font-mono text-step--1 text-journal-2">03</span>
      <h2 class="font-serif text-step-2 font-semibold tracking-tight text-ink">blog</h2>
      <span class="h-px flex-1 -translate-y-1 bg-journal-3"></span>
      <span class="font-mono text-step--1 uppercase tracking-wider text-journal-2">recent writing</span>
    </header>

    <ul class="border-t border-journal-3">
      {#each posts as post (post.slug)}
        <li class="border-b border-journal-3">
          <a href="/blog/{post.slug}" class="group flex items-baseline gap-5 px-1 py-3 no-underline transition-all duration-200 hover:bg-journal-4 hover:pl-4">
            <span class="w-24 shrink-0 font-mono text-step--1 text-journal-2">{stamp(post.date)}</span>
            <span class="flex-1 font-serif text-step-1 font-medium text-ink">{post.title}</span>
            <span class="font-mono text-ink opacity-0 transition-opacity group-hover:opacity-100"><ArrowRightIcon /></span>
          </a>
        </li>
      {/each}
    </ul>

    <div class="mt-7 flex justify-end">
      <a href="/blog" class="gleam lift inline-flex items-center gap-2 border-[1.5px] border-ink bg-paper-raised px-5 py-2.5 font-mono text-step--1 uppercase tracking-wider text-ink no-underline shadow-hard">
        all posts <ArrowRightIcon />
      </a>
    </div>
  </div>
</section>
