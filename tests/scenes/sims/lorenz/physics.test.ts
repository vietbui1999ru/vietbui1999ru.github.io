import { describe, it, expect } from 'vitest'
import { lorenzStep, type LorenzState, type LorenzParams } from '@/scenes/sims/lorenz/physics'

const CLASSIC: LorenzParams = { sigma: 10, rho: 28, beta: 8 / 3, dt: 0.005 }

describe('lorenzStep', () => {
  it('returns a new object (immutable)', () => {
    const s: LorenzState = { x: 1, y: 1, z: 1 }
    const next = lorenzStep(s, CLASSIC)
    expect(next).not.toBe(s)
  })

  it('moves state after one step', () => {
    const s: LorenzState = { x: 1, y: 1, z: 1 }
    const next = lorenzStep(s, CLASSIC)
    expect(next.x).not.toBeCloseTo(s.x, 10)
  })

  it('two nearby trajectories diverge exponentially (positive Lyapunov)', () => {
    // Seed two states that differ by epsilon in x
    const eps = 1e-6
    let s1: LorenzState = { x: 1.0, y: 1.0, z: 1.0 }
    let s2: LorenzState = { x: 1.0 + eps, y: 1.0, z: 1.0 }

    const nSteps = 4000
    for (let i = 0; i < nSteps; i++) {
      s1 = lorenzStep(s1, CLASSIC)
      s2 = lorenzStep(s2, CLASSIC)
    }

    const dx = s2.x - s1.x
    const dy = s2.y - s1.y
    const dz = s2.z - s1.z
    const separation = Math.sqrt(dx * dx + dy * dy + dz * dz)

    // Positive Lyapunov: separation should be >> eps after 4000 steps at dt=0.005 (t=20s)
    expect(separation).toBeGreaterThan(eps * 100)
  })

  it('zero-force fixed point at origin (sigma > 0, rho=0, beta > 0)', () => {
    // At origin with rho=0: dx/dt = sigma*(0-0)=0, dy/dt = 0*(0-0)-0=0, dz/dt=0*0-beta*0=0
    const s: LorenzState = { x: 0, y: 0, z: 0 }
    const next = lorenzStep(s, { sigma: 10, rho: 0, beta: 8 / 3, dt: 0.01 })
    expect(next.x).toBeCloseTo(0, 12)
    expect(next.y).toBeCloseTo(0, 12)
    expect(next.z).toBeCloseTo(0, 12)
  })
})
