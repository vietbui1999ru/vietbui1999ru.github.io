<script lang="ts">
  import { ABOUT_PARAGRAPHS, SKILLS_CATEGORIES } from "@/data/aboutData";
  import resumeUrl from "@/assets/files/resume.pdf?url";

  const PASTELS = ["bg-pastel-sage", "bg-pastel-dust", "bg-pastel-rose", "bg-pastel-butter"];

  // Scroll-into-view reveal: adds .in-view once, then stops observing.
  function revealOnView(node: HTMLElement) {
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            io.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.2 },
    );
    node.querySelectorAll(".rv").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }
</script>

<section id="about" class="relative w-full py-24" {@attach revealOnView}>
  <div data-section-id="about" aria-hidden="true" class="pointer-events-none absolute inset-0"></div>

  <div class="relative z-10 mx-auto w-full max-w-[var(--content-max)] px-4 sm:px-6">
    <header class="rv mb-12 flex items-baseline gap-4">
      <span class="font-mono text-step--1 text-journal-2">02</span>
      <h2 class="font-serif text-step-2 font-semibold tracking-tight text-ink">about</h2>
      <span class="h-px flex-1 -translate-y-1 bg-journal-3"></span>
      <span class="font-mono text-step--1 uppercase tracking-wider text-journal-2">field notes</span>
    </header>

    <ol class="mb-14 max-w-3xl space-y-8">
      {#each ABOUT_PARAGRAPHS as text, i (text)}
        <li class="rv flex items-baseline gap-5" style="transition-delay: {i * 90}ms">
          <span class="shrink-0 font-mono text-step--1 text-journal-2"
            >{String.fromCharCode(97 + i)}.</span
          >
          <p class="font-serif text-step-1 leading-snug text-ink-soft">{text}</p>
        </li>
      {/each}
    </ol>

    <hr class="rv mb-14 border-0 border-t border-dashed border-journal-2" />

    <div class="rv mb-10 flex items-baseline gap-4">
      <h3 class="font-mono text-step--1 uppercase tracking-wider text-journal-1">toolbox</h3>
      <span class="h-px flex-1 -translate-y-1 bg-journal-3"></span>
      <a
        href={resumeUrl}
        target="_blank"
        rel="noopener noreferrer"
        class="gleam lift border-[1.5px] border-ink bg-paper-raised px-4 py-1.5 font-mono text-step--1 uppercase tracking-wider text-ink no-underline shadow-hard-sm"
      >
        résumé ↗
      </a>
    </div>

    <div class="space-y-6">
      {#each SKILLS_CATEGORIES as group, g (group.type)}
        <div class="rv flex flex-wrap items-baseline gap-x-6 gap-y-3" style="transition-delay: {g * 90}ms">
          <span class="w-44 shrink-0 font-mono text-step--1 uppercase tracking-wider text-journal-2"
            >{group.type}</span
          >
          <span class="flex flex-wrap gap-2">
            {#each group.skills as skill, s (skill.name)}
              <span class="border border-ink px-2.5 py-0.5 font-mono text-[0.72rem] tracking-wide text-ink {PASTELS[(g + s) % PASTELS.length]}">
                {skill.name}
              </span>
            {/each}
          </span>
        </div>
      {/each}
    </div>
  </div>
</section>

<style>
  .rv {
    opacity: 0;
    transform: translateY(16px);
    transition:
      opacity 0.7s var(--ease-out-expo),
      transform 0.7s var(--ease-out-expo);
  }
  .rv.in-view {
    opacity: 1;
    transform: none;
  }
  @media (prefers-reduced-motion: reduce) {
    .rv {
      opacity: 1;
      transform: none;
      transition: none;
    }
  }
</style>
