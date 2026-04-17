import type { SimModule, PerfTier, SymmetryType } from '@/scenes/engine/types'
import { KuramotoSivashinskyScene, KS_LEVA_SCHEMA } from './Scene'
import type { KSConfig } from './Scene'
import { KS_PRESETS } from './presets'

// CPU pseudospectral state is managed inside Scene.tsx via useRef/useEffect;
// no separate CPU-side state object is needed at the module level.
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface KSModuleState {}

const KuramotoSivashinskyModule: SimModule<KSConfig, KSModuleState> = {
  id: 'kuramoto-sivashinsky',
  title: 'Kuramoto-Sivashinsky',
  description:
    'The Kuramoto-Sivashinsky PDE (u_t + u·u_x + u_xx + u_xxxx = 0) is a canonical model ' +
    'of one-dimensional spatio-temporal chaos arising from competing long-wave instability ' +
    'and short-wave hyperviscous damping. ' +
    'Integrated in Fourier space with a spectral ETDRK4 scheme that handles the stiff ' +
    'linear operator exactly, revealing chaotic cell dynamics and irregular traveling waves.',

  defaults: {
    L: 32 * Math.PI,
    N: 512,
    nu: 1.0,
    dt: 0.05,
    symmetryOrder: 1,
  },

  presets: KS_PRESETS,

  schema: KS_LEVA_SCHEMA,

  Scene: KuramotoSivashinskyScene,

  init(_config: KSConfig, _perf: PerfTier): KSModuleState {
    // Pseudospectral compute loop is driven by useFrame inside Scene.tsx
    return {}
  },

  step(_state: KSModuleState, _dt: number): void {
    // ETDRK4 stepping runs inside Scene.tsx useFrame
  },

  dispose(_state: KSModuleState): void {
    // No external GPU resources to release; DataTexture is owned by React
  },

  /**
   * KS supports C_n symmetric ICs generated as Fourier mode sums with
   * n-fold symmetry. Valid orders: 1, 2, 3, 4, 6, 8.
   */
  symmetryApplies(type: SymmetryType, order: number): boolean {
    return type === 'C' && [1, 2, 3, 4, 6, 8].includes(order)
  },
}

export default KuramotoSivashinskyModule
