<script lang="ts">
import { ABOUT_PARAGRAPHS, ABOUT_TAGLINE } from "../../data/aboutData";

// Replace with a local portrait asset when ready, for example:
// const PROFILE_IMAGE = "/assets/images/viet-bui.jpg";
const PROFILE_IMAGE = "";
</script>

<section id="about" class="relative w-full py-12 md:py-16">
  <div class="mx-auto w-full max-w-[var(--content-max)] px-4 sm:px-6">
    <header class="mb-6 flex items-baseline gap-4">
      <span class="font-mono text-step--1 text-journal-2">02</span>
      <h2 class="font-serif text-step-2 font-semibold tracking-tight text-ink">about</h2>
      <span class="h-px flex-1 -translate-y-1 bg-journal-3"></span>
    </header>

    <div class="grid gap-7 md:grid-cols-[minmax(10rem,14rem)_minmax(0,1fr)] md:items-center md:gap-10">
      <div
        class="mx-auto grid aspect-square w-40 place-items-center overflow-hidden rounded-full border-[1.5px] border-ink bg-paper-raised text-center shadow-hard-sm sm:w-48 md:mx-0"
        role="img"
        aria-label="Portrait placeholder"
      >
        {#if PROFILE_IMAGE}
          <img src={PROFILE_IMAGE} alt="Viet Bui" class="h-full w-full object-cover" />
        {:else}
          <span class="px-5 font-mono text-[0.65rem] uppercase leading-relaxed tracking-wider text-journal-1">insert<br />portrait</span>
        {/if}
      </div>

      <div class="max-w-4xl">
        <p class="font-serif text-step-2 leading-tight text-ink">{ABOUT_TAGLINE}</p>
        <p class="mt-3 text-step-0 leading-relaxed text-journal-1">{ABOUT_PARAGRAPHS[0]} {ABOUT_PARAGRAPHS[1]}.</p>
      </div>
    </div>

    <div class="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-journal-3 pt-4">
      <span class="font-mono text-[0.68rem] uppercase tracking-wider text-journal-2">languages · systems · simulations</span>
      <a href="/about" class="u-draw font-mono text-step--1 uppercase tracking-wider text-ink no-underline">full profile →</a>
    </div>
  </div>
</section>
