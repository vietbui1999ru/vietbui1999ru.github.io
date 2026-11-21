<script lang="ts">
import type { Snippet } from "svelte";
import type {
  ClassValue,
  HTMLAnchorAttributes,
  HTMLButtonAttributes,
} from "svelte/elements";
import type { ButtonSize, ButtonVariant } from "../../design-system/types";

type ButtonProps = Omit<HTMLButtonAttributes & HTMLAnchorAttributes, "class"> & {
  children?: Snippet;
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Render as a link instead of a button. */
  href?: string;
  /** Uppercase label (default). Turn off for e.g. an email address. */
  caps?: boolean;
  class?: ClassValue;
};

let {
  children,
  variant = "solid",
  size = "md",
  href,
  caps = true,
  class: className,
  ...rest
}: ButtonProps = $props();

const variantClasses: Record<ButtonVariant, string> = {
  solid: "bg-ink text-paper-raised shadow-hard-sm hover:-translate-y-0.5 hover:shadow-hard-sm",
  outline: "bg-paper-raised text-ink shadow-hard-sm hover:-translate-y-0.5 hover:bg-journal-4",
  ghost: "bg-transparent text-ink shadow-hard-sm hover:bg-journal-4",
  // Production CTAs: light sweep + hard-shadow lift (global.css motion primitives).
  raised: "gleam lift bg-paper-raised text-ink shadow-hard",
  inverse: "gleam lift bg-ink text-paper shadow-[4px_4px_0_var(--grey-2)]",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "min-h-8 px-3 py-1.5 text-[0.7rem]",
  md: "min-h-10 px-5 py-2.5 text-step--1",
  lg: "min-h-12 px-6 py-3 text-step-0",
};

const external = $derived(href ? /^https?:\/\//.test(href) : false);
</script>

<svelte:element
  this={href ? "a" : "button"}
  {...rest}
  {href}
  target={external ? "_blank" : rest.target}
  rel={external ? "noopener noreferrer" : rest.rel}
  class={[
    "inline-flex cursor-pointer items-center justify-center gap-2 border-[1.5px] border-ink font-mono no-underline transition-[transform,box-shadow,background-color] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-paper disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-45",
    caps ? "uppercase tracking-wider" : "tracking-wide",
    variantClasses[variant],
    sizeClasses[size],
    className,
  ]}
>
  {@render children?.()}
</svelte:element>
