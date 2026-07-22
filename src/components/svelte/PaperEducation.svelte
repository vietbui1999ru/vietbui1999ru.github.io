<script lang="ts">
import { EDUCATION_ITEMS } from "../../data/educationData";

const PASTELS = ["bg-pastel-dust", "bg-pastel-rose"];
</script>

<section id="education" class="relative w-full py-24">
  <div data-section-id="education" aria-hidden="true" class="pointer-events-none absolute inset-0"></div>

  <div class="relative z-10 mx-auto w-full max-w-[var(--content-max)] px-4 sm:px-6">
    <header class="mb-12 flex items-baseline gap-4">
      <span class="font-mono text-step--1 text-journal-2">07</span>
      <h2 class="font-serif text-step-2 font-semibold tracking-tight text-ink">education</h2>
      <span class="h-px flex-1 -translate-y-1 bg-journal-3"></span>
      <span class="font-mono text-step--1 uppercase tracking-wider text-journal-2"
        >academic record</span
      >
    </header>

    <ol class="ml-2 max-w-5xl border-l-[1.5px] border-ink">
      {#each EDUCATION_ITEMS as item, i (item.title)}
        <li class="relative pb-14 pl-8 last:pb-0">
          <span
            class="absolute top-1 -left-[6px] h-[11px] w-[11px] border-[1.5px] border-ink {PASTELS[i % PASTELS.length]}"
          ></span>

          <time class="font-mono text-step--1 uppercase tracking-wider text-journal-2"
            >{item.date}</time
          >
          <h3 class="mt-2 font-serif text-step-1 font-semibold text-ink">{item.title}</h3>
          <a
            href={item.school.url}
            target="_blank"
            rel="noopener noreferrer"
            class="u-draw mt-1 inline-block font-mono text-step--1 uppercase tracking-wider text-journal-1 no-underline"
            >{item.school.name} ↗</a
          >

          {#if item.columns && item.columns.length > 0}
            <div class="mt-5 grid gap-x-8 gap-y-2 sm:grid-cols-2">
              {#each item.columns as column, columnIndex (`${item.title}-${columnIndex}`)}
                <ul class="space-y-1.5">
                  {#each column as course (course)}
                    <li class="flex gap-2 text-step--1 leading-relaxed text-journal-1">
                      <span class="font-mono text-journal-2">—</span>
                      <span>{course}</span>
                    </li>
                  {/each}
                </ul>
              {/each}
            </div>
          {:else if item.content}
            <p class="mt-4 max-w-3xl whitespace-pre-line text-step--1 leading-relaxed text-journal-1">
              {item.content}
            </p>
          {/if}

          <div class="mt-4 flex flex-wrap items-center gap-4">
            {#if item.GPA}
              <span class="border border-ink bg-pastel-butter px-2 py-0.5 font-mono text-[0.68rem] uppercase tracking-wide text-ink"
                >GPA {item.GPA}</span
              >
            {/if}
            {#if item.featuredLink?.enable && item.featuredLink.url}
              <a
                href={item.featuredLink.url}
                target="_blank"
                rel="noopener noreferrer"
                class="u-draw font-mono text-step--1 uppercase tracking-wider text-ink no-underline"
                >{item.featuredLink.name ?? "view program"} ↗</a
              >
            {/if}
          </div>
        </li>
      {/each}
    </ol>
  </div>
</section>
