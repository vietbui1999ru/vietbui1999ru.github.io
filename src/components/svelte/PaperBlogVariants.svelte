<script lang="ts">
// Each variant is a <template> in the storage element. Template content is inert, so
// its heading ids stay out of the document and only the mounted copy owns them (#47).
type VariantTab = {
  label: string;
  source: HTMLTemplateElement;
};

type Props = {
  storageId: string;
  proseClass?: string;
};

let { storageId, proseClass = "" }: Props = $props();
let tabs = $state.raw<VariantTab[]>([]);
let activeIdx = $state(0);
// The URL hash names a heading that exists only once the first variant is mounted.
let hashHandled = false;

function loadVariants(_node: HTMLElement) {
  const storage = document.getElementById(storageId);
  if (!storage) return;

  tabs = Array.from(
    storage.querySelectorAll<HTMLTemplateElement>("template[data-variant-label]"),
  ).map((source) => ({
    label: source.dataset.variantLabel ?? "",
    source,
  }));
  storage.hidden = true;
  storage.style.display = "none";
}

function mountVariant(node: HTMLElement) {
  const tab = tabs[activeIdx];
  if (!tab) return;

  node.replaceChildren(
    ...Array.from(tab.source.content.childNodes).map((child) => child.cloneNode(true)),
  );
  if (!hashHandled) {
    hashHandled = true;
    const id = decodeURIComponent(location.hash.slice(1));
    const target = id ? Array.from(node.querySelectorAll("[id]")).find((el) => el.id === id) : undefined;
    target?.scrollIntoView();
  }
  // Each tab carries its own headings, so the TOC can follow the active tab.
  const headings = JSON.parse(tab.source.dataset.headings ?? "[]");
  window.dispatchEvent(new CustomEvent("variant-change", { detail: { headings } }));

  return () => node.replaceChildren();
}
</script>

<div {@attach loadVariants}>
  {#if tabs.length > 1}
    <div class="mb-8 flex flex-wrap gap-2 border-b-[1.5px] border-ink pb-3" role="tablist">
      {#each tabs as tab, index (tab.label)}
        <button
          type="button"
          role="tab"
          aria-selected={index === activeIdx}
          onclick={() => (activeIdx = index)}
          class={[
            "cursor-pointer border border-ink px-3 py-1 font-mono text-[0.7rem] uppercase tracking-wider transition-colors",
            index === activeIdx
              ? "bg-pastel-butter text-ink"
              : "bg-paper-raised text-journal-1 hover:bg-journal-4 hover:text-ink",
          ]}
        >
          {tab.label}
        </button>
      {/each}
    </div>
  {/if}

  <div class={proseClass} {@attach mountVariant}></div>
</div>
