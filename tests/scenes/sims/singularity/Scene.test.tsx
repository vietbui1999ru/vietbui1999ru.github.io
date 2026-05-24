import { describe, it, expect, vi } from "vitest";
import React from "react";

// ---------------------------------------------------------------------------
// Mock heavy r3f dependencies so jsdom can import the Scene module
// ---------------------------------------------------------------------------
vi.mock("@react-three/fiber", () => ({
  useFrame: vi.fn(),
  useThree: vi.fn(() => ({ clock: { getElapsedTime: () => 0 } })),
  extend: vi.fn(),
}));

vi.mock("@react-three/drei", () => ({
  shaderMaterial: vi.fn((uniforms: Record<string, unknown>, vert: string, frag: string) => {
    // Return a minimal mock component class
    function MockShaderMaterial() {}
    MockShaderMaterial.key = `mock-${Math.random()}`;
    MockShaderMaterial.defaultProps = uniforms;
    // Store vert/frag for inspection
    (MockShaderMaterial as unknown as Record<string, unknown>).__vert = vert;
    (MockShaderMaterial as unknown as Record<string, unknown>).__frag = frag;
    return MockShaderMaterial;
  }),
}));

// Mock three.js at a basic level
vi.mock("three", async () => {
  const actual = await vi.importActual<typeof import("three")>("three");
  return {
    ...actual,
    WebGLRenderer: vi.fn(),
  };
});

import { singularityModule } from "@/scenes/sims/singularity/index";
import { SINGULARITY_PRESETS } from "@/scenes/sims/singularity/presets";

describe("singularityModule", () => {
  it('exports a module with id "singularity"', () => {
    expect(singularityModule.id).toBe("singularity");
  });

  it("has a non-empty title", () => {
    expect(typeof singularityModule.title).toBe("string");
    expect(singularityModule.title.length).toBeGreaterThan(0);
  });

  it("has a non-empty description", () => {
    expect(typeof singularityModule.description).toBe("string");
    expect(singularityModule.description.length).toBeGreaterThan(0);
  });

  it("defaults contain all 5 uniform keys", () => {
    const d = singularityModule.defaults as unknown as Record<string, unknown>;
    expect(d).toHaveProperty("speed");
    expect(d).toHaveProperty("intensity");
    expect(d).toHaveProperty("size");
    expect(d).toHaveProperty("waveStrength");
    expect(d).toHaveProperty("colorShift");
  });

  it("schema contains all 5 uniform keys", () => {
    const s = singularityModule.schema as Record<string, unknown>;
    expect(s).toHaveProperty("speed");
    expect(s).toHaveProperty("intensity");
    expect(s).toHaveProperty("size");
    expect(s).toHaveProperty("waveStrength");
    expect(s).toHaveProperty("colorShift");
  });

  it("symmetryApplies always returns false (singularity has inherent radial symmetry)", () => {
    expect(singularityModule.symmetryApplies("C", 4)).toBe(false);
    expect(singularityModule.symmetryApplies("D", 3)).toBe(false);
    expect(singularityModule.symmetryApplies("none", 1)).toBe(false);
  });
});

describe("SINGULARITY_PRESETS", () => {
  it("has exactly 3 built-in presets: default, intense, subtle", () => {
    const names = Object.keys(SINGULARITY_PRESETS);
    expect(names).toContain("default");
    expect(names).toContain("intense");
    expect(names).toContain("subtle");
    expect(names).toHaveLength(3);
  });

  it("each preset is a partial config with at least one key", () => {
    for (const [name, preset] of Object.entries(SINGULARITY_PRESETS)) {
      expect(Object.keys(preset).length, `Preset "${name}" is empty`).toBeGreaterThan(0);
    }
  });
});
