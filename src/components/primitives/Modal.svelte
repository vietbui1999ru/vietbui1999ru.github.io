<script lang="ts">
import type { Snippet } from "svelte";

let {
  open = false,
  title,
  onClose,
  children,
}: {
  open?: boolean;
  title: string;
  onClose: () => void;
  children?: Snippet;
} = $props();

function handleKeydown(event: KeyboardEvent): void {
  if (event.key === "Escape" && open) onClose();
}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
  <div class="fixed inset-0 z-[60] overflow-y-auto bg-ink/60 px-4 py-8 sm:px-6" role="presentation">
    <div class="mx-auto min-h-full max-w-4xl">
      <dialog
        open
        aria-labelledby="modal-title"
        class="relative border-[1.5px] border-ink bg-paper p-5 shadow-hard sm:p-8"
      >
        <header class="mb-6 flex items-start justify-between gap-4 border-b border-journal-3 pb-4">
          <h2 id="modal-title" class="font-serif text-step-2 font-semibold text-ink">{title}</h2>
          <button type="button" aria-label="Close dialog" onclick={onClose} class="border-[1.5px] border-ink px-3 py-1 font-mono text-sm text-ink">×</button>
        </header>
        {@render children?.()}
      </dialog>
    </div>
  </div>
{/if}
