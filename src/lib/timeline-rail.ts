// Marker and checkpoint math for the timeline rail, free of DOM code.

export type RailMode = "pointer" | "scroll";
export type CheckpointState = "passed" | "upcoming";

export interface RailInput {
  /** pointer: a mouse or pen is over the section; scroll: anything else. */
  mode: RailMode;
  /** Pointer y in viewport coordinates; read only in pointer mode. */
  pointerY: number;
  viewportHeight: number;
}

/** Marker offset from the rail top: the pointer, or the viewport centre, clamped to the rail. */
export function markerOffset(input: RailInput, rail: { top: number; height: number }): number {
  const y = input.mode === "pointer" ? input.pointerY : input.viewportHeight / 2;
  return Math.min(Math.max(y - rail.top, 0), Math.max(rail.height, 0));
}

/** A checkpoint is passed once the marker reaches its offset. */
export function checkpointStates(offsets: number[], marker: number): CheckpointState[] {
  return offsets.map((offset) => (offset <= marker ? "passed" : "upcoming"));
}
