import type { KSConfig } from './Scene'

/**
 * Built-in presets for the Kuramoto-Sivashinsky sim.
 *
 * These are partial configs merged on top of the module defaults.
 * Matching the GrayScott/Lorenz presets shape: Record<string, Partial<Config>>.
 */
export const KS_PRESETS: Record<string, Partial<KSConfig>> = {
  /** Classic chaotic regime — standard L=32π domain, 512 modes. */
  classic: {
    L: 32 * Math.PI, N: 512, nu: 1.0, dt: 0.05, symmetryOrder: 1,
  },
  /** Turbulent wide domain showing spatio-temporal chaos at L=200. */
  turbulent: {
    L: 200, N: 512, nu: 1.0, dt: 0.05, symmetryOrder: 1,
  },
  /** Quasi-periodic C_2-symmetric IC on a shorter domain. */
  quasiPeriodic: {
    L: 18 * Math.PI, N: 256, nu: 1.0, dt: 0.04, symmetryOrder: 2,
  },
}

export const KS_DEFAULT_PRESET = 'classic'
