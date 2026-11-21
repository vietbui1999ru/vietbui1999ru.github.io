<script lang="ts" module>
import type { Pastel } from "../../design-system/tone";
import { PASTEL_BG } from "../../design-system/tone";

export type ChipTone = "ink" | "muted" | "raised" | "grey" | Pastel;

const TONE_CLASSES: Record<ChipTone, string> = {
  ink: "border-ink text-ink",
  muted: "border-journal-2 text-journal-1",
  raised: "border-ink bg-paper-raised text-ink",
  grey: "border-ink bg-journal-4 text-ink",
  sage: `border-ink text-ink ${PASTEL_BG.sage}`,
  dust: `border-ink text-ink ${PASTEL_BG.dust}`,
  rose: `border-ink text-ink ${PASTEL_BG.rose}`,
  butter: `border-ink text-ink ${PASTEL_BG.butter}`,
};

/** Chip look for elements that must stay native (e.g. filter toggle buttons). */
export function chipClass(tone: ChipTone = "ink", caps = false, size: "sm" | "md" = "sm"): string {
  return [
    "border py-0.5 font-mono no-underline",
    size === "sm" ? "px-2 text-[0.68rem]" : "px-2.5 text-step--1",
    caps ? "uppercase tracking-wider" : "tracking-wide",
    TONE_CLASSES[tone],
  ].join(" ");
}
</script>

<script lang="ts">
import type { Snippet } from "svelte";
import type { ClassValue } from "svelte/elements";

let {
  tone = "ink",
  caps = false,
  size = "sm",
  href,
  title,
  class: className,
  children,
}: {
  tone?: ChipTone;
  caps?: boolean;
  size?: "sm" | "md";
  href?: string;
  title?: string;
  class?: ClassValue;
  children: Snippet;
} = $props();

const external = $derived(href ? /^https?:\/\//.test(href) : false);
</script>

<svelte:element
  this={href ? "a" : "span"}
  {href}
  {title}
  target={external ? "_blank" : undefined}
  rel={external ? "noopener noreferrer" : undefined}
  class={[chipClass(tone, caps, size), className]}
>
  {@render children()}{#if external}&nbsp;↗{/if}
</svelte:element>
