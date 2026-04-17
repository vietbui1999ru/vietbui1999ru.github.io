import type { GrayScottConfig } from './Scene'

/**
 * Built-in presets for the Gray-Scott Reaction-Diffusion sim.
 *
 * These are partial configs merged on top of the module defaults.
 * Matching the lorenz presets shape: Record<string, Partial<Config>>.
 */
export const GRAY_SCOTT_PRESETS: Record<string, Partial<GrayScottConfig>> = {
  /** Classic spot pattern — activator spots on an inhibitor background. */
  spots: {
    F: 0.030, k: 0.062, Du: 0.16, Dv: 0.08,
    dt: 1.0, substeps: 4, gridSize: 256, colormap: 'viridis',
  },
  /** Thin traveling stripes across the domain. */
  stripes: {
    F: 0.025, k: 0.055, Du: 0.16, Dv: 0.08,
    dt: 1.0, substeps: 4, gridSize: 256, colormap: 'magma',
  },
  /** Labyrinthine maze-like pattern near the Turing bifurcation. */
  maze: {
    F: 0.029, k: 0.057, Du: 0.16, Dv: 0.08,
    dt: 1.0, substeps: 4, gridSize: 256, colormap: 'viridis',
  },
  /** Rotating spiral waves — excitable-medium regime. */
  spiral: {
    F: 0.014, k: 0.054, Du: 0.16, Dv: 0.08,
    dt: 1.0, substeps: 6, gridSize: 256, colormap: 'magma',
  },
  /** Coral-like branching growth with high feed rate. */
  coral: {
    F: 0.062, k: 0.062, Du: 0.16, Dv: 0.08,
    dt: 1.0, substeps: 4, gridSize: 256, colormap: 'grayscale',
  },
}

export const GRAY_SCOTT_DEFAULT_PRESET = 'spots'
