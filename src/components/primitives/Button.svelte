<script lang="ts">
import type { Snippet } from "svelte";
import type { SvelteHTMLElements } from "svelte/elements";
import type { ButtonSize, ButtonVariant } from "../../design-system/types";

type ButtonProps = Omit<SvelteHTMLElements["button"], "class"> & {
  children?: Snippet;
  variant?: ButtonVariant;
  size?: ButtonSize;
  class?: string;
};

let {
  children,
  variant = "solid",
  size = "md",
  class: className = "",
  ...rest
}: ButtonProps = $props();

const variantClasses: Record<ButtonVariant, string> = {
  solid: "bg-ink text-paper-raised hover:-translate-y-0.5 hover:shadow-hard-sm",
  outline: "bg-paper-raised text-ink hover:-translate-y-0.5 hover:bg-journal-4",
  ghost: "bg-transparent text-ink hover:bg-journal-4",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "min-h-8 px-3 py-1.5 text-[0.7rem]",
  md: "min-h-10 px-4 py-2 text-step--1",
  lg: "min-h-12 px-5 py-2.5 text-step-0",
};
</script>

<button
  {...rest}
  class={`inline-flex cursor-pointer items-center justify-center gap-2 border-[1.5px] border-ink font-mono uppercase tracking-wider shadow-hard-sm transition-[transform,box-shadow,background-color] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-paper disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-45 ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
>
  {@render children?.()}
</button>
