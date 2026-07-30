<script lang="ts">
import { EXPERIENCE_ITEMS } from "../../data/experienceData";
import type { ExperienceCompany, ExperienceJob, ExperienceTag } from "../../data/experienceData";

type TimelineJob = {
  id: string;
  company: string;
  companyUrl?: string;
  title: string;
  date: string;
  content: string;
  tags: ExperienceTag[];
};

function collect(company: ExperienceCompany, output: TimelineJob[]) {
  for (const [index, entry] of company.jobs.entries()) {
    if ("jobs" in entry) {
      collect(entry, output);
      continue;
    }

    const job = entry as ExperienceJob;
    if (!job.name?.trim()) continue;
    output.push({
      id: `${company.company}-${index}-${job.name}`,
      company: company.company,
      companyUrl: company.companyUrl,
      title: job.name,
      date: job.date ?? "",
      content: job.content ?? "",
      tags: job.tags ?? [],
    });
  }
}

const jobs: TimelineJob[] = [];
EXPERIENCE_ITEMS.forEach((company) => collect(company, jobs));
const PASTELS = ["bg-pastel-sage", "bg-pastel-dust", "bg-pastel-rose", "bg-pastel-butter"];
</script>

<section id="experience" class="relative w-full py-24">
  <div data-section-id="experience" aria-hidden="true" class="pointer-events-none absolute inset-0"></div>

  <div class="relative z-10 mx-auto w-full max-w-[var(--content-max)] px-4 sm:px-6">
    <header class="mb-12 flex items-baseline gap-4">
      <span class="font-mono text-step--1 text-journal-2">06</span>
      <h2 class="font-serif text-step-2 font-semibold tracking-tight text-ink">experience</h2>
      <span class="h-px flex-1 -translate-y-1 bg-journal-3"></span>
      <span class="font-mono text-step--1 uppercase tracking-wider text-journal-2"
        >work ledger</span
      >
    </header>

    <ol class="ml-2 max-w-4xl border-l-[1.5px] border-ink">
      {#each jobs as job, i (job.id)}
        <li class="relative pb-12 pl-8 last:pb-0">
          <span
            class="absolute top-1 -left-[6px] h-[11px] w-[11px] border-[1.5px] border-ink {PASTELS[i % PASTELS.length]}"
          ></span>

          <div class="mb-2 flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <time class="font-mono text-step--1 uppercase tracking-wider text-journal-2"
              >{job.date}</time
            >
            {#if job.companyUrl}
              <a
                href={job.companyUrl}
                target="_blank"
                rel="noopener noreferrer"
                class="u-draw font-mono text-step--1 uppercase tracking-wider text-journal-1 no-underline"
                >{job.company} ↗</a
              >
            {:else}
              <span class="font-mono text-step--1 uppercase tracking-wider text-journal-1"
                >{job.company}</span
              >
            {/if}
          </div>

          <h3 class="mb-2 font-serif text-step-1 font-semibold text-ink">{job.title}</h3>
          {#if job.content}
            <p class="max-w-3xl whitespace-pre-line text-step--1 leading-relaxed text-journal-1">
              {job.content}
            </p>
          {/if}

          {#if job.tags.length > 0}
            <div class="mt-4 flex flex-wrap gap-2">
              {#each job.tags as tag (tag.name)}
                {#if tag.url}
                  <a
                    href={tag.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={tag.tooltip}
                    class="border border-ink px-2 py-0.5 font-mono text-[0.68rem] tracking-wide text-ink no-underline"
                    >{tag.name} ↗</a
                  >
                {:else}
                  <span
                    title={tag.tooltip}
                    class="border border-ink px-2 py-0.5 font-mono text-[0.68rem] tracking-wide text-ink"
                    >{tag.name}</span
                  >
                {/if}
              {/each}
            </div>
          {/if}
        </li>
      {/each}
    </ol>
  </div>
</section>
