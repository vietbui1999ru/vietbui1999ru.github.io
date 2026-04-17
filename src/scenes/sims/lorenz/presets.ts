import type { LorenzConfig } from './Scene'

/**
 * Built-in presets for the Lorenz Attractor sim.
 *
 * These are partial configs merged on top of the module defaults.
 * Matching Singularity's presets shape: Record<string, Partial<Config>>.
 */
export const LORENZ_PRESETS: Record<string, Partial<LorenzConfig>> = {
  /** Classic strange attractor parameters from Lorenz 1963. */
  classic: {
    sigma: 10, rho: 28, beta: 8 / 3, particleCount: 500, dt: 0.005, trailLength: 800,
  },
  /** Near-periodic orbit at high rho. */
  periodic: {
    sigma: 10, rho: 99.96, beta: 8 / 3, particleCount: 200, dt: 0.002, trailLength: 600,
  },
  /** Double-scroll with more particles and longer trails. */
  doubleScroll: {
    sigma: 10, rho: 28, beta: 8 / 3, particleCount: 1000, dt: 0.005, trailLength: 1200,
  },
}
