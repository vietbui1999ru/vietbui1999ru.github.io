<script lang="ts">
import { OWNER } from "@/config/owner";
import { ABOUT_TAGLINE } from "@/data/aboutData";

// Split the intro ("Hi, I'm Viet") so the first name gets the shimmer emphasis.
const firstName = OWNER.name.split(" ")[0];
const introBefore = OWNER.intro.includes(firstName)
  ? OWNER.intro.slice(0, OWNER.intro.lastIndexOf(firstName))
  : OWNER.intro;
const showName = OWNER.intro.includes(firstName);
</script>

<section
  id="home"
  class="relative flex min-h-[78svh] w-full items-center justify-center md:min-h-[calc(100svh-5rem)]"
>
  <div
    data-section-id="home"
    aria-hidden="true"
    class="pointer-events-none absolute inset-0"
  ></div>

  <div data-ink-obstacle="content" class="relative z-10 max-w-3xl space-y-5 px-4 text-center">
    <p
      class="reveal font-mono text-step--1 uppercase tracking-widest text-journal-1"
    >
      <span class="reveal-text">portfolio · field notes</span>
    </p>

    <h1
      class="reveal font-serif text-step-4 leading-[1.04] font-semibold tracking-tight text-ink"
    >
      <span class="reveal-text">
        {introBefore}{#if showName}<em class="font-medium italic"
            >{firstName}</em
          >{/if}
      </span>
    </h1>

    <p class="reveal text-step-1 leading-relaxed text-journal-1">
      <span class="reveal-text">{ABOUT_TAGLINE}</span>
    </p>

    <div class="reveal flex flex-col items-center gap-7 pt-1">
      <span
        class="reveal-layout flex flex-col items-center justify-center gap-20 sm:flex-row sm:gap-24"
      >
        <a
          href={OWNER.social.github.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="View Viet Bui's GitHub profile"
          class="gleam lift border-[1.5px] border-ink bg-paper-raised px-5 py-2.5 font-mono text-step--1 uppercase tracking-wider text-ink no-underline shadow-hard"
        >
          {OWNER.social.github.label} ↗
        </a>
        <a
          href={OWNER.social.gitlab.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="View Viet Bui's GitLab profile"
          class="gleam lift border-[1.5px] border-ink bg-paper-raised px-5 py-2.5 font-mono text-step--1 uppercase tracking-wider text-ink no-underline shadow-hard"
        >
          {OWNER.social.gitlab.label} ↗
        </a>
      </span>

      {#if OWNER.availability.open}
        <span
          class="reveal-badge inline-flex items-center gap-2 whitespace-nowrap border border-ink bg-pastel-sage px-3 py-1 font-mono text-[0.65rem] uppercase tracking-wider text-ink"
        >
          <span class="relative flex h-2 w-2">
            <span
              class="absolute inline-flex h-full w-full animate-ping bg-ink opacity-50"
            ></span>
            <span class="relative inline-flex h-2 w-2 bg-ink"></span>
          </span>
          {OWNER.availability.text}
        </span>
      {/if}
    </div>
  </div>
</section>

<style>
  /* Fluid reveal — lines of type rise on load (matches design artifact) */
  .reveal {
    overflow: hidden;
  }
  .reveal > .reveal-text {
    display: inline-block;
    transform: translateY(110%);
    animation: rise 1s var(--ease-out-expo) forwards;
  }
  .reveal > .reveal-layout,
  .reveal > .reveal-badge {
    transform: translateY(110%);
    animation: rise 1s var(--ease-out-expo) forwards;
  }
  .reveal:nth-child(2) > .reveal-text {
    animation-delay: 0.12s;
  }
  .reveal:nth-child(3) > .reveal-text {
    animation-delay: 0.24s;
  }
  .reveal:nth-child(4) > .reveal-layout,
  .reveal:nth-child(4) > .reveal-badge {
    animation-delay: 0.36s;
  }
  @keyframes rise {
    to {
      transform: translateY(0);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .reveal > .reveal-text,
    .reveal > .reveal-layout,
    .reveal > .reveal-badge {
      transform: none;
      animation: none;
    }
  }
</style>
