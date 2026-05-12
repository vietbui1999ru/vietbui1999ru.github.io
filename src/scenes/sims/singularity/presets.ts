import type { SingularityConfig } from './index'

/**
 * Built-in presets for the Singularity shader sim.
 *
 * These are partial configs merged on top of the module defaults.
 * Values are tuned to reproduce visually distinct aesthetics.
 */
export const SINGULARITY_PRESETS: Record<string, Partial<SingularityConfig>> = {
  /** Default: matches the legacy Home.tsx at-rest values (all 1.0). */
  default: {
    speed: 1.0,
    intensity: 1.0,
    size: 1.0,
    waveStrength: 1.0,
    colorShift: 1.0,
  },
  /** Intense: faster rotation, brighter accretion disk, richer hue. */
  intense: {
    speed: 2.5,
    intensity: 1.8,
    size: 0.7,
    waveStrength: 1.6,
    colorShift: 1.5,
  },
  /** Subtle: slow, dim, near-grayscale for background use. */
  subtle: {
    speed: 0.4,
    intensity: 0.5,
    size: 1.4,
    waveStrength: 0.5,
    colorShift: 0.2,
  },
}
