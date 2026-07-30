import { describe, it, expect } from "vitest";
import {
  magneticField,
  lorentzForce,
  velocityVerletStep,
  type MagneticParticle,
  type MagneticSource,
} from "@/scenes/sims/magnetic/physics";

// Uniform B in z direction achieved by a very strong far-away dipole along z
// For testing circular motion energy conservation, we use an analytical constant B
// by constructing sources such that the field at origin is (0, 0, B0)
// --- easier: directly test lorentzForce and energy conservation in a constant field
// by using velocityVerletStep with a mock source that gives constant B.

// Mock source: use a dipole placed far away along z so B at origin ≈ (0,0,B_approx)
// Better: test via cross product

describe("lorentzForce", () => {
  it("v in x, B in z → force in -y (right-hand rule for positive charge)", () => {
    const v = { x: 1, y: 0, z: 0 };
    const B = { x: 0, y: 0, z: 1 };
    const F = lorentzForce(v, B, 1);
    // v × B = (1,0,0) × (0,0,1) = (0*1 - 0*0, 0*0 - 1*1, 1*0 - 0*0) = (0,-1,0)
    expect(F.x).toBeCloseTo(0, 10);
    expect(F.y).toBeCloseTo(-1, 10);
    expect(F.z).toBeCloseTo(0, 10);
  });

  it("scales with charge", () => {
    const v = { x: 1, y: 0, z: 0 };
    const B = { x: 0, y: 0, z: 1 };
    const F2 = lorentzForce(v, B, 2);
    expect(F2.y).toBeCloseTo(-2, 10);
  });

  it("reverses for negative charge", () => {
    const v = { x: 1, y: 0, z: 0 };
    const B = { x: 0, y: 0, z: 1 };
    const F = lorentzForce(v, B, -1);
    expect(F.y).toBeCloseTo(1, 10);
  });
});

describe("magneticField", () => {
  it("returns zero at source position (singularity guard)", () => {
    const src: MagneticSource = { position: { x: 0, y: 0, z: 0 }, moment: { x: 0, y: 0, z: 1 } };
    const B = magneticField({ x: 0, y: 0, z: 0 }, [src]);
    expect(B.x).toBe(0);
    expect(B.y).toBe(0);
    expect(B.z).toBe(0);
  });

  it("sums contributions from multiple sources", () => {
    const src1: MagneticSource = {
      position: { x: -100, y: 0, z: 0 },
      moment: { x: 0, y: 0, z: 1 },
    };
    const src2: MagneticSource = { position: { x: 100, y: 0, z: 0 }, moment: { x: 0, y: 0, z: 1 } };
    const B_both = magneticField({ x: 0, y: 0, z: 0 }, [src1, src2]);
    const B_one = magneticField({ x: 0, y: 0, z: 0 }, [src1]);
    // With two symmetric sources the z components should add
    expect(Math.abs(B_both.z)).toBeGreaterThan(Math.abs(B_one.z));
  });
});

describe("velocityVerletStep — circular motion energy conservation", () => {
  it("conserves kinetic energy within 1% over 10000 steps in analytic constant-B field", () => {
    // Simulate circular Larmor motion in constant B=(0,0,B0)
    // Use a proxy: set sources to empty and manually pre-compute accel
    // Instead, we place a single dipole extremely far along z with huge moment
    // so that at the test particle position (origin) B ≈ B_approx_z
    // Easier: use a special source arrangement — skip for brevity and instead
    // directly override by testing that the speed (|v|) is conserved.
    // Lorentz force is always perpendicular to v, so |v|² must be constant.

    // Place particle at (1, 0, 0) with velocity (0, 1, 0)
    // Use a far-away dipole along z axis with moment (0,0,M) at (0,0,-1000)
    // That gives B ≈ (mu=M/r³) * 2*zhat at origin
    const M = 1e9; // large moment for near-uniform field
    const sources: MagneticSource[] = [
      { position: { x: 0, y: 0, z: -1000 }, moment: { x: 0, y: 0, z: M } },
    ];

    const v0 = { x: 0, y: 1, z: 0 };
    const particles: MagneticParticle[] = [
      {
        position: { x: 1, y: 0, z: 0 },
        velocity: { ...v0 },
        accel: { x: 0, y: 0, z: 0 },
      },
    ];
    const params = { dt: 0.0001, charge: 1, mass: 1 };

    // Compute initial KE
    const v0sq = v0.x ** 2 + v0.y ** 2 + v0.z ** 2;
    const initialKE = 0.5 * params.mass * v0sq;

    for (let i = 0; i < 10000; i++) {
      velocityVerletStep(particles, sources, params);
    }

    const vf = particles[0].velocity;
    const vfsq = vf.x ** 2 + vf.y ** 2 + vf.z ** 2;
    const finalKE = 0.5 * params.mass * vfsq;

    const drift = Math.abs(finalKE - initialKE) / initialKE;
    expect(drift).toBeLessThan(0.01); // within 1%
  });
});
