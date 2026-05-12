import { describe, it, expect, vi } from "vitest";

vi.mock("@react-three/fiber", () => ({
  useFrame: vi.fn(),
  useThree: vi.fn(() => ({ gl: {} })),
}));
vi.mock("leva", () => ({
  useControls: vi.fn(() => ({
    F: 0.03,
    k: 0.062,
    Du: 0.16,
    Dv: 0.08,
    dt: 1,
    substeps: 4,
    gridSize: 64,
    colormap: "viridis",
  })),
}));
vi.mock("@/scenes/sims/grayScott/shaders/reaction-diffusion.frag?raw", () => ({
  default: "/* stub */",
}));
vi.mock("@/scenes/sims/grayScott/compute", () => ({
  createGrayScottCompute: vi.fn(() => ({
    field: { texture: null, setUniform: vi.fn(), compute: vi.fn(), dispose: vi.fn() },
    substeps: 4,
    step: vi.fn(),
    dispose: vi.fn(),
  })),
}));

import { GRAY_SCOTT_LEVA_SCHEMA } from "@/scenes/sims/grayScott/Scene";

describe("GrayScottScene (unit)", () => {
  it("leva schema has required keys", () => {
    const keys = ["F", "k", "Du", "Dv", "dt", "substeps", "gridSize", "colormap"];
    for (const key of keys) {
      expect(GRAY_SCOTT_LEVA_SCHEMA).toHaveProperty(key);
    }
  });

  it("default F is 0.030", () => {
    expect(GRAY_SCOTT_LEVA_SCHEMA.F.value).toBeCloseTo(0.03, 3);
  });

  it("colormap options include viridis, magma, grayscale", () => {
    const opts = (GRAY_SCOTT_LEVA_SCHEMA.colormap as { value: string; options: string[] }).options;
    expect(opts).toContain("viridis");
    expect(opts).toContain("magma");
    expect(opts).toContain("grayscale");
  });
});
