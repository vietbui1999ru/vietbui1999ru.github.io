import { describe, it, expect } from 'vitest'
import { verletStep } from '@/scenes/solvers/verlet'

describe('verletStep', () => {
  /**
   * Symplectic integrators conserve a modified energy (shadow Hamiltonian),
   * which for the simple harmonic oscillator means relative energy drift stays
   * bounded and very small even over long runs.
   *
   * State layout: [x, v] (position, velocity).
   * Acceleration: a(x) = -x (unit spring constant, unit mass).
   */
  it('conserves energy to < 1e-4 relative drift over 100_000 steps (symplectic, bounded oscillation)', () => {
    let x = 1.0
    let v = 0.0
    const dt = 0.01

    function accel(pos: number): number {
      return -pos
    }

    const initialEnergy = 0.5 * (x * x + v * v)

    for (let i = 0; i < 100_000; i++) {
      const result = verletStep(x, v, accel, dt)
      x = result.x
      v = result.v
    }

    const finalEnergy = 0.5 * (x * x + v * v)
    const relDrift = Math.abs(finalEnergy - initialEnergy) / initialEnergy
    expect(relDrift).toBeLessThan(1e-4)
  })

  it('returns position and velocity fields', () => {
    const result = verletStep(1.0, 0.0, (pos) => -pos, 0.01)
    expect(typeof result.x).toBe('number')
    expect(typeof result.v).toBe('number')
  })
})
