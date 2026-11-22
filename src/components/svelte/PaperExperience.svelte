<script lang="ts">
import { EXPERIENCE_ITEMS } from "../../data/experienceData";
import type {
  ExperienceCompany,
  ExperienceJob,
  ExperienceTag,
} from "../../data/experienceData";
import Chip from "../primitives/Chip.svelte";
import InkLink from "../primitives/InkLink.svelte";
import Section from "../primitives/Section.svelte";
import SectionHeader from "../primitives/SectionHeader.svelte";
import { PASTEL_BG, toneFor } from "../../design-system/tone";

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
</script>

<Section id="experience">
    <SectionHeader index="06" title="experience" kicker="work ledger" />

    <ol data-ink-obstacle="prose" class="ml-2 max-w-4xl border-l-[1.5px] border-ink">
      {#each jobs as job (job.id)}
        <li class="relative pb-10 pl-8 last:pb-0">
          <span
            class="absolute top-1 -left-[6px] h-[11px] w-[11px] border-[1.5px] border-ink {PASTEL_BG[toneFor(job.company)]}"
          ></span>

          <div class="mb-2 flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <time class="label-mono text-journal-2">{job.date}</time>
            {#if job.companyUrl}
              <InkLink href={job.companyUrl} tone="muted">{job.company}</InkLink>
            {:else}
              <span class="label-mono text-journal-1">{job.company}</span>
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
                <Chip href={tag.url} title={tag.tooltip}>{tag.name}</Chip>
              {/each}
            </div>
          {/if}
        </li>
      {/each}
    </ol>
</Section>
