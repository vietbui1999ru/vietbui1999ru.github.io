import type { MagneticConfig } from "./Scene";

/**
 * Built-in presets for the Magnetic Field sim.
 *
 * Flat partial configs merged on top of the module defaults.
 * Shape: Record<string, Partial<MagneticConfig>> — no label/config wrapper.
 */
export const MAGNETIC_PRESETS: Record<string, Partial<MagneticConfig>> = {
  dipole: {
    particleCount: 500,
    charge: 1,
    mass: 1,
    B0: 1,
    dt: 0.005,
    trailLength: 200,
    symmetryType: "C",
    symmetryOrder: 1,
  },
  quadrupole: {
    particleCount: 800,
    charge: 1,
    mass: 1,
    B0: 1.5,
    dt: 0.004,
    trailLength: 200,
    symmetryType: "D",
    symmetryOrder: 2,
  },
  hexapole: {
    particleCount: 1200,
    charge: 1,
    mass: 1,
    B0: 1.2,
    dt: 0.004,
    trailLength: 200,
    symmetryType: "D",
    symmetryOrder: 3,
  },
  ringTrap: {
    particleCount: 2000,
    charge: 1,
    mass: 0.5,
    B0: 2,
    dt: 0.003,
    trailLength: 300,
    symmetryType: "D",
    symmetryOrder: 6,
  },
  tokamak2d: {
    particleCount: 3000,
    charge: 1,
    mass: 1,
    B0: 3,
    dt: 0.002,
    trailLength: 400,
    symmetryType: "D",
    symmetryOrder: 12,
  },
};
