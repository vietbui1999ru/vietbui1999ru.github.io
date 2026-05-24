import * as THREE from "three";
import { createComputeField } from "@/scenes/solvers/gpuCompute";

export interface GrayScottComputeConfig {
  gridSize: number;
  F: number;
  k: number;
  Du: number;
  Dv: number;
  dt: number;
  substeps: number;
}

/**
 * Facade over the real ComputeField, exposing a compute() method and
 * setUniform() helper so callers don't need to reach into GPUComputationRenderer
 * internals. The mock in tests returns the same shape.
 */
export interface GrayScottField {
  /** Advance one substep */
  compute(): void;
  /** Read the current render-target texture */
  texture: THREE.WebGLRenderTarget | null;
  /** Update a single named uniform value */
  setUniform(name: string, value: unknown): void;
  /** Release GPU resources */
  dispose(): void;
}

export interface GrayScottCompute {
  field: GrayScottField;
  substeps: number;
  /** Advance the simulation by one display frame (runs `substeps` substeps). */
  step(): void;
  /** Dispose GPU resources. */
  dispose(): void;
}

/**
 * Builds the initial state texture: U=1 everywhere, V=0 except for a few
 * random seed squares that start V≈1 to kick off pattern formation.
 */
function makeInitial(width: number, height: number): Float32Array {
  const data = new Float32Array(width * height * 4);
  // Fill U=1, V=0 base state
  for (let i = 0; i < width * height; i++) {
    data[i * 4] = 1.0; // U
    data[i * 4 + 1] = 0.0; // V
    data[i * 4 + 2] = 0.0;
    data[i * 4 + 3] = 1.0;
  }
  // Seed ~10 random square patches with V≈1 to initiate pattern
  const seedCount = 10;
  const patchSize = Math.max(2, Math.floor(width * 0.04));
  for (let s = 0; s < seedCount; s++) {
    const cx = Math.floor(Math.random() * width);
    const cy = Math.floor(Math.random() * height);
    for (let dy = -patchSize; dy <= patchSize; dy++) {
      for (let dx = -patchSize; dx <= patchSize; dx++) {
        const x = (cx + dx + width) % width;
        const y = (cy + dy + height) % height;
        const idx = (y * width + x) * 4;
        data[idx] = 0.5; // U
        data[idx + 1] = 0.25; // V
      }
    }
  }
  return data;
}

/**
 * Creates a Gray-Scott GPU compute layer backed by two ping-pong textures.
 * Each call to `step()` runs `config.substeps` GPU dispatch passes.
 *
 * @param config   Simulation parameters
 * @param shaderSource  GLSL fragment shader source (imported via ?raw)
 * @param renderer Three.js WebGLRenderer (required by GPUComputationRenderer)
 */
export function createGrayScottCompute(
  config: GrayScottComputeConfig,
  shaderSource: string,
  renderer?: THREE.WebGLRenderer,
): GrayScottCompute {
  // Build uniform map for GPUComputationRenderer variable
  const uniformValues: Record<string, unknown> = {
    u_F: config.F,
    u_k: config.k,
    u_Du: config.Du,
    u_Dv: config.Dv,
    u_dt: config.dt,
    u_texel: new THREE.Vector2(1 / config.gridSize, 1 / config.gridSize),
  };

  const uniforms: Record<string, THREE.IUniform> = {};
  for (const [key, val] of Object.entries(uniformValues)) {
    uniforms[key] = { value: val };
  }

  const rawField = createComputeField({
    // renderer is required by the real API; in tests the whole module is mocked
    renderer: renderer as THREE.WebGLRenderer,
    width: config.gridSize,
    height: config.gridSize,
    initial: makeInitial,
    fragmentShader: shaderSource,
    uniforms,
  });

  // Facade: expose compute() (step alias) + setUniform()
  const field: GrayScottField = {
    compute() {
      rawField.step();
    },
    get texture() {
      return rawField.texture;
    },
    setUniform(name: string, value: unknown) {
      // uniforms object is shared by reference with variable.material.uniforms
      if (uniforms[name]) {
        uniforms[name].value = value;
      }
    },
    dispose() {
      rawField.dispose();
    },
  };

  let _substeps = Math.max(1, config.substeps);

  return {
    field,
    get substeps() {
      return _substeps;
    },
    set substeps(n: number) {
      _substeps = Math.max(1, n);
    },

    step() {
      for (let i = 0; i < _substeps; i++) {
        field.compute();
      }
    },

    dispose() {
      field.dispose();
    },
  };
}
