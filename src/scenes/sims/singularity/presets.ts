import type { SingularityConfig } from './index'

/**
 * Built-in presets for the Singularity shader sim.
 *
 * These are partial configs merged on top of the module defaults.
 * Values are tuned to reproduce visually distinct aesthetics.
 */
export const SINGULARITY_PRESETS: Record<string, Partial<SingularityConfig>> = {
  /** Default: matches the original Home.tsx scroll-driven values at rest */
  default: {
    speed: 5.0,
    intensity: 0.5,
    size: 1.0,
    waveStrength: 0.5,
    colorShift: 0.1,
  },
  /** Intense: maximally turbulent, bright accretion disk */
  intense: {
    speed: 12.0,
    intensity: 1.8,
    size: 0.7,
    waveStrength: 1.4,
    colorShift: 0.6,
  },
  /** Subtle: slow, dark, meditative — suitable for background sections */
  subtle: {
    speed: 2.0,
    intensity: 0.18,
    size: 1.4,
    waveStrength: 0.15,
    colorShift: 0.0,
  },
}
