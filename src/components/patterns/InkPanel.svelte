<script lang="ts">
import { onMount } from "svelte";
import { ChevronDown, RotateCcw } from "@lucide/svelte";
import PenIcon from "@/components/icons/PenIcon.svelte";
import PencilIcon from "@/components/icons/PencilIcon.svelte";
import {
  CONFIG_EVENT,
  CONTROL_GROUPS,
  FRAME_BUDGET_MS,
  RANGE_CONTROLS,
  RESTART_EVENT,
  STATS_EVENT,
  formatValue,
  type RangeControl,
} from "@/lib/ink-ambient/panel-controls";
import { randomSeed } from "@/lib/ink-ambient/rng";
import { DEFAULT_SIM_CONFIG, type SimConfig } from "@/lib/ink-ambient/sim-config";

// Playground control panel (#22). It talks to InkAmbient through window events,
// like the nav buttons, and keeps its values for this visit only.
const uid = $props.id();
const bodyId = `${uid}-body`;
const capId = `${uid}-cap`;
const seedId = `${uid}-seed`;

let config = $state<SimConfig>({ ...DEFAULT_SIM_CONFIG });
let seed = $state(randomSeed());
let open = $state(false);
let stats = $state<{ objects: number; stepMs: number } | null>(null);

const unlimited = $derived(config.objectCap === Infinity);
const slow = $derived(stats !== null && stats.stepMs > FRAME_BUDGET_MS);

function send(patch: Partial<SimConfig>): void {
  window.dispatchEvent(new CustomEvent(CONFIG_EVENT, { detail: patch }));
}

function setRange(control: RangeControl, raw: string): void {
  const value = Number(raw);
  config[control.key] = value;
  send({ [control.key]: value });
}

function setCap(value: number | null): void {
  config.objectCap = value;
  send({ objectCap: value });
}

function onCapInput(raw: string): void {
  const value = Math.floor(Number(raw));
  setCap(raw === "" || !Number.isFinite(value) ? null : Math.max(1, value));
}

function restart(): void {
  window.dispatchEvent(new CustomEvent(RESTART_EVENT, { detail: { seed } }));
}

function resetDefaults(): void {
  config = { ...DEFAULT_SIM_CONFIG };
  send({ ...DEFAULT_SIM_CONFIG });
}

function onSeedInput(raw: string): void {
  const value = Math.floor(Number(raw));
  if (Number.isFinite(value)) seed = value;
}

const dispatch = (name: string) => () => window.dispatchEvent(new CustomEvent(name));

onMount(() => {
  // Open by default on desktop; a collapsed bottom sheet on phones.
  open = matchMedia("(min-width: 768px)").matches;
  const onStats = (event: Event) => {
    stats = (event as CustomEvent<{ objects: number; stepMs: number }>).detail;
  };
  window.addEventListener(STATS_EVENT, onStats);
  return () => window.removeEventListener(STATS_EVENT, onStats);
});
</script>

<aside
  data-ink-panel
  data-ink-obstacle="panel"
  aria-label="ink simulation controls"
  class="fixed inset-x-4 bottom-20 z-40 flex max-h-[60dvh] flex-col border-[1.5px] border-ink bg-paper-raised text-ink shadow-hard-sm md:inset-x-auto md:top-20 md:right-4 md:bottom-auto md:max-h-[calc(100dvh-7rem)] md:w-80"
>
  <button
    type="button"
    aria-expanded={open}
    aria-controls={bodyId}
    onclick={() => (open = !open)}
    class="label-mono flex w-full cursor-pointer items-center justify-between px-4 py-2.5"
  >
    <span>controls</span>
    <ChevronDown size={16} strokeWidth={1.75} class={["transition-transform", open && "rotate-180"]} />
  </button>

  {#if open}
    <div id={bodyId} class="overflow-y-auto border-t-[1.5px] border-ink px-4 pb-4">
      <div class="mt-3 flex gap-2 md:hidden">
        <button type="button" aria-label="Add a predator" onclick={dispatch("ink-ambient-add-predator")} class="lift grid h-9 w-9 cursor-pointer place-items-center border-[1.5px] border-ink bg-paper-raised shadow-hard-sm"><PenIcon class="text-ink" /></button>
        <button type="button" aria-label="Add a prey" onclick={dispatch("ink-ambient-add-prey")} class="lift grid h-9 w-9 cursor-pointer place-items-center border-[1.5px] border-ink bg-paper-raised shadow-hard-sm"><PencilIcon class="text-ink" /></button>
        <button type="button" aria-label="Reset ink ambient simulation" onclick={dispatch("ink-ambient-reset")} class="lift grid h-9 w-9 cursor-pointer place-items-center border-[1.5px] border-ink bg-paper-raised shadow-hard-sm"><RotateCcw size={15} strokeWidth={1.75} /></button>
      </div>

      <p role="status" class={["label-mono mt-3 text-step--1", slow ? "bg-pastel-rose px-1 text-ink" : "text-journal-2"]}>
        {#if stats}
          {stats.objects} objects · {formatValue(stats.stepMs)} ms/frame{#if slow} · slow{/if}
        {:else}
          measuring…
        {/if}
      </p>

      {#each CONTROL_GROUPS as group (group)}
        <fieldset class="mt-4">
          <legend class="label-mono text-journal-2">{group}</legend>
          {#if group === "population"}
            <div class="mt-2">
              <div class="flex items-baseline justify-between text-step--1">
                <label for={capId}>object cap</label><span class="label-mono text-journal-2">live</span>
              </div>
              <div class="mt-1 flex items-center gap-3">
                <input
                  id={capId}
                  type="number"
                  min="1"
                  inputmode="numeric"
                  placeholder="device default"
                  disabled={unlimited}
                  value={unlimited || config.objectCap === null ? "" : config.objectCap}
                  oninput={(event) => onCapInput(event.currentTarget.value)}
                  class="w-28 border-[1.5px] border-ink bg-paper px-2 py-1 font-mono text-step--1 disabled:opacity-45"
                />
                <label class="flex items-center gap-1.5 text-step--1">
                  <input
                    type="checkbox"
                    checked={unlimited}
                    onchange={(event) => setCap(event.currentTarget.checked ? Infinity : null)}
                    class="accent-ink"
                  />
                  unlimited
                </label>
              </div>
            </div>
          {/if}
          {#each RANGE_CONTROLS.filter((c) => c.group === group) as control (control.key)}
            {@const id = `${uid}-${control.key}`}
            <div class="mt-2">
              <div class="flex items-baseline justify-between gap-2 text-step--1">
                <label for={id}>{control.label}</label>
                <!-- The range input announces its own value; this copy is visual only. -->
                <span class="label-mono text-journal-2" aria-hidden="true">
                  <span data-value>{formatValue(config[control.key])}</span> · {control.applies}
                </span>
              </div>
              <input
                {id}
                type="range"
                min={control.min}
                max={control.max}
                step={control.step}
                value={config[control.key]}
                oninput={(event) => setRange(control, event.currentTarget.value)}
                class="mt-1 w-full accent-ink"
              />
            </div>
          {/each}
        </fieldset>
      {/each}

      <fieldset class="mt-4">
        <legend class="label-mono text-journal-2">run</legend>
        <label for={seedId} class="mt-2 block text-step--1">seed</label>
        <div class="mt-1 flex items-center gap-2">
          <input
            id={seedId}
            type="number"
            inputmode="numeric"
            value={seed}
            oninput={(event) => onSeedInput(event.currentTarget.value)}
            class="w-32 border-[1.5px] border-ink bg-paper px-2 py-1 font-mono text-step--1"
          />
          <button type="button" onclick={() => (seed = randomSeed())} class="label-mono cursor-pointer border-[1.5px] border-ink px-2 py-1 shadow-hard-sm">random</button>
        </div>
        <div class="mt-3 flex gap-2">
          <button type="button" onclick={restart} class="label-mono flex-1 cursor-pointer border-[1.5px] border-ink bg-ink px-2 py-1.5 text-paper-raised shadow-hard-sm">restart</button>
          <button type="button" onclick={resetDefaults} class="label-mono flex-1 cursor-pointer border-[1.5px] border-ink px-2 py-1.5 shadow-hard-sm">reset to defaults</button>
        </div>
      </fieldset>
    </div>
  {/if}
</aside>
