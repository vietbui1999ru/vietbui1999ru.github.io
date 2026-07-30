<script lang="ts">
import type { Snippet } from "svelte";

let {
  open = false,
  title,
  onClose,
  size = "wide",
  dismissOnMouseLeave = false,
  children,
}: {
  open?: boolean;
  title: string;
  onClose: () => void;
  size?: "compact" | "wide";
  dismissOnMouseLeave?: boolean;
  children?: Snippet;
} = $props();

function handleKeydown(event: KeyboardEvent): void {
  if (event.key === "Escape" && open) onClose();
}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
  <div
    class="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-ink/60 p-4 sm:p-6"
    data-ink-modal
    role="presentation"
  >
    <dialog
      open
      aria-labelledby="modal-title"
      aria-modal="true"
      onmouseleave={dismissOnMouseLeave ? onClose : undefined}
      class="relative m-0 max-h-[calc(100svh-2rem)] w-full {size === "compact" ? "max-w-xl" : "max-w-4xl"} overflow-y-auto border-[1.5px] border-ink bg-paper p-5 shadow-hard sm:max-h-[calc(100svh-3rem)] sm:p-8"
    >
      <header class="mb-6 flex items-start justify-between gap-4 border-b border-journal-3 pb-4">
        <h2 id="modal-title" class="font-serif text-step-2 font-semibold text-ink">{title}</h2>
        <button
          type="button"
          aria-label="Close dialog"
          onclick={onClose}
          class="border-[1.5px] border-ink px-3 py-1 font-mono text-sm text-ink"
        >×</button>
      </header>
      {@render children?.()}
    </dialog>
  </div>
{/if}
