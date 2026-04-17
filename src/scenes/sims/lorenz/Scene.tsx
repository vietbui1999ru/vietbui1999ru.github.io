import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { PerspectiveCamera } from '@react-three/drei'
import { useControls } from 'leva'
import * as THREE from 'three'
import type { PerfTier, SymmetryConfig } from '@/scenes/engine/types'
import { lorenzStep, type LorenzState } from './physics'
import { createTrailBuffer, pushPosition, readTrail } from './trails'

export interface LorenzConfig {
  sigma: number
  rho: number
  beta: number
  particleCount: number
  dt: number
  trailLength: number
}

export type LorenzSceneProps = {
  config: LorenzConfig
  perf: PerfTier
  symmetry: SymmetryConfig
}

export const LORENZ_LEVA_SCHEMA = {
  sigma:         { value: 10,    min: 0,    max: 30,   step: 0.1  },
  rho:           { value: 28,    min: 0,    max: 150,  step: 0.1  },
  beta:          { value: 8 / 3, min: 0,    max: 10,   step: 0.01 },
  particleCount: { value: 500,   min: 10,   max: 2000, step: 10   },
  dt:            { value: 0.005, min: 0.001, max: 0.02, step: 0.001 },
  trailLength:   { value: 800,   min: 50,   max: 2000, step: 50   },
}

interface Particle {
  state: LorenzState
  trail: ReturnType<typeof createTrailBuffer>
  color: THREE.Color
}

function initParticles(count: number, trailLength: number): Particle[] {
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2
    return {
      state: {
        x: Math.cos(angle) * 0.1 + 1,
        y: Math.sin(angle) * 0.1 + 1,
        z: 1 + (i % 5) * 0.01,
      },
      trail: createTrailBuffer(trailLength),
      color: new THREE.Color().setHSL(i / count, 0.9, 0.6),
    }
  })
}

/**
 * LorenzScene — accepts { config, perf, symmetry } per the SimModule contract.
 * Merges `config` into the Leva useControls initial values so the panel
 * reflects whatever preset or config was selected externally.
 *
 * Animation pattern: pre-allocate one Float32Array per particle (persistent,
 * never recreated per frame). useFrame steps physics, refills the array via
 * readTrail, flips attr.needsUpdate, and calls geometry.setDrawRange so
 * WebGL only draws the valid prefix — mirroring the MagneticScene pattern.
 */
export function LorenzScene({ config, perf: _perf, symmetry: _symmetry }: LorenzSceneProps) {
  const { sigma, rho, beta, particleCount, dt, trailLength } = useControls(
    'Lorenz',
    {
      sigma:         { value: config.sigma,         min: 0,    max: 30,   step: 0.1  },
      rho:           { value: config.rho,           min: 0,    max: 150,  step: 0.1  },
      beta:          { value: config.beta,          min: 0,    max: 10,   step: 0.01 },
      particleCount: { value: config.particleCount, min: 10,   max: 2000, step: 10   },
      dt:            { value: config.dt,            min: 0.001, max: 0.02, step: 0.001 },
      trailLength:   { value: config.trailLength,   min: 50,   max: 2000, step: 50   },
    },
  )

  const particles = useRef<Particle[]>([])

  // One persistent Float32Array per particle, keyed on [particleCount, trailLength].
  // Allocated once; mutated in-place every frame by readTrail.
  const trailBuffers = useMemo<Float32Array[]>(() => {
    particles.current = initParticles(particleCount, trailLength)
    return particles.current.map(() => new Float32Array(trailLength * 3))
  }, [particleCount, trailLength])

  // One BufferAttribute ref per particle so useFrame can flip needsUpdate.
  const attrRefs = useRef<(THREE.BufferAttribute | null)[]>([])
  // One BufferGeometry ref per particle so useFrame can call setDrawRange.
  const geoRefs = useRef<(THREE.BufferGeometry | null)[]>([])

  useFrame(() => {
    const params = { sigma, rho, beta, dt }
    for (let i = 0; i < particles.current.length; i++) {
      const p = particles.current[i]
      p.state = lorenzStep(p.state, params)
      pushPosition(p.trail, p.state.x, p.state.y, p.state.z)

      readTrail(p.trail, trailBuffers[i])

      const attr = attrRefs.current[i]
      if (attr) {
        attr.needsUpdate = true
      }

      const geo = geoRefs.current[i]
      if (geo) {
        geo.setDrawRange(0, p.trail.count)
      }
    }
  })

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 0, 15]} fov={50} />
      <group scale={0.1}>
        {trailBuffers.map((buf, i) => (
          <line key={i}>
            <bufferGeometry
              ref={(el) => { geoRefs.current[i] = el as THREE.BufferGeometry | null }}
            >
              <bufferAttribute
                attach="attributes-position"
                args={[buf, 3]}
                count={trailLength}
                ref={(el) => { attrRefs.current[i] = el as THREE.BufferAttribute | null }}
              />
            </bufferGeometry>
            <lineBasicMaterial color={particles.current[i]?.color} transparent opacity={0.7} />
          </line>
        ))}
      </group>
    </>
  )
}

export default LorenzScene
