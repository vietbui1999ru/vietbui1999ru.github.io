import type { SimModule, SymmetryType } from '@/scenes/engine/types'
import { LorenzScene, LORENZ_LEVA_SCHEMA } from './Scene'
import type { LorenzConfig } from './Scene'
import { LORENZ_PRESETS } from './presets'

const LorenzModule: SimModule<LorenzConfig> = {
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

  /**
   * Lorenz is meaningful for C_n symmetry (particles on a ring); D_n also valid
   * for even-order double-scroll mirroring. Disable for order < 1.
   */
  symmetryApplies(type: SymmetryType, order: number): boolean {
    return type === 'C' && order >= 1
  },
}

export default LorenzModule
