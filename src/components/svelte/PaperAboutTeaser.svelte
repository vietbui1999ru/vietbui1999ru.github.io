<script lang="ts">
import { ABOUT_PARAGRAPHS, ABOUT_TAGLINE } from "../../data/aboutData";
</script>

<section id="about" class="relative w-full py-16 md:py-20">
  <div class="mx-auto grid w-full max-w-[var(--content-max)] gap-8 px-4 sm:px-6 md:grid-cols-[minmax(0,1fr)_minmax(16rem,24rem)] md:items-end">
    <div>
      <header class="mb-5 flex items-baseline gap-4">
        <span class="font-mono text-step--1 text-journal-2">02</span>
        <h2 class="font-serif text-step-2 font-semibold tracking-tight text-ink">about</h2>
        <span class="h-px flex-1 -translate-y-1 bg-journal-3"></span>
      </header>
      <p class="max-w-3xl font-serif text-step-1 leading-relaxed text-ink">{ABOUT_TAGLINE}</p>
      <p class="mt-4 max-w-2xl text-step--1 leading-relaxed text-journal-1">{ABOUT_PARAGRAPHS[0]} {ABOUT_PARAGRAPHS[1]}.</p>
    </div>
    <div class="flex items-end justify-between gap-4 border-t border-journal-3 pt-4 md:block md:border-l md:border-t-0 md:pl-6 md:pt-0">
      <span class="font-mono text-[0.68rem] uppercase tracking-wider text-journal-2">languages · systems · simulations</span>
      <a href="/about" class="u-draw mt-3 inline-block font-mono text-step--1 uppercase tracking-wider text-ink no-underline">full profile →</a>
    </div>
  </div>
</section>
