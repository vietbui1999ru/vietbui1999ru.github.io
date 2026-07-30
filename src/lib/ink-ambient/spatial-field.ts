import { GRID_COLUMNS, GRID_ROWS, SAFE_CLEARANCE } from "./config";
import { clamp } from "./physics";
import { SeededRng } from "./rng";
import type { Rect, RouteProfile, SpatialField, Vec2 } from "./types";

export function buildSpatialField(
  width: number,
  height: number,
  obstacles: readonly Rect[],
  profile: RouteProfile,
  radius: number,
  columns = GRID_COLUMNS,
  rows = GRID_ROWS,
): SpatialField {
  const cellWidth = width / columns;
  const cellHeight = height / rows;
  const safe: boolean[] = [];
  const score: number[] = [];
  const clearance = radius + SAFE_CLEARANCE;

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const x = (column + 0.5) * cellWidth;
      const y = (row + 0.5) * cellHeight;
      const normalized = { x: x / width, y: y / height };
      const blocked = obstacles.some((obstacle) =>
        pointInExpandedRect(x, y, obstacle, clearance),
      );
      const regionScore = profile.regions.reduce((total, region) => {
        const inside =
          normalized.x >= region.x &&
          normalized.x <= region.x + region.width &&
          normalized.y >= region.y &&
          normalized.y <= region.y + region.height;
        return inside ? total + (region.weight ?? 1) : total;
      }, 0);
      const edgeScore =
        profile.edgeBias === "right"
          ? normalized.x
          : profile.edgeBias === "left"
            ? 1 - normalized.x
            : profile.edgeBias === "outer"
              ? Math.abs(normalized.x - 0.5) * 2
              : 0;
      safe.push(!blocked && regionScore > 0);
      score.push(regionScore + edgeScore * 0.25);
    }
  }

  return {
    columns,
    rows,
    width,
    height,
    cellWidth,
    cellHeight,
    safe,
    score,
    obstacles: [...obstacles],
    profile,
  };
}

function pointInExpandedRect(
  x: number,
  y: number,
  rect: Rect,
  clearance: number,
): boolean {
  return (
    x >= rect.x - clearance &&
    x <= rect.x + rect.width + clearance &&
    y >= rect.y - clearance &&
    y <= rect.y + rect.height + clearance
  );
}

export function availableCapacity(field: SpatialField, radius: number): number {
  const candidates: Array<{ point: Vec2; score: number }> = [];
  for (let index = 0; index < field.safe.length; index += 1) {
    if (!field.safe[index]) continue;
    const column = index % field.columns;
    const row = Math.floor(index / field.columns);
    const point = {
      x: (column + 0.5) * field.cellWidth,
      y: (row + 0.5) * field.cellHeight,
    };
    if (isSafePoint(field, point, radius)) {
      candidates.push({ point, score: field.score[index] });
    }
  }
  candidates.sort((first, second) => second.score - first.score);

  const placements: Vec2[] = [];
  const minimumDistance = radius * 2 + SAFE_CLEARANCE;
  for (const candidate of candidates) {
    if (
      placements.every(
        (placed) =>
          Math.hypot(
            placed.x - candidate.point.x,
            placed.y - candidate.point.y,
          ) >= minimumDistance,
      )
    ) {
      placements.push(candidate.point);
    }
  }
  return placements.length;
}

export function findSafePoint(
  field: SpatialField,
  radius: number,
  rng: SeededRng,
  avoid: readonly Vec2[] = [],
): Vec2 | null {
  const candidates: Array<{ index: number; score: number }> = [];
  for (let index = 0; index < field.safe.length; index += 1) {
    if (!field.safe[index]) continue;
    const column = index % field.columns;
    const row = Math.floor(index / field.columns);
    const point = {
      x: (column + 0.5) * field.cellWidth,
      y: (row + 0.5) * field.cellHeight,
    };
    const separated = avoid.every(
      (other) => Math.hypot(point.x - other.x, point.y - other.y) > radius * 3,
    );
    if (separated && isSafePoint(field, point, radius)) {
      candidates.push({ index, score: field.score[index] + rng.next() * 0.4 });
    }
  }
  candidates.sort((a, b) => b.score - a.score);
  if (!candidates.length) return null;
  const selected =
    candidates[
      Math.min(
        candidates.length - 1,
        rng.int(0, Math.min(5, candidates.length - 1)),
      )
    ].index;
  const column = selected % field.columns;
  const row = Math.floor(selected / field.columns);
  return {
    x: clamp((column + 0.5) * field.cellWidth, radius, field.width - radius),
    y: clamp((row + 0.5) * field.cellHeight, radius, field.height - radius),
  };
}

const CORNERS: ReadonlyArray<readonly [boolean, boolean]> = [
  [true, true],
  [false, false],
  [false, true],
  [true, false],
];

/**
 * Like findSafePoint, but biased toward one of the four viewport corners
 * (rotate cornerIndex 0..3 across a freshly spawned batch) so objects start
 * as far apart as the safe-space field allows, instead of clustering near
 * whatever cells happen to score highest overall.
 */
export function findSafePointNearCorner(
  field: SpatialField,
  radius: number,
  rng: SeededRng,
  cornerIndex: number,
  avoid: readonly Vec2[] = [],
): Vec2 | null {
  const [preferLeft, preferTop] = CORNERS[((cornerIndex % CORNERS.length) + CORNERS.length) % CORNERS.length];
  const candidates: Array<{ index: number; score: number }> = [];
  for (let index = 0; index < field.safe.length; index += 1) {
    if (!field.safe[index]) continue;
    const column = index % field.columns;
    const row = Math.floor(index / field.columns);
    const point = {
      x: (column + 0.5) * field.cellWidth,
      y: (row + 0.5) * field.cellHeight,
    };
    const separated = avoid.every(
      (other) => Math.hypot(point.x - other.x, point.y - other.y) > radius * 3,
    );
    if (!separated || !isSafePoint(field, point, radius)) continue;
    const normalizedX = point.x / field.width;
    const normalizedY = point.y / field.height;
    const cornerScore =
      (preferLeft ? 1 - normalizedX : normalizedX) + (preferTop ? 1 - normalizedY : normalizedY);
    candidates.push({ index, score: cornerScore * 2 + field.score[index] * 0.15 + rng.next() * 0.05 });
  }
  candidates.sort((a, b) => b.score - a.score);
  if (!candidates.length) return null;
  const selected = candidates[0].index;
  const column = selected % field.columns;
  const row = Math.floor(selected / field.columns);
  return {
    x: clamp((column + 0.5) * field.cellWidth, radius, field.width - radius),
    y: clamp((row + 0.5) * field.cellHeight, radius, field.height - radius),
  };
}

export function isSafePoint(
  field: SpatialField,
  point: Vec2,
  radius: number,
): boolean {
  if (
    point.x < radius ||
    point.x > field.width - radius ||
    point.y < radius ||
    point.y > field.height - radius
  )
    return false;
  const column = clamp(
    Math.floor(point.x / field.cellWidth),
    0,
    field.columns - 1,
  );
  const row = clamp(Math.floor(point.y / field.cellHeight), 0, field.rows - 1);
  return (
    field.safe[row * field.columns + column] &&
    !field.obstacles.some((obstacle) =>
      pointInExpandedRect(point.x, point.y, obstacle, radius + SAFE_CLEARANCE),
    )
  );
}
