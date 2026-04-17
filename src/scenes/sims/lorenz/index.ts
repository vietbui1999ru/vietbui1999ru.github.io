import type { SimModule, PerfTier, SymmetryType } from '@/scenes/engine/types'
import { LorenzScene, LORENZ_LEVA_SCHEMA } from './Scene'
import type { LorenzConfig } from './Scene'
import { LORENZ_PRESETS } from './presets'

// CPU-only sim: scene manages its own particle array via useRef
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface LorenzState {}

const LorenzModule: SimModule<LorenzConfig, LorenzState> = {
  id: 'lorenz',
  title: 'Lorenz Attractor',
  description:
    'Three-variable ODE system (Lorenz 1963) that exhibits deterministic chaos. ' +
    'Two butterfly-like attractor wings at classical parameters σ=10, ρ=28, β=8/3. ' +
    'RK4 integration; positive Lyapunov exponent makes initially-nearby trajectories diverge.',

  defaults: {
    sigma: 10,
    rho: 28,
    beta: 8 / 3,
    particleCount: 500,
    dt: 0.005,
    trailLength: 800,
  },

  presets: LORENZ_PRESETS,

  schema: LORENZ_LEVA_SCHEMA,

  Scene: LorenzScene,

  init(_config: LorenzConfig, _perf: PerfTier): LorenzState {
    // Integration happens inside Scene.tsx via useFrame; no CPU state here
    return {}
  },

  step(_state: LorenzState, _dt: number): void {
    // No integration step at module level; all animation is driven by useFrame
  },

  dispose(_state: LorenzState): void {
    // No GPU resources to release
  },

  /**
   * Lorenz is meaningful for C_n symmetry (particles on a ring); D_n also valid
   * for even-order double-scroll mirroring. Disable for order < 1.
   */
  symmetryApplies(type: SymmetryType, order: number): boolean {
    return type === 'C' && order >= 1
  },
}

export default LorenzModule
