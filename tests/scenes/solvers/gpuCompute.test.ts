import { describe, it, expect, vi } from "vitest";
import { detectRGBA16F } from "@/scenes/solvers/gpuCompute";

// ---------------------------------------------------------------------------
// Pure-function unit test: RGBA16F capability detection
// Mocks WebGLRenderingContext; no GPU required.
// ---------------------------------------------------------------------------
describe("detectRGBA16F (unit, no WebGL required)", () => {
  it("returns true when EXT_color_buffer_float is available", () => {
    const mockGL = {
      getExtension: vi.fn((name: string) => (name === "EXT_color_buffer_float" ? {} : null)),
    } as unknown as WebGLRenderingContext;
    expect(detectRGBA16F(mockGL)).toBe(true);
  });

  it("returns false when EXT_color_buffer_float is not available", () => {
    const mockGL = {
      getExtension: vi.fn(() => null),
    } as unknown as WebGLRenderingContext;
    expect(detectRGBA16F(mockGL)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Integration test: GPU advection (requires real WebGL context).
// Skipped in jsdom; will run in Playwright E2E (Phase 19).
// ---------------------------------------------------------------------------
function hasWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    return gl !== null;
  } catch {
    return false;
  }
}

describe.skipIf(!hasWebGL())("createComputeField integration (WebGL required)", () => {
  it("advances r-channel by 1 per step over 3 steps", async () => {
    const THREE = await import("three");
    const { createComputeField } = await import("@/scenes/solvers/gpuCompute");

    const renderer = new THREE.WebGLRenderer();
    const width = 4;
    const height = 4;

    const field = createComputeField({
      renderer,
      width,
      height,
      initial: () => {
        const data = new Float32Array(width * height * 4);
        for (let i = 0; i < width * height; i++) data[i * 4 + 3] = 1;
        return data;
      },
      fragmentShader: `
        uniform sampler2D textureField;
        void main() {
          vec2 uv = gl_FragCoord.xy / resolution.xy;
          vec4 val = texture2D(textureField, uv);
          gl_FragColor = vec4(val.r + 1.0, val.g, val.b, val.a);
        }
      `,
      uniforms: {},
    });

    field.step();
    field.step();
    field.step();

    const buffer = new Float32Array(width * height * 4);
    renderer.readRenderTargetPixels(field.texture, 0, 0, width, height, buffer);

    expect(buffer[0]).toBeCloseTo(3, 1);

    field.dispose();
    renderer.dispose();
  });
});
