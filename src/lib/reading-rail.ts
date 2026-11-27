// Marker math for the reading rail in the sidebar TOC, free of DOM code.
import { checkpointStates, type CheckpointState } from "./timeline-rail";

export interface ReadingInput {
  /** Document y of each heading that has a checkpoint, in order. */
  headingTops: number[];
  /** Offset of each checkpoint from the rail top, in the same order. */
  checkpoints: number[];
  /** Document y of the reading line: the pointer in pointer mode, see readingLine otherwise. */
  readingLine: number;
  railHeight: number;
}

/**
 * Marker offset on the rail. Between heading i and heading i+1 it interpolates linearly
 * between checkpoint i and checkpoint i+1. Above the first heading it stays on the first
 * checkpoint, below the last heading on the last one, and at 0 with no headings. The
 * result is clamped to [0, railHeight].
 */
export function readingMarkerOffset(input: ReadingInput): number {
  const { headingTops: xs, checkpoints: ys, readingLine, railHeight } = input;
  const n = Math.min(xs.length, ys.length);
  let offset = 0;
  if (n > 0) {
    offset = ys[n - 1];
    if (readingLine <= xs[0]) offset = ys[0];
    else {
      for (let i = 1; i < n; i++) {
        if (readingLine > xs[i]) continue;
        const span = xs[i] - xs[i - 1];
        const t = span > 0 ? (readingLine - xs[i - 1]) / span : 1;
        offset = ys[i - 1] + (ys[i] - ys[i - 1]) * t;
        break;
      }
    }
  }
  return Math.min(Math.max(offset, 0), Math.max(railHeight, 0));
}

/** The reading line sits this far down the viewport. */
export const READING_LINE_FRACTION = 0.3;

export interface ScrollInput {
  scrollY: number;
  viewportHeight: number;
  /** Largest possible scrollY. */
  maxScroll: number;
  /** Document y of the bottom of the content. */
  contentBottom: number;
}

/**
 * Document y of the reading line: READING_LINE_FRACTION down the viewport. Over the last
 * viewport height of the scroll range it moves linearly down to the content bottom, so at
 * the scroll end every checkpoint is passed, also on a short page.
 */
export function readingLine(input: ScrollInput): number {
  const { scrollY, viewportHeight, maxScroll, contentBottom } = input;
  const offset = viewportHeight * READING_LINE_FRACTION;
  const leftBelow = Math.max(0, contentBottom - (maxScroll + offset));
  const t = viewportHeight > 0 ? Math.min(Math.max(1 - (maxScroll - scrollY) / viewportHeight, 0), 1) : 1;
  return scrollY + offset + leftBelow * t;
}

/** A checkpoint is passed once the marker reaches its offset. */
export function readingCheckpointStates(checkpoints: number[], marker: number): CheckpointState[] {
  return checkpointStates(checkpoints, marker);
}
