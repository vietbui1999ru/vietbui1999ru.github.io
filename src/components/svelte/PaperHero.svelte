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

<section id="home" class="relative flex min-h-screen w-full items-center justify-center">
  <!-- Paper veil over the r3f canvas behind (canvas sits at z-index -10). -->
  <div
    aria-hidden="true"
    class="pointer-events-none fixed inset-0 z-0 bg-gradient-to-b from-paper via-paper/85 to-paper/60"
  ></div>
  <div data-section-id="home" aria-hidden="true" class="pointer-events-none absolute inset-0"></div>

  <div class="relative z-10 max-w-3xl space-y-5 px-4 text-center">
    <p class="reveal font-mono text-step--1 uppercase tracking-widest text-journal-1">
      <span>portfolio · field notes</span>
    </p>

    <h1 class="reveal font-serif text-step-4 leading-[1.04] font-semibold tracking-tight text-ink">
      <span>
        {introBefore}{#if showName}<em class="shimmer-text font-medium italic">{firstName}</em>{/if}
      </span>
    </h1>

    <p class="reveal text-step-1 text-journal-1"><span>{ABOUT_TAGLINE}</span></p>

    <div class="reveal flex flex-col items-center gap-4 pt-2">
      <span class="flex flex-col items-center justify-center gap-3 sm:flex-row">
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
          class="inline-flex items-center gap-2 border border-ink bg-pastel-sage px-3 py-1 font-mono text-[0.7rem] uppercase tracking-wider text-ink"
        >
          <span class="relative flex h-2 w-2">
            <span class="absolute inline-flex h-full w-full animate-ping bg-ink opacity-50"></span>
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
  .reveal > span {
    display: inline-block;
    transform: translateY(110%);
    animation: rise 1s var(--ease-out-expo) forwards;
  }
  .reveal:nth-child(2) > span {
    animation-delay: 0.12s;
  }
  .reveal:nth-child(3) > span {
    animation-delay: 0.24s;
  }
  .reveal:nth-child(4) > span,
  .reveal:nth-child(4) {
    animation-delay: 0.36s;
  }
  @keyframes rise {
    to {
      transform: translateY(0);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .reveal > span {
      transform: none;
      animation: none;
    }
  }
</style>
