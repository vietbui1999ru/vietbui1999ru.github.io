import { describe, it, expect } from 'vitest'
import { etdrk4Step } from '@/scenes/solvers/etdrk4'

describe('etdrk4Step', () => {
  /**
   * Stiff scalar ODE du/dt = -100u + sin(t), u(0) = 0.
   * Steady-state (after transient e^(-100t) decays):
   *   u_ss(t) = (sin(t) - 100*cos(t)) / 10001
   * ETDRK4 should match u_ss to < 1e-6 after t >> 1/100.
   */
  it('solves stiff scalar ODE du/dt = -100u + sin(t) accurately past transient', () => {
    const L = -100.0
    const dt = 0.05
    function N(t: number, _u: number): number {
      return Math.sin(t)
    }

    let u = 0.0
    let t = 0.0

    const steps = Math.round(2.0 / dt)
    for (let i = 0; i < steps; i++) {
      u = etdrk4Step(L, N, t, u, dt)
      t += dt
    }

    // Particular solution of du/dt = -100u + sin(t):
    //   u_p = a*sin(t) + b*cos(t) with a=100/10001, b=-1/10001
    //   → u_ss(t) = (100*sin(t) - cos(t)) / 10001
    const uSS = (100 * Math.sin(t) - Math.cos(t)) / 10001.0
    expect(Math.abs(u - uSS)).toBeLessThan(1e-6)
  })

  it('reproduces exact solution for pure linear ODE du/dt = L*u (N=0)', () => {
    const L = -5.0
    const dt = 0.1
    const u0 = 2.0
    let u = u0
    let t = 0.0

    const steps = 20
    for (let i = 0; i < steps; i++) {
      u = etdrk4Step(L, () => 0, t, u, dt)
      t += dt
    }

    const uExact = u0 * Math.exp(L * t)
    expect(Math.abs(u - uExact)).toBeLessThan(1e-10)
  })
})
