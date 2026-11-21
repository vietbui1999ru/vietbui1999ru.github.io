<script lang="ts">
import { OWNER } from "../../config/owner";
import { CONTACT_CONTENT } from "../../data/contactData";
import Button from "../primitives/Button.svelte";
import InkLink from "../primitives/InkLink.svelte";
import Section from "../primitives/Section.svelte";
import SectionHeader from "../primitives/SectionHeader.svelte";

const socials = [
  { label: "linkedin", href: OWNER.social.linkedin.url },
  { label: "discord", href: OWNER.social.discord.url },
  { label: "github", href: OWNER.social.github.url },
  { label: "gitlab", href: OWNER.social.gitlab.url },
];
</script>

<Section id="contact">
  <SectionHeader index="08" title="contact" kicker="open channel" />

  <div data-ink-obstacle="content" class="max-w-4xl">
    <p class="mb-10 font-serif text-step-2 leading-tight text-ink-soft">{CONTACT_CONTENT}</p>

    <Button href="mailto:{OWNER.email}" variant="inverse" size="lg" caps={false} class="mb-8">
      {OWNER.email} ↗
    </Button>

    <div class="flex flex-wrap gap-4">
      {#each socials as social (social.href)}
        <InkLink href={social.href}>{social.label}</InkLink>
      {/each}
    </div>
  </div>
</Section>
