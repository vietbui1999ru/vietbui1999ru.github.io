import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the FFT and ETDRK4 solvers to test KS glue logic in isolation.
vi.mock('@/scenes/solvers/fft', () => ({
  fftForward: vi.fn((u: Float64Array) => {
    const N = u.length
    // Trivial spectrum: DC = mean, rest = 0 (good enough for glue-logic tests).
    const re = new Float64Array(N)
    const im = new Float64Array(N)
    let sum = 0
    for (let i = 0; i < N; i++) sum += u[i]
    re[0] = sum
    return { re, im }
  }),
  fftInverse: vi.fn((re: Float64Array, _im: Float64Array, N: number) => {
    // Return a simple mapping so downstream arithmetic doesn't explode.
    const out = new Float64Array(N)
    for (let i = 0; i < N; i++) out[i] = re[i]
    return out
  }),
}))

vi.mock('@/scenes/solvers/etdrk4', () => ({
  // Scalar step: keep the state unchanged so ksStep's plumbing is tested,
  // not the exponential integrator math (that has its own tests).
  etdrk4Step: vi.fn(
    (_L: number, _N: (t: number, u: number) => number, _t: number, u: number, _dt: number) => u,
  ),
}))

import {
  createKSState,
  ksStep,
  ksSymmetricIC,
} from '@/scenes/sims/kuramotoSivashinsky/compute'
import { etdrk4Step } from '@/scenes/solvers/etdrk4'

const BASE_CONFIG = { L: 32 * Math.PI, N: 64, nu: 1.0, dt: 0.05 }

beforeEach(() => {
  ;(etdrk4Step as ReturnType<typeof vi.fn>).mockClear()
})

describe('createKSState', () => {
  it('creates state with correct array length', () => {
    const u0 = new Float64Array(64).fill(0)
    const state = createKSState(u0, BASE_CONFIG)
    expect(state.u.length).toBe(64)
    expect(state.k.length).toBe(64)
    expect(state.L_hat.length).toBe(64)
    expect(state.time).toBe(0)
  })

  it('linear operator is zero at k=0', () => {
    const u0 = new Float64Array(64).fill(0)
    const state = createKSState(u0, BASE_CONFIG)
    expect(state.L_hat[0]).toBeCloseTo(0, 12)
  })

  it('linear operator is negative for k>0 (damped high frequencies)', () => {
    const u0 = new Float64Array(64).fill(0)
    const state = createKSState(u0, BASE_CONFIG)
    expect(state.L_hat[8]).toBeLessThan(0)
  })
})

describe('ksStep', () => {
  it('advances time by dt', () => {
    const u0 = new Float64Array(64).fill(0.1)
    const state = createKSState(u0, BASE_CONFIG)
    const next = ksStep(state, BASE_CONFIG)
    expect(next.time).toBeCloseTo(BASE_CONFIG.dt, 10)
  })

  it('calls etdrk4Step twice per Fourier mode (real + imag)', () => {
    const u0 = new Float64Array(64).fill(0.1)
    const state = createKSState(u0, BASE_CONFIG)
    ksStep(state, BASE_CONFIG)
    // 64 modes * 2 components = 128 scalar ETDRK4 calls
    expect(etdrk4Step).toHaveBeenCalledTimes(128)
  })

  it('returns a new state object (immutable step)', () => {
    const u0 = new Float64Array(64).fill(0.1)
    const state = createKSState(u0, BASE_CONFIG)
    const next = ksStep(state, BASE_CONFIG)
    expect(next).not.toBe(state)
    expect(next.u).not.toBe(state.u)
  })
})

describe('ksSymmetricIC', () => {
  it('returns array of length N', () => {
    const u = ksSymmetricIC(64, 32 * Math.PI, 4)
    expect(u.length).toBe(64)
  })

  it('has C_n symmetry: u[i] ≈ u[i + N/n] for exact C_n ICs', () => {
    const N = 128
    const L = 32 * Math.PI
    const n = 2
    const u = ksSymmetricIC(N, L, n, 1, 1.0)
    for (let i = 0; i < N / 2; i++) {
      expect(u[i]).toBeCloseTo(u[i + N / 2], 8)
    }
  })

  it('energy is bounded (not zero, not infinite)', () => {
    const u = ksSymmetricIC(512, 32 * Math.PI, 4)
    const energy = u.reduce((s, v) => s + v * v, 0) / u.length
    expect(energy).toBeGreaterThan(0)
    expect(energy).toBeLessThan(1e6)
  })
})
