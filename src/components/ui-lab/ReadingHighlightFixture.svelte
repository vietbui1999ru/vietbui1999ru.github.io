<script lang="ts">
import experience from "../../data/experience.json";
import { installReadingHighlight } from "../../lib/reading-highlight-dom";

// /ui-lab fixture for the reading highlight prototype (#39): the first About entry.
// Only the content paragraph has data-read-hl, so the title and date keep their look.
const job = experience.items[0].jobs[0];
</script>

<section class="page-container py-section" {@attach installReadingHighlight}>
  <time class="label-mono text-journal-2">{job.date}</time>
  <h3 class="mb-2 font-serif text-step-1 font-semibold text-ink">{job.name}</h3>
  <p data-read-hl class="max-w-3xl text-step--1 leading-relaxed text-journal-1">{job.content}</p>
</section>
