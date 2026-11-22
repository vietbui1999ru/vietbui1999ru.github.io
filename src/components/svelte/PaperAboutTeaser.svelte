<script lang="ts">
import { ABOUT_PARAGRAPHS, ABOUT_TAGLINE } from "../../data/aboutData";
import Section from "../primitives/Section.svelte";
import SectionHeader from "../primitives/SectionHeader.svelte";
import InkLink from "../primitives/InkLink.svelte";

// Leave empty to show the "insert portrait" placeholder.
const PROFILE_IMAGE = "/assets/images/self_portrait.png";
</script>

<Section id="about" sentinel={false}>
  <SectionHeader index="02" title="about" class="mb-6" />

  <div class="grid gap-7 md:grid-cols-[minmax(10rem,14rem)_minmax(0,1fr)] md:items-center md:gap-10">
    <div
      class="mx-auto grid aspect-square w-40 place-items-center overflow-hidden rounded-full border-[1.5px] border-ink bg-paper-raised text-center shadow-hard-sm sm:w-48 md:mx-0"
      role="img"
      aria-label={PROFILE_IMAGE ? "Portrait of Viet Bui" : "Portrait placeholder"}
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
    <InkLink href="/about" arrow="forward">full profile</InkLink>
  </div>
</Section>
