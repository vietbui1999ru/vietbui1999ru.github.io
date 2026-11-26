// Control definitions for the playground panel (issue #22 part 2). Framework-free,
// so InkPanel.svelte and InkAmbient.svelte share one list of keys and events.
import type { SimConfig } from "./sim-config";

/** Panel to simulation: a partial SimConfig to apply with setConfig. */
export const CONFIG_EVENT = "ink-ambient-config";
/** Panel to simulation: restart from the start counts, with { seed }. */
export const RESTART_EVENT = "ink-ambient-restart";
/** Simulation to panel: { objects, stepMs }, about twice per second. */
export const STATS_EVENT = "ink-ambient-stats";

export type ControlGroup = "population" | "movement" | "predators" | "flocks" | "objects";

export interface RangeControl {
  key: Exclude<keyof SimConfig, "objectCap">;
  label: string;
  group: ControlGroup;
  min: number;
  max: number;
  step: number;
  /** When the change takes effect, shown next to the label. */
  applies: "live" | "new objects" | "on restart";
}

export const CONTROL_GROUPS: readonly ControlGroup[] = ["population", "movement", "predators", "flocks", "objects"];

// objectCap is not here: the panel gives it a number field and an "unlimited" checkbox.
export const RANGE_CONTROLS: readonly RangeControl[] = [
  { key: "startPredators", label: "pens at start", group: "population", min: 0, max: 100, step: 1, applies: "on restart" },
  { key: "startPrey", label: "pencils at start", group: "population", min: 0, max: 100, step: 1, applies: "on restart" },
  { key: "predatorSpeedScale", label: "pen speed", group: "movement", min: 0.25, max: 3, step: 0.05, applies: "live" },
  { key: "preySpeedScale", label: "pencil speed", group: "movement", min: 0.25, max: 3, step: 0.05, applies: "live" },
  { key: "predatorLives", label: "pen lives", group: "predators", min: 1, max: 10, step: 1, applies: "new objects" },
  { key: "starveSeconds", label: "starve after (s)", group: "predators", min: 10, max: 600, step: 5, applies: "live" },
  { key: "lifespanMaxMultiplier", label: "quiet-screen lifespan (max x)", group: "predators", min: 1, max: 10, step: 0.5, applies: "live" },
  { key: "flockRadius", label: "flock radius (px)", group: "flocks", min: 30, max: 300, step: 5, applies: "live" },
  { key: "flockMinSize", label: "smallest flock", group: "flocks", min: 2, max: 12, step: 1, applies: "live" },
  { key: "flockSwitchMargin", label: "target switch margin", group: "flocks", min: 0, max: 0.9, step: 0.05, applies: "live" },
  { key: "sizeScale", label: "object size (x)", group: "objects", min: 0.5, max: 2.5, step: 0.05, applies: "new objects" },
  { key: "trailSeconds", label: "trail length (s)", group: "objects", min: 0, max: 10, step: 0.1, applies: "live" },
];

/** Average step time per frame above which the readout warns. */
export const FRAME_BUDGET_MS = 8;

/** Readable value for a control: integers as is, fractions to two places at most. */
export function formatValue(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));
}
