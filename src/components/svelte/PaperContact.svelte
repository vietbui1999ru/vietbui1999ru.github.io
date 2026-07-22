<script lang="ts">
import { OWNER } from "../../config/owner";
import { CONTACT_CONTENT } from "../../data/contactData";
</script>

<section id="contact" class="relative flex min-h-[70vh] w-full flex-col py-24">
  <div data-section-id="contact" aria-hidden="true" class="pointer-events-none absolute inset-0"></div>

  <div class="relative z-10 mx-auto w-full max-w-[var(--content-max)] flex-1 px-4 sm:px-6">
    <header class="mb-12 flex items-baseline gap-4">
      <span class="font-mono text-step--1 text-journal-2">08</span>
      <h2 class="font-serif text-step-2 font-semibold tracking-tight text-ink">contact</h2>
      <span class="h-px flex-1 -translate-y-1 bg-journal-3"></span>
      <span class="font-mono text-step--1 uppercase tracking-wider text-journal-2"
        >open channel</span
      >
    </header>

    <div class="max-w-4xl">
      <p class="mb-10 font-serif text-step-2 leading-tight text-ink-soft">{CONTACT_CONTENT}</p>

      <a
        href="mailto:{OWNER.email}"
        class="gleam lift mb-8 inline-flex border-[1.5px] border-ink bg-ink px-6 py-3 font-mono text-step-0 tracking-wide text-paper no-underline shadow-[4px_4px_0_var(--grey-2)]"
      >
        {OWNER.email} ↗
      </a>

      <div class="flex flex-wrap gap-4">
        <a
          href={OWNER.social.linkedin.url}
          target="_blank"
          rel="noopener noreferrer"
          class="u-draw font-mono text-step--1 uppercase tracking-wider text-ink no-underline"
          >linkedin ↗</a
        >
        <a
          href={OWNER.social.discord.url}
          target="_blank"
          rel="noopener noreferrer"
          class="u-draw font-mono text-step--1 uppercase tracking-wider text-ink no-underline"
          >discord ↗</a
        >
        <a
          href={OWNER.social.github.url}
          target="_blank"
          rel="noopener noreferrer"
          class="u-draw font-mono text-step--1 uppercase tracking-wider text-ink no-underline"
          >github ↗</a
        >
        <a
          href={OWNER.social.gitlab.url}
          target="_blank"
          rel="noopener noreferrer"
          class="u-draw font-mono text-step--1 uppercase tracking-wider text-ink no-underline"
          >gitlab ↗</a
        >
      </div>
    </div>
  </div>

  <footer
    class="relative z-10 mx-auto mt-24 flex w-full max-w-[var(--content-max)] flex-wrap justify-between gap-3 border-t-[1.5px] border-ink px-4 pt-5 font-mono text-step--1 uppercase tracking-wider text-journal-1 sm:px-6"
  >
    <span>viet bui · {new Date().getFullYear()}</span>
    <span>astro + svelte · obsidian vault</span>
  </footer>
</section>
