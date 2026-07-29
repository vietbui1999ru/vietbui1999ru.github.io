import { PREDATOR_PREY_CATCH_RADIUS_FRACTION } from "./config";
import type { InkObject } from "./types";

export interface CatchResolution {
  destroyedPreyIds: Set<number>;
  winnerIds: Set<number>;
  loserIds: Set<number>;
  bursts: Array<{ x: number; y: number; radius: number }>;
}

export function resolveCatches(objects: readonly InkObject[]): CatchResolution {
  const predators = objects.filter((o) => o.role === "predator" && o.vanishElapsed === null);
  const preyList = objects.filter((o) => o.role === "prey");
  const destroyedPreyIds = new Set<number>();
  const winnerIds = new Set<number>();
  const loserIds = new Set<number>();
  const bursts: Array<{ x: number; y: number; radius: number }> = [];

  for (const prey of preyList) {
    let winner: InkObject | null = null;
    let winnerDistanceSquared = Number.POSITIVE_INFINITY;
    for (const predator of predators) {
      const threshold = (predator.radius + prey.radius) * PREDATOR_PREY_CATCH_RADIUS_FRACTION;
      const dx = predator.position.x - prey.position.x;
      const dy = predator.position.y - prey.position.y;
      const distanceSquared = dx * dx + dy * dy;
      if (distanceSquared >= threshold * threshold) continue;
      if (
        winner === null ||
        distanceSquared < winnerDistanceSquared ||
        (distanceSquared === winnerDistanceSquared && predator.id < winner.id)
      ) {
        winner = predator;
        winnerDistanceSquared = distanceSquared;
      }
    }
    if (!winner) continue;
    destroyedPreyIds.add(prey.id);
    winnerIds.add(winner.id);
    bursts.push({ x: prey.position.x, y: prey.position.y, radius: prey.radius });
    for (const predator of predators) {
      if (predator.id === winner.id) continue;
      if (predator.currentTargetId === prey.id) loserIds.add(predator.id);
    }
  }

  return { destroyedPreyIds, winnerIds, loserIds, bursts };
}
