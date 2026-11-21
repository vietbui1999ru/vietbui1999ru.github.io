<script lang="ts">
import type { Snippet } from "svelte";
import type { ClassValue, HTMLAnchorAttributes } from "svelte/elements";

type InkLinkProps = Omit<HTMLAnchorAttributes, "class" | "href"> & {
  href: string;
  /** Opens in a new tab with `noopener`; defaults to true for http(s) URLs. */
  external?: boolean;
  /** "back" prefixes ←, "forward" suffixes →; external links get ↗. */
  arrow?: "back" | "forward" | "none";
  tone?: "ink" | "muted";
  class?: ClassValue;
  children: Snippet;
};

let {
  href,
  external,
  arrow = "none",
  tone = "ink",
  class: className,
  children,
  ...rest
}: InkLinkProps = $props();

const isExternal = $derived(external ?? /^https?:\/\//.test(href));
</script>

<a
  {...rest}
  {href}
  target={isExternal ? "_blank" : undefined}
  rel={isExternal ? "noopener noreferrer" : undefined}
  class={[
    "u-draw label-mono no-underline",
    tone === "ink" ? "text-ink" : "text-journal-1",
    className,
  ]}
>
  {#if arrow === "back"}←&nbsp;{/if}{@render children()}{#if arrow === "forward"}&nbsp;→{:else if isExternal}&nbsp;↗{/if}
</a>
