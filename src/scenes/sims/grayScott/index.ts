import type { SimModule, PerfTier, SymmetryType } from '@/scenes/engine/types'
import { GrayScottScene, GRAY_SCOTT_LEVA_SCHEMA } from './Scene'
import type { GrayScottConfig } from './Scene'
import { GRAY_SCOTT_PRESETS } from './presets'

// GPU state is managed inside Scene.tsx via useRef/useEffect;
// no CPU-side state object is needed.
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface GrayScottState {}

const GrayScottModule: SimModule<GrayScottConfig, GrayScottState> = {
  id: 'gray-scott',
  title: 'Gray-Scott Reaction-Diffusion',
  description:
    'Two-species reaction-diffusion PDE (Gray & Scott 1984) that generates Turing-like ' +
    'spatial patterns — spots, stripes, spirals, and mazes — depending on feed rate F ' +
    'and kill rate k. ' +
    'GPU ping-pong integration with configurable diffusion coefficients Du and Dv.',

  defaults: {
    F: 0.030,
    k: 0.062,
    Du: 0.16,
    Dv: 0.08,
    dt: 1.0,
    substeps: 4,
    gridSize: 256,
    colormap: 'viridis',
  },

  presets: GRAY_SCOTT_PRESETS,

  schema: GRAY_SCOTT_LEVA_SCHEMA,

  Scene: GrayScottScene,

  init(_config: GrayScottConfig, _perf: PerfTier): GrayScottState {
    // GPU compute loop is driven by useFrame inside Scene.tsx; no CPU state here
    return {}
  },

  step(_state: GrayScottState, _dt: number): void {
    // GPU substeps run inside Scene.tsx useFrame
  },

  dispose(_state: GrayScottState): void {
    // GPU resources cleaned up via Scene useEffect cleanup
  },

  /**
   * Gray-Scott supports C_n and D_n symmetric initial V-perturbation masks;
   * pattern formation preserves the symmetry absent noise.
   */
  symmetryApplies(type: SymmetryType, order: number): boolean {
    return (type === 'C' || type === 'D') && order >= 1
  },
}

export default GrayScottModule
