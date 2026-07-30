import { LV_ALPHA, LV_BETA, LV_DELTA, LV_GAMMA, LV_SCALE, PREDATOR_TARGET_MAX, PREY_TARGET_MAX } from "./config";

export interface PopulationState {
  prey: number;
  predator: number;
}

export function stepLotkaVolterra(state: PopulationState, dt: number): PopulationState {
  const { prey: x, predator: y } = state;
  const dx = LV_ALPHA * x - LV_BETA * x * y;
  const dy = -LV_GAMMA * y + LV_DELTA * x * y;
  return {
    prey: Math.max(0.05, x + dx * dt),
    predator: Math.max(0.05, y + dy * dt),
  };
}

export interface PopulationTargets {
  preyTarget: number;
  predatorTarget: number;
}

function clampRoundedInt(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)));
}

export function mapToTargets(state: PopulationState): PopulationTargets {
  return {
    preyTarget: clampRoundedInt(state.prey * LV_SCALE, 1, PREY_TARGET_MAX),
    predatorTarget: clampRoundedInt(state.predator * LV_SCALE, 1, PREDATOR_TARGET_MAX),
  };
}
