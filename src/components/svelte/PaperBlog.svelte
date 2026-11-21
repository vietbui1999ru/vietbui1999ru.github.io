<script lang="ts">
import ArrowRightIcon from "../primitives/ArrowRightIcon.svelte";
import Button from "../primitives/Button.svelte";
import Section from "../primitives/Section.svelte";
import SectionHeader from "../primitives/SectionHeader.svelte";

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

<Section id="blog">
  <SectionHeader index="03" title="blog" kicker="recent writing" />

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
    <Button href="/blog" variant="raised">all posts <ArrowRightIcon /></Button>
  </div>
</Section>
