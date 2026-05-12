import * as THREE from 'three'
import { GPUComputationRenderer } from 'three/examples/jsm/misc/GPUComputationRenderer.js'

// ---------------------------------------------------------------------------
// Capability detection
// ---------------------------------------------------------------------------

/**
 * Returns true if the WebGL context supports rendering to RGBA16F textures
 * (EXT_color_buffer_float or OES_texture_half_float_linear, depending on
 * WebGL1 vs WebGL2). Three.js GPUComputationRenderer prefers RGBA32F; this
 * flag tells callers whether to downgrade to RGBA16F.
 */
export function detectRGBA16F(gl: WebGLRenderingContext | WebGL2RenderingContext): boolean {
  return (
    gl.getExtension('EXT_color_buffer_float') !== null ||
    gl.getExtension('OES_texture_half_float') !== null
  )
}

/**
 * Returns true if RGBA32F render targets are supported (preferred path).
 */
export function detectRGBA32F(gl: WebGLRenderingContext | WebGL2RenderingContext): boolean {
  return gl.getExtension('EXT_color_buffer_float') !== null
}

// ---------------------------------------------------------------------------
// Compute field factory
// ---------------------------------------------------------------------------

export interface ComputeFieldOptions {
  /** Three.js WebGLRenderer instance (must be already initialized) */
  renderer: THREE.WebGLRenderer
  /** Width of the compute texture in texels */
  width: number
  /** Height of the compute texture in texels */
  height: number
  /**
   * Function returning the initial RGBA Float32Array data.
   * Called once at construction. Length must be width * height * 4.
   */
  initial: (width: number, height: number) => Float32Array
  /** GLSL fragment shader source. Use `textureField` sampler2D uniform. */
  fragmentShader: string
  /** Additional uniforms to expose to the fragment shader */
  uniforms: Record<string, THREE.IUniform>
}

export interface ComputeField {
  /** Advance the simulation by one substep */
  step(): void
  /**
   * The current output render target. Bind as a texture sampler in your
   * display material: `material.uniforms.uField.value = field.texture.texture`.
   */
  texture: THREE.WebGLRenderTarget
  /** Release all GPU resources. Call on scene unmount. */
  dispose(): void
}

/**
 * Creates a GPU compute field using Three.js GPUComputationRenderer.
 *
 * Automatically detects RGBA32F vs RGBA16F capability and sets the renderer's
 * internal format accordingly.
 */
export function createComputeField(options: ComputeFieldOptions): ComputeField {
  const { renderer, width, height, initial, fragmentShader, uniforms } = options

  const gpu = new GPUComputationRenderer(width, height, renderer)

  const gl = renderer.getContext()
  if (!detectRGBA32F(gl)) {
    if (detectRGBA16F(gl)) {
      gpu.setDataType(THREE.HalfFloatType)
    }
  }

  const initData = initial(width, height)
  const initTexture = gpu.createTexture()
  const pixelData = initTexture.image.data as Float32Array
  for (let i = 0; i < initData.length; i++) {
    pixelData[i] = initData[i]
  }

  const variable = gpu.addVariable('textureField', fragmentShader, initTexture)
  gpu.setVariableDependencies(variable, [variable])

  for (const [key, uniform] of Object.entries(uniforms)) {
    variable.material.uniforms[key] = uniform
  }

  const error = gpu.init()
  if (error !== null) {
    throw new Error(`GPUComputationRenderer init failed: ${error}`)
  }

  return {
    step() {
      gpu.compute()
    },
    get texture() {
      return gpu.getCurrentRenderTarget(variable)
    },
    dispose() {
      const rt1 = gpu.getCurrentRenderTarget(variable)
      const rt2 = gpu.getAlternateRenderTarget(variable)
      rt1.dispose()
      rt2.dispose()
      initTexture.dispose()
    },
  }
}
