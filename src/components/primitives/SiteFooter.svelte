<script lang="ts">
import { Link, Mail } from "@lucide/svelte";
import { siGithub, siGitlab } from "simple-icons";
import { OWNER } from "../../config/owner";
import InkLink from "./InkLink.svelte";

// The footer is the site's one contact block. Icons are monochrome and follow the text colour.
// simple-icons no longer ships a LinkedIn glyph, so LinkedIn gets a generic link icon.
type ContactLink = { label: string; href: string; path?: string; Icon?: typeof Mail };

const links: ContactLink[] = [
  { label: "email", href: `mailto:${OWNER.email}`, Icon: Mail },
  { label: "github", href: OWNER.social.github.url, path: siGithub.path },
  { label: "gitlab", href: OWNER.social.gitlab.url, path: siGitlab.path },
  { label: "linkedin", href: OWNER.social.linkedin.url, Icon: Link },
];
</script>

<footer class="page-container relative z-10 mt-12 pb-8">
  <div class="label-mono flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t-[1.5px] border-ink pt-5 text-journal-1">
    <span>{OWNER.name.toLowerCase()} · {new Date().getFullYear()}</span>
    <nav aria-label="Elsewhere" class="flex flex-wrap gap-4">
      {#each links as link (link.href)}
        {@const Icon = link.Icon}
        <InkLink href={link.href} tone="muted">
          {#if link.path}
            <svg viewBox="0 0 24 24" aria-hidden="true" class="mr-1.5 inline-block h-3.5 w-3.5 align-[-2px] text-ink" fill="currentColor">
              <path d={link.path} />
            </svg>
          {:else if Icon}
            <Icon size={14} strokeWidth={1.75} aria-hidden="true" class="mr-1.5 inline-block align-[-2px] text-ink" />
          {/if}
          {link.label}
        </InkLink>
      {/each}
    </nav>
    <span>astro + svelte · obsidian vault</span>
  </div>
</footer>
