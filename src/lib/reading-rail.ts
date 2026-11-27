// Marker math for the reading rail in the sidebar TOC, free of DOM code.
import { checkpointStates, type CheckpointState } from "./timeline-rail";

export interface ReadingInput {
  /** Document y of each heading that has a checkpoint, in order. */
  headingTops: number[];
  /** Offset of each checkpoint from the rail top, in the same order. */
  checkpoints: number[];
  /** Document y of the reading line. */
  readingLine: number;
  /** Document y of the bottom of the content. */
  contentBottom: number;
  railHeight: number;
}

/**
 * Marker offset on the rail. The offset is piecewise linear over the points
 * (document top, 0), (heading i, checkpoint i) and (content bottom, rail height),
 * clamped to [0, railHeight].
 */
export function readingMarkerOffset(input: ReadingInput): number {
  const { headingTops, checkpoints, readingLine, contentBottom, railHeight } = input;
  const xs = [0, ...headingTops, contentBottom];
  const ys = [0, ...checkpoints, railHeight];
  let offset = railHeight;
  for (let i = 1; i < xs.length; i++) {
    if (readingLine > xs[i]) continue;
    const span = xs[i] - xs[i - 1];
    const t = span > 0 ? (readingLine - xs[i - 1]) / span : 1;
    offset = ys[i - 1] + (ys[i] - ys[i - 1]) * t;
    break;
  }
  return Math.min(Math.max(offset, 0), Math.max(railHeight, 0));
}

/** A checkpoint is passed once the marker reaches its offset. */
export function readingCheckpointStates(checkpoints: number[], marker: number): CheckpointState[] {
  return checkpointStates(checkpoints, marker);
}
