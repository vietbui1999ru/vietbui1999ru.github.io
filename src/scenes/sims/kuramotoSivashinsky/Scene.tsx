import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { useControls } from 'leva'
import * as THREE from 'three'
import type { PerfTier, SymmetryConfig } from '@/scenes/engine/types'
import { createKSState, ksStep, ksSymmetricIC } from './compute'
import type { KSConfig } from './compute'

export type { KSConfig }

export type KSSceneProps = {
  config: KSConfig & { symmetryOrder: number }
  perf: PerfTier
  symmetry: SymmetryConfig
}

export const KS_LEVA_SCHEMA = {
  L:             { value: 32 * Math.PI, min: 10,   max: 400,  step: 1    },
  N:             { value: 512,          min: 64,   max: 1024, step: 64   },
  nu:            { value: 1.0,          min: 0.1,  max: 4.0,  step: 0.1  },
  dt:            { value: 0.05,         min: 0.01, max: 0.2,  step: 0.01 },
  symmetryOrder: { value: 1,            min: 1,    max: 8,    step: 1    },
}

// Space-time ring buffer: scrolling texture where each row is one time step
const SPACETIME_ROWS = 512

const spaceTimeVert = /* glsl */ `
varying vec2 v_uv;
void main() {
  v_uv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const spaceTimeFrag = /* glsl */ `
uniform sampler2D u_spaceTime;
uniform float u_head;     // normalized ring head position [0,1]
varying vec2 v_uv;
void main() {
  // Remap y so that ring head appears at bottom of the display
  float y = mod(v_uv.y + u_head, 1.0);
  float val = texture2D(u_spaceTime, vec2(v_uv.x, y)).r;
  // Map [-2, 2] amplitude range to [0, 1] for color
  float t = clamp((val + 2.0) / 4.0, 0.0, 1.0);
  // Inferno-like colormap
  vec3 col = vec3(t * 1.2, t * t * 0.8, (1.0 - t) * 0.6 + t * t * 0.4);
  gl_FragColor = vec4(col, 1.0);
}
`

/**
 * KuramotoSivashinskyScene — accepts { config, perf, symmetry } per the SimModule contract.
 * Merges `config` into the Leva useControls initial values so the panel
 * reflects whatever preset or config was selected externally.
 *
 * CPU pseudospectral ETDRK4 integration runs inside useFrame.
 * The space-time diagram renders into a scrolling ring-buffer DataTexture.
 */
export function KuramotoSivashinskyScene({ config, perf: _perf, symmetry: _symmetry }: KSSceneProps) {
  const { L, N, nu, dt, symmetryOrder } = useControls(
    'Kuramoto-Sivashinsky',
    {
      L:             { value: config.L,             min: 10,   max: 400,  step: 1    },
      N:             { value: config.N,             min: 64,   max: 1024, step: 64   },
      nu:            { value: config.nu,            min: 0.1,  max: 4.0,  step: 0.1  },
      dt:            { value: config.dt,            min: 0.01, max: 0.2,  step: 0.01 },
      symmetryOrder: { value: (config as KSSceneProps['config']).symmetryOrder, min: 1, max: 8, step: 1 },
    },
  )

  const stateRef = useRef<ReturnType<typeof createKSState> | null>(null)
  const rowIndexRef = useRef(0)

  // Space-time texture: rows = time, cols = space
  const spaceTimeTex = useMemo(() => {
    const data = new Float32Array(N * SPACETIME_ROWS)
    const tex = new THREE.DataTexture(
      data,
      N,
      SPACETIME_ROWS,
      THREE.RedFormat,
      THREE.FloatType,
    )
    tex.needsUpdate = true
    return tex
  }, [N])

  const materialRef = useRef<THREE.ShaderMaterial | null>(null)

  // Re-initialize when config changes
  useEffect(() => {
    const u0 = ksSymmetricIC(N, L, symmetryOrder)
    const ksConfig = { L, N, nu, dt }
    stateRef.current = createKSState(u0, ksConfig)
    rowIndexRef.current = 0
    // Clear texture
    const data = spaceTimeTex.image.data as Float32Array
    data.fill(0)
    spaceTimeTex.needsUpdate = true
  }, [L, N, nu, dt, symmetryOrder, spaceTimeTex])

  useFrame(() => {
    if (!stateRef.current) return
    const ksConfig = { L, N, nu, dt }
    stateRef.current = ksStep(stateRef.current, ksConfig)

    // Write current u row into the ring buffer texture
    const row = rowIndexRef.current % SPACETIME_ROWS
    rowIndexRef.current++
    const data = spaceTimeTex.image.data as Float32Array
    for (let i = 0; i < N; i++) {
      data[row * N + i] = stateRef.current.u[i]
    }
    spaceTimeTex.needsUpdate = true

    if (materialRef.current) {
      materialRef.current.uniforms.u_head.value =
        (rowIndexRef.current % SPACETIME_ROWS) / SPACETIME_ROWS
    }
  })

  return (
    <mesh>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={spaceTimeVert}
        fragmentShader={spaceTimeFrag}
        uniforms={{
          u_spaceTime: { value: spaceTimeTex },
          u_head:      { value: 0 },
        }}
      />
    </mesh>
  )
}

export default KuramotoSivashinskyScene
