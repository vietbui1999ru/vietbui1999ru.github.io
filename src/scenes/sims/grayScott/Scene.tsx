import { useRef, useEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useControls } from 'leva'
import * as THREE from 'three'
import type { PerfTier, SymmetryConfig } from '@/scenes/engine/types'
import reactionDiffusionFrag from './shaders/reaction-diffusion.frag?raw'
import { createGrayScottCompute, type GrayScottComputeConfig } from './compute'

export interface GrayScottConfig extends GrayScottComputeConfig {
  colormap: 'viridis' | 'magma' | 'grayscale'
}

export type GrayScottSceneProps = {
  config: GrayScottConfig
  perf: PerfTier
  symmetry: SymmetryConfig
}

export const GRAY_SCOTT_LEVA_SCHEMA = {
  F:        { value: 0.030,  min: 0.005, max: 0.1,  step: 0.001 },
  k:        { value: 0.062,  min: 0.04,  max: 0.08, step: 0.001 },
  Du:       { value: 0.16,   min: 0.05,  max: 0.5,  step: 0.01  },
  Dv:       { value: 0.08,   min: 0.01,  max: 0.25, step: 0.005 },
  dt:       { value: 1.0,    min: 0.1,   max: 2.0,  step: 0.1   },
  substeps: { value: 4,      min: 1,     max: 16,   step: 1     },
  gridSize: { value: 256,    min: 64,    max: 512,  step: 64    },
  colormap: {
    value: 'viridis' as const,
    options: ['viridis', 'magma', 'grayscale'],
  },
}

// Simple inline colormap LUT textures (1×256 RGBA)
function buildColormapTexture(name: 'viridis' | 'magma' | 'grayscale'): THREE.DataTexture {
  const size = 256
  const data = new Uint8Array(size * 4)
  for (let i = 0; i < size; i++) {
    const t = i / (size - 1)
    let r = 0, g = 0, b = 0
    if (name === 'grayscale') {
      r = g = b = Math.round(t * 255)
    } else if (name === 'viridis') {
      // Approximation of viridis colormap
      r = Math.round((0.267 + t * 0.004 + t * t * (-0.003) + t * t * t * 0.732) * 255)
      g = Math.round((0.004 + t * 1.143 + t * t * (-0.636)) * 255)
      b = Math.round((0.329 + t * 1.098 + t * t * (-1.979) + t * t * t * 1.552) * 255)
    } else {
      // magma approximation
      r = Math.round((0.001 + t * 1.644 + t * t * (-0.645)) * 255)
      g = Math.round((0.000 + t * 0.293 + t * t * 0.707) * 255)
      b = Math.round((0.014 + t * 0.642 + t * t * (-0.656)) * 255)
    }
    data[i * 4]     = Math.min(255, Math.max(0, r))
    data[i * 4 + 1] = Math.min(255, Math.max(0, g))
    data[i * 4 + 2] = Math.min(255, Math.max(0, b))
    data[i * 4 + 3] = 255
  }
  const tex = new THREE.DataTexture(data, size, 1, THREE.RGBAFormat)
  tex.needsUpdate = true
  return tex
}

// Fullscreen NDC bypass: PlaneGeometry(2,2) spans clip space [-1,1],
// so writing position.xy directly to gl_Position gives a true fullscreen
// quad regardless of the enclosing Canvas camera.
const displayVert = /* glsl */ `
varying vec2 v_uv;
void main() {
  v_uv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

const displayFrag = /* glsl */ `
uniform sampler2D u_state;
uniform sampler2D u_colormap;
varying vec2 v_uv;
void main() {
  float v = texture2D(u_state, v_uv).g; // V concentration drives color
  vec3 col = texture2D(u_colormap, vec2(v, 0.5)).rgb;
  gl_FragColor = vec4(col, 1.0);
}
`

/**
 * GrayScottScene — accepts { config, perf, symmetry } per the SimModule contract.
 * Merges `config` into the Leva useControls initial values so the panel
 * reflects whatever preset or config was selected externally.
 *
 * GPU compute is managed via createGrayScottCompute (ping-pong render targets).
 * useFrame steps the compute pipeline and binds the output texture to the
 * display shader material.
 */
export function GrayScottScene({ config, perf: _perf, symmetry: _symmetry }: GrayScottSceneProps) {
  const { F, k, Du, Dv, dt, substeps, gridSize, colormap } = useControls(
    'Gray-Scott',
    {
      F:        { value: config.F,        min: 0.005, max: 0.1,  step: 0.001 },
      k:        { value: config.k,        min: 0.04,  max: 0.08, step: 0.001 },
      Du:       { value: config.Du,       min: 0.05,  max: 0.5,  step: 0.01  },
      Dv:       { value: config.Dv,       min: 0.01,  max: 0.25, step: 0.005 },
      dt:       { value: config.dt,       min: 0.1,   max: 2.0,  step: 0.1   },
      substeps: { value: config.substeps, min: 1,     max: 16,   step: 1     },
      gridSize: { value: config.gridSize, min: 64,    max: 512,  step: 64    },
      colormap: {
        value: config.colormap,
        options: ['viridis', 'magma', 'grayscale'],
      },
    },
  )
  const { gl } = useThree()
  const computeRef = useRef<ReturnType<typeof createGrayScottCompute> | null>(null)
  const materialRef = useRef<THREE.ShaderMaterial | null>(null)
  const colormapTex = useMemo(
    () => buildColormapTexture(colormap as 'viridis' | 'magma' | 'grayscale'),
    [colormap],
  )

  // Initialize / reinitialize compute when grid params change
  useEffect(() => {
    if (computeRef.current) computeRef.current.dispose()
    const cfg = { gridSize, F, k, Du, Dv, dt, substeps }
    computeRef.current = createGrayScottCompute(cfg, reactionDiffusionFrag, gl)
    return () => {
      computeRef.current?.dispose()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gridSize])

  // Update uniforms live when F/k/Du/Dv/dt/substeps change (no GPU reinit)
  useEffect(() => {
    const c = computeRef.current
    if (!c) return
    c.field.setUniform('u_F', F)
    c.field.setUniform('u_k', k)
    c.field.setUniform('u_Du', Du)
    c.field.setUniform('u_Dv', Dv)
    c.field.setUniform('u_dt', dt)
    c.substeps = substeps
  }, [F, k, Du, Dv, dt, substeps])

  useFrame(() => {
    const c = computeRef.current
    if (!c) return
    c.step()
    if (materialRef.current) {
      // c.field.texture is a WebGLRenderTarget; samplers need the underlying Texture.
      const rt = c.field.texture
      materialRef.current.uniforms.u_state.value = rt ? rt.texture : null
      materialRef.current.uniforms.u_colormap.value = colormapTex
    }
  })

  return (
    <mesh>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={displayVert}
        fragmentShader={displayFrag}
        uniforms={{
          u_state:    { value: null },
          u_colormap: { value: colormapTex },
        }}
      />
    </mesh>
  )
}

export default GrayScottScene
