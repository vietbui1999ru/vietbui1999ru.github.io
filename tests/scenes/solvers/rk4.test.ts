import { describe, it, expect } from 'vitest'
import { rk4Step } from '@/scenes/solvers/rk4'

describe('rk4Step', () => {
  /**
   * Simple harmonic oscillator: d²x/dt² = -x
   * As first-order system: state = [x, v]
   *   dx/dt = v
   *   dv/dt = -x
   * Analytic solution: x(t) = x0*cos(t) + v0*sin(t)
   * Total energy E = 0.5*(x² + v²) should be conserved.
   */
  it('integrates simple harmonic oscillator with energy drift < 1e-4 over 1000 steps', () => {
    const dt = 0.01
    const state = new Float64Array([1.0, 0.0]) // x=1, v=0

    function f(_t: number, s: Float64Array): Float64Array {
      const result = new Float64Array(2)
      result[0] = s[1]       // dx/dt = v
      result[1] = -s[0]      // dv/dt = -x
      return result
    }

    const initialEnergy = 0.5 * (state[0] ** 2 + state[1] ** 2)

    let t = 0
    for (let i = 0; i < 1000; i++) {
      const next = rk4Step(f, t, state, dt)
      state[0] = next[0]
      state[1] = next[1]
      t += dt
    }

    const finalEnergy = 0.5 * (state[0] ** 2 + state[1] ** 2)
    const relDrift = Math.abs(finalEnergy - initialEnergy) / initialEnergy
    expect(relDrift).toBeLessThan(1e-4)
  })

  it('returns a new Float64Array of the same length as the input state', () => {
    const state = new Float64Array([0.5, -0.5, 1.0])
    function f(_t: number, s: Float64Array): Float64Array {
      const r = new Float64Array(s.length)
      for (let i = 0; i < s.length; i++) r[i] = -s[i]
      return r
    }
    const next = rk4Step(f, 0, state, 0.01)
    expect(next).toBeInstanceOf(Float64Array)
    expect(next.length).toBe(state.length)
  })
})
