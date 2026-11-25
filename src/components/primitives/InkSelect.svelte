<script lang="ts" generics="T extends string">
import { ChevronDown } from "@lucide/svelte";
import type { Attachment } from "svelte/attachments";
import { createTypeahead, nextIndex } from "../../lib/listbox";

// Themed single-select listbox: the open list follows the ink-on-paper theme,
// which the native select list cannot. Keyboard rules live in lib/listbox.
let {
  options,
  value,
  label,
  onChange,
  align = "start",
}: {
  options: { value: T; label: string }[];
  value: T;
  label: string;
  onChange: (value: T) => void;
  /** Which edge of the button the open list lines up with. */
  align?: "start" | "end";
} = $props();

const uid = $props.id();
const labelId = `${uid}-label`;
const buttonId = `${uid}-button`;
const listId = `${uid}-list`;
const optionId = (i: number) => `${uid}-option-${i}`;

let open = $state(false);
let activeIndex = $state(0);
const typeahead = createTypeahead();

const selectedIndex = $derived(Math.max(0, options.findIndex((o) => o.value === value)));
const selectedLabel = $derived(options[selectedIndex]?.label ?? "");

function openList() {
  activeIndex = selectedIndex;
  open = true;
}

function close(refocus: boolean) {
  open = false;
  if (refocus) document.getElementById(buttonId)?.focus();
}

function choose(i: number) {
  close(true);
  if (options[i] && options[i].value !== value) onChange(options[i].value);
}

function setActive(i: number) {
  activeIndex = i;
  document.getElementById(optionId(i))?.scrollIntoView?.({ block: "nearest" });
}

function onButtonKeydown(event: KeyboardEvent) {
  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault();
    openList();
  }
}

function onListKeydown(event: KeyboardEvent) {
  const moved = nextIndex(event.key, activeIndex, options.length);
  if (moved !== null) {
    event.preventDefault();
    setActive(moved);
  } else if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    choose(activeIndex);
  } else if (event.key === "Escape") {
    event.preventDefault();
    close(true);
  } else if (event.key === "Tab") {
    close(false);
  } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
    const hit = typeahead.match(event.key, options.map((o) => o.label), activeIndex);
    if (hit >= 0) setActive(hit);
  }
}

function onListClick(event: MouseEvent) {
  const item = (event.target as Element).closest<HTMLElement>("[data-index]");
  if (item) choose(Number(item.dataset.index));
}

// A pointer press outside the component closes the open list.
const closeOnOutsidePress: Attachment<HTMLElement> = (node) => {
  const onPointerdown = (event: PointerEvent) => {
    if (open && !node.contains(event.target as Node)) close(false);
  };
  document.addEventListener("pointerdown", onPointerdown);
  return () => document.removeEventListener("pointerdown", onPointerdown);
};
</script>

<div {@attach closeOnOutsidePress} class="inline-flex items-center gap-3 font-mono text-[0.68rem] uppercase tracking-wider text-journal-2">
  <span id={labelId}>{label}</span>
  <span class="relative inline-flex">
    <button
      id={buttonId}
      type="button"
      aria-haspopup="listbox"
      aria-expanded={open}
      aria-controls={open ? listId : undefined}
      aria-labelledby="{labelId} {buttonId}"
      class="lift flex h-9 cursor-pointer items-center gap-2 border-[1.5px] border-ink bg-paper-raised py-1 pr-2.5 pl-3 font-mono text-step--1 lowercase text-ink shadow-hard-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      onclick={() => (open ? close(true) : openList())}
      onkeydown={onButtonKeydown}
    >
      <span>{selectedLabel}</span>
      <ChevronDown size={16} strokeWidth={1.75} aria-hidden="true" class="text-ink transition-transform motion-reduce:transition-none {open ? 'rotate-180' : ''}" />
    </button>

    {#if open}
      <ul
        {@attach (node) => node.focus()}
        id={listId}
        role="listbox"
        tabindex="-1"
        aria-labelledby={labelId}
        aria-activedescendant={optionId(activeIndex)}
        class="absolute top-full z-30 mt-1 max-h-72 max-w-[calc(100vw-2rem)] min-w-full overflow-y-auto border-[1.5px] border-ink bg-paper-raised py-1 font-mono text-step--1 normal-case tracking-normal text-ink shadow-hard-sm focus:outline-none {align === 'end' ? 'right-0' : 'left-0'}"
        onkeydown={onListKeydown}
        onclick={onListClick}
      >
        {#each options as option, i (option.value)}
          <li
            id={optionId(i)}
            role="option"
            data-index={i}
            aria-selected={i === selectedIndex}
            class="cursor-pointer px-3 py-2 whitespace-nowrap lowercase decoration-[1.5px] underline-offset-4 aria-selected:underline {i === activeIndex ? 'bg-journal-4' : ''}"
            onpointermove={() => (activeIndex = i)}
          >
            {option.label}
          </li>
        {/each}
      </ul>
    {/if}
  </span>
</div>
