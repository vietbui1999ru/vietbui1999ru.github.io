import type { SimModule, SymmetryType } from '@/scenes/engine/types'
import { KuramotoSivashinskyScene, KS_LEVA_SCHEMA } from './Scene'
import type { KSConfig } from './Scene'
import { KS_PRESETS } from './presets'

const KuramotoSivashinskyModule: SimModule<KSConfig> = {
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

  /**
   * KS supports C_n symmetric ICs generated as Fourier mode sums with
   * n-fold symmetry. Valid orders: 1, 2, 3, 4, 6, 8.
   */
  symmetryApplies(type: SymmetryType, order: number): boolean {
    return type === 'C' && [1, 2, 3, 4, 6, 8].includes(order)
  },
}

export default KuramotoSivashinskyModule
