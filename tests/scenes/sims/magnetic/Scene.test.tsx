import { describe, it, expect, vi } from "vitest";

vi.mock("@react-three/fiber", () => ({
  useFrame: vi.fn(),
  useThree: vi.fn(() => ({ gl: {}, scene: {}, camera: {} })),
}));
vi.mock("leva", () => ({
  useControls: vi.fn(() => ({
    particleCount: 10,
    charge: 1,
    mass: 1,
    B0: 1,
    dt: 0.005,
    trailLength: 20,
    symmetryOrder: 4,
  })),
}));

import { MAGNETIC_LEVA_SCHEMA } from "@/scenes/sims/magnetic/Scene";

describe("MagneticScene (unit)", () => {
  it("leva schema has all required keys", () => {
    const keys = ["particleCount", "charge", "mass", "B0", "dt", "trailLength", "symmetryOrder"];
    for (const key of keys) {
      expect(MAGNETIC_LEVA_SCHEMA).toHaveProperty(key);
    }
  });

  it("default particleCount is 500", () => {
    expect(MAGNETIC_LEVA_SCHEMA.particleCount.value).toBe(500);
  });
});
