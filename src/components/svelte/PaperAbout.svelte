<script lang="ts">
import { ABOUT_PARAGRAPHS } from "@/data/aboutData";
import Modal from "../primitives/Modal.svelte";
import { SKILL_GROUPS } from "@/data/skillsPresentation";
import resumeUrl from "@/assets/files/resume.pdf?url";

let skillQuery = $state("");
let tShapeOpen = $state(false);
const T_SHAPED_LABEL = "T-shaped engineer";

// First paragraph (LEGO/hobbies intro) is home-page-only; skip it and its blank spacer here.
const pageParagraphs = ABOUT_PARAGRAPHS.slice(1).filter(Boolean);

const skillGroups = $derived(
  SKILL_GROUPS.map((group) => ({
    ...group,
    skills: group.skills.filter((skill) =>
      `${group.type} ${skill.name}`
        .toLocaleLowerCase()
        .includes(skillQuery.trim().toLocaleLowerCase()),
    ),
  })).filter((group) => group.skills.length > 0),
);

const PASTELS = [
  "bg-pastel-sage",
  "bg-pastel-dust",
  "bg-pastel-rose",
  "bg-pastel-butter",
];

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

<section
  id="about"
  class="relative w-full py-12 md:py-16"
  {@attach revealOnView}
>
  <div
    data-section-id="about"
    aria-hidden="true"
    class="pointer-events-none absolute inset-0"
  ></div>

  <div
    class="relative z-10 mx-auto w-full max-w-[var(--content-max)] px-4 sm:px-6"
  >
    <header class="rv mb-8 flex items-baseline gap-4">
      <span class="font-mono text-step--1 text-journal-2">02</span>
      <h2 class="font-serif text-step-2 font-semibold tracking-tight text-ink">
        about
      </h2>
      <span class="h-px flex-1 -translate-y-1 bg-journal-3"></span>
      <span
        class="font-mono text-step--1 uppercase tracking-wider text-journal-2"
        >field notes</span
      >
    </header>

    <ol data-ink-obstacle="prose" class="mb-10 max-w-4xl space-y-5">
      {#each pageParagraphs as text, i (text)}
        <li
          class="rv flex items-baseline gap-5"
          style={"transition-delay: " + i * 90 + "ms"}
        >
          <span class="shrink-0 font-mono text-step--1 text-journal-2"
            >{String.fromCharCode(97 + i)}.</span
          >
          {#if text.includes(T_SHAPED_LABEL)}
            {@const tShapeIndex = text.indexOf(T_SHAPED_LABEL)}
            <p class="font-serif text-step-1 leading-relaxed text-ink-soft">
              {text.slice(0, tShapeIndex)}
              <button
                type="button"
                class="u-draw cursor-help font-serif text-step-1 text-ink underline decoration-2 decoration-pastel-rose underline-offset-4 hover:text-ink-soft"
                onclick={() => (tShapeOpen = true)}
                onfocus={() => (tShapeOpen = true)}
                >{T_SHAPED_LABEL}</button
              >{text.slice(tShapeIndex + T_SHAPED_LABEL.length)}
            </p>
          {:else}
            <p class="font-serif text-step-1 leading-relaxed text-ink-soft">
              {text}
            </p>
          {/if}
        </li>
      {/each}
    </ol>

    <hr class="rv mb-10 border-0 border-t border-dashed border-journal-2" />

    <div class="rv mb-7 flex items-baseline gap-4">
      <h3
        class="font-mono text-step--1 uppercase tracking-wider text-journal-1"
      >
        toolbox
      </h3>
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

    <label data-ink-obstacle="controls" class="rv mb-6 block max-w-sm">
      <span
        class="mb-1 block font-mono text-[0.68rem] uppercase tracking-wider text-journal-1"
        >filter toolbox</span
      >
      <input
        bind:value={skillQuery}
        placeholder="language, framework, tool…"
        class="w-full border-[1.5px] border-ink bg-paper-raised px-3 py-2 font-mono text-step--1 text-ink placeholder:text-journal-2"
      />
    </label>

    <div data-ink-obstacle="content" class="space-y-4">
      {#each skillGroups as group, g (group.type)}
        <div
          class="rv flex flex-wrap items-baseline gap-x-6 gap-y-3"
          style={"transition-delay: " + g * 90 + "ms"}
        >
          <span
            class="w-44 shrink-0 font-mono text-step--1 uppercase tracking-wider text-journal-1"
            >{group.type}</span
          >
          <span class="flex flex-wrap gap-2">
            {#each group.skills as skill, s (skill.name)}
              <span
                class="border border-ink px-2.5 py-0.5 font-mono text-step--1 tracking-wide text-ink {PASTELS[
                  (g + s) % PASTELS.length
                ]}"
              >
                {skill.name}
              </span>
            {/each}
          </span>
        </div>
      {/each}
    </div>
  </div>

  {#if tShapeOpen}
    <Modal
      open={true}
      title="T-shaped engineer"
      size="wide"
      dismissOnMouseLeave={true}
      onClose={() => (tShapeOpen = false)}
    >
      <div
        class="grid place-items-center gap-5 sm:grid-cols-[minmax(0,54%)_minmax(0,1fr)]"
      >
        <img
          src="/assets/images/t-shaped.png"
          alt="Diagram of T-shaped engineering breadth and depth"
          class="aspect-[704/444] h-auto w-full max-w-none border border-journal-3 bg-paper-raised object-contain"
        />
        <p
          class="text-center text-step-0 leading-relaxed text-journal-1 sm:text-left"
        >
          combines broad working knowledge across disciplines with deep
          expertise in a focused area. The horizontal bar represents breadth;
          the vertical stem represents the depth needed to build, reason, and
          collaborate well. The only thing missing... a big fat mini gun.
        </p>
      </div>
    </Modal>
  {/if}
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
