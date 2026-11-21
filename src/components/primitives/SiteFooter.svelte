<script lang="ts">
import { OWNER } from "../../config/owner";
import InkLink from "./InkLink.svelte";

const links = [
  { label: "email", href: `mailto:${OWNER.email}` },
  { label: "github", href: OWNER.social.github.url },
  { label: "gitlab", href: OWNER.social.gitlab.url },
  { label: "linkedin", href: OWNER.social.linkedin.url },
];
</script>

<footer class="page-container relative z-10 mt-12 pb-8">
  <div class="label-mono flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t-[1.5px] border-ink pt-5 text-journal-1">
    <span>{OWNER.name.toLowerCase()} · {new Date().getFullYear()}</span>
    <nav aria-label="Elsewhere" class="flex flex-wrap gap-4">
      {#each links as link (link.href)}
        <InkLink href={link.href} tone="muted">{link.label}</InkLink>
      {/each}
    </nav>
    <span>astro + svelte · obsidian vault</span>
  </div>
</footer>
