import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { shaderMaterial } from '@react-three/drei'
import * as THREE from 'three'
import type { SingularityConfig } from './index'
import type { PerfTier, SymmetryConfig } from '@/scenes/engine/types'

// ---------------------------------------------------------------------------
// Vertex shader — fullscreen quad, passes UV to fragment
// ---------------------------------------------------------------------------
const vertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

// ---------------------------------------------------------------------------
// Fragment shader — port of src/components/shaders/Singularity.tsx
// Adapts from react-shaders mainImage(iResolution, iTime) convention
// to three.js uniforms (u_resolution, u_time).
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

vec3 blackholeColorRamp(float t) {
  if (t < 0.1)   return vec3(0.0, 0.0, 0.0);
  if (t < 0.25)  return mix(vec3(0.0), vec3(1.0), (t - 0.1) / 0.15);
  if (t < 0.55)  return mix(vec3(1.0), vec3(1.0, 0.95, 0.36), (t - 0.25) / 0.3);
  if (t < 0.8)   return mix(vec3(1.0, 0.95, 0.36), vec3(1.0, 0.6, 0.18), (t - 0.55) / 0.25);
  if (t < 0.95)  return mix(vec3(1.0, 0.6, 0.18), vec3(0.9, 0.33, 0.05), (t - 0.8) / 0.15);
  return vec3(0.1, 0.07, 0.07);
}

void main() {
  // Reconstruct gl_FragCoord-style from vUv + resolution
  vec2 F = vUv * u_resolution;
  vec2 r = u_resolution;

  float i = 0.2 * u_speed, a;
  vec2 p = (F + F - r) / r.y / (0.7 * u_size),
       d = vec2(-1.0, 1.0),
       b = p - i * d,
       c = p * mat2(1.0, 1.0, d / (0.1 + i / dot(b, b)));

  mat2 rot = mat2(
    cos(0.5 * log(a = dot(c, c)) + u_time * i * u_speed),
    -sin(0.5 * log(a) + u_time * i * u_speed),
    sin(0.5 * log(a) + u_time * i * u_speed + 33.0),
    cos(0.5 * log(a) + u_time * i * u_speed + 33.0)
  );
  vec2 v = c * rot / i;
  vec2 w = vec2(0.0);

  for (float j = 0.0; j < 9.0; j++) {
    i += 1.0;
    w += 1.0 + sin(v * u_waveStrength);
    v += 0.7 * sin(v.yx * i + u_time * u_speed) / i + 0.5;
  }

  i = length(sin(v / 0.3) * 0.4 + c * (3.0 + d));

  float color_t = clamp(
    (length(p) - 0.4) * 1.4
    + 0.25 * sin(u_time * 0.2 + length(c) * 4.0)
    + u_colorShift * 0.2,
    0.0, 1.0
  );
  vec3 colorRamp = blackholeColorRamp(color_t);

  float brightness = 1.0 - exp(
    -exp(c.x * 0.7)
      / w.x
      / (2.0 + i * i / 4.0 - i)
      / (0.5 + 1.0 / a)
      / (0.03 + abs(length(p) - 0.7))
      * u_intensity
  );

  gl_FragColor = vec4(colorRamp * brightness, 1.0);
}
`

// ---------------------------------------------------------------------------
// ShaderMaterial via drei (auto-attaches to mesh, hot-reloadable)
// ---------------------------------------------------------------------------
const SingularityMaterial = shaderMaterial(
  {
    u_time: 0.0,
    u_resolution: new THREE.Vector2(1, 1),
    u_speed: 5.0,
    u_intensity: 0.5,
    u_size: 1.0,
    u_waveStrength: 0.5,
    u_colorShift: 0.1,
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
