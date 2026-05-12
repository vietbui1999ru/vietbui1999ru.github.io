import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { shaderMaterial } from '@react-three/drei'
import * as THREE from 'three'
import type { SingularityConfig } from './index'
import type { PerfTier, SymmetryConfig } from '@/scenes/engine/types'

// ---------------------------------------------------------------------------
// Vertex shader — fullscreen quad in NDC.
// Bypasses the camera: PlaneGeometry(2, 2) already spans NDC [-1, +1] in xy,
// so writing `position.xy` directly to clip-space gives a true fullscreen quad
// regardless of whether the enclosing Canvas uses a perspective or
// orthographic projection. This is the standard shader-only fullscreen pattern.
// ---------------------------------------------------------------------------
const vertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

// ---------------------------------------------------------------------------
// Fragment shader — faithful port of src/components/shaders/Singularity.tsx.
// Legacy used the react-shaders mainImage(iResolution, iTime) convention;
// this version adapts it to three.js uniforms (u_resolution, u_time) but
// preserves the EXACT algorithm:
//
//   - No color-ramp function. Color emerges from per-channel exponential
//     tinting via colorGrad = vec4(.6, -.4, -1, 0) * u_colorShift.
//   - Final output is vec4(1 - exp(-exp(c.x * colorGrad) / w.xyyx / ...))
//     which produces RGBA directly; w.xyyx is a vec4 swizzle of vec2 w.
//   - The mat2-of-vec4-cos construction for the rotation is preserved as-is
//     (Shadertoy golf pattern: cos with phase offsets in 0/33/11/0).
// ---------------------------------------------------------------------------
const fragmentShader = /* glsl */ `
precision highp float;

uniform float u_time;
uniform vec2  u_resolution;
uniform float u_speed;
uniform float u_intensity;
uniform float u_size;
uniform float u_waveStrength;
uniform float u_colorShift;

varying vec2 vUv;

void main() {
  vec2 F = vUv * u_resolution;
  vec2 r = u_resolution;

  float i = 0.2 * u_speed;
  vec2 p = (F + F - r) / r.y / (0.7 * u_size);
  vec2 d = vec2(-1.0, 1.0);
  vec2 b = p - i * d;
  vec2 c = p * mat2(1.0, 1.0, d / (0.1 + i / dot(b, b)));

  float a = dot(c, c);
  // Rotation built from cos() of a vec4 with phase offsets (0, 33, 11, 0).
  // Matches legacy's mat2(cos(.5*log(a) + iTime*i*speed + vec4(0,33,11,0))).
  vec4 phase = 0.5 * log(a) + u_time * i * u_speed + vec4(0.0, 33.0, 11.0, 0.0);
  vec4 cph = cos(phase);
  mat2 rot = mat2(cph.x, cph.y, cph.z, cph.w);
  vec2 v = c * rot / i;
  vec2 w = vec2(0.0);

  for (float j = 0.0; j < 9.0; j++) {
    i += 1.0;
    w += 1.0 + sin(v * u_waveStrength);
    v += 0.7 * sin(v.yx * i + u_time * u_speed) / i + 0.5;
  }

  i = length(sin(v / 0.3) * 0.4 + c * (3.0 + d));

  vec4 colorGrad = vec4(0.6, -0.4, -1.0, 0.0) * u_colorShift;

  // Per-channel exponential tint. c.x * colorGrad yields distinct exponents
  // per RGBA channel → hue emerges from geometry. w.xyyx swizzles vec2 → vec4.
  vec4 innerExp = exp(c.x * colorGrad);
  vec4 denom = w.xyyx
             * (2.0 + i * i / 4.0 - i)
             * (0.5 + 1.0 / a)
             * (0.03 + abs(length(p) - 0.7));

  gl_FragColor = 1.0 - exp(-innerExp / denom * u_intensity);
}
`

// ---------------------------------------------------------------------------
// ShaderMaterial via drei (auto-attaches to mesh, hot-reloadable)
// ---------------------------------------------------------------------------
const SingularityMaterial = shaderMaterial(
  {
    u_time: 0.0,
    u_resolution: new THREE.Vector2(1, 1),
    u_speed: 1.0,
    u_intensity: 1.0,
    u_size: 1.0,
    u_waveStrength: 1.0,
    u_colorShift: 1.0,
  },
  vertexShader,
  fragmentShader,
)

// Extend three.js namespace so JSX can reference <singularityMaterial />
// (drei extend call done at module load time)
import { extend } from '@react-three/fiber'
extend({ SingularityMaterial })

// TypeScript JSX element declaration
declare module '@react-three/fiber' {
  interface ThreeElements {
    singularityMaterial: React.PropsWithChildren<{
      ref?: React.Ref<THREE.ShaderMaterial & {
        u_time: number
        u_resolution: THREE.Vector2
        u_speed: number
        u_intensity: number
        u_size: number
        u_waveStrength: number
        u_colorShift: number
      }>
    }>
  }
}

// ---------------------------------------------------------------------------
// Scene component
// ---------------------------------------------------------------------------

export interface SingularitySceneProps {
  config: SingularityConfig
  perf: PerfTier
  symmetry: SymmetryConfig
}

/**
 * Fullscreen plane with the Singularity shader applied as a three.js
 * ShaderMaterial. The plane spans the full NDC screen (-1 to +1 in x and y)
 * and sits at z=0 in front of the orthographic camera.
 *
 * The sim is shader-only: there is no CPU state, no integration loop.
 * `u_time` is driven by the r3f frame clock.
 */
export function SingularityScene({ config }: SingularitySceneProps): React.ReactElement {
  const matRef = useRef<THREE.ShaderMaterial & {
    u_time: number
    u_resolution: THREE.Vector2
    u_speed: number
    u_intensity: number
    u_size: number
    u_waveStrength: number
    u_colorShift: number
  }>(null)

  // Keep uniforms in sync with leva config
  const uniforms = useMemo(
    () => ({
      u_speed: config.speed,
      u_intensity: config.intensity,
      u_size: config.size,
      u_waveStrength: config.waveStrength,
      u_colorShift: config.colorShift,
    }),
    [config],
  )

  useFrame(({ clock, size }) => {
    if (!matRef.current) return
    matRef.current.u_time = clock.getElapsedTime()
    matRef.current.u_resolution.set(size.width, size.height)
    matRef.current.u_speed = uniforms.u_speed
    matRef.current.u_intensity = uniforms.u_intensity
    matRef.current.u_size = uniforms.u_size
    matRef.current.u_waveStrength = uniforms.u_waveStrength
    matRef.current.u_colorShift = uniforms.u_colorShift
  })

  return (
    // Fullscreen quad: PlaneGeometry covers NDC [-1,1] × [-1,1] at z=0
    <mesh>
      <planeGeometry args={[2, 2]} />
      <singularityMaterial ref={matRef} />
    </mesh>
  )
}
