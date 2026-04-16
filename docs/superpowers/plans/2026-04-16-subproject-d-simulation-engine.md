# Sub-Project D: Simulation Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single-shader hero with a unified r3f-based simulation engine that renders four math-authentic numerical simulations (Magnetic dipole, Lorenz attractor, Gray-Scott reaction-diffusion, Kuramoto-Sivashinsky), each with constrained-IC symmetry sliders, URL-hash-shareable presets, and GPU-tier adaptive perf.

**Architecture:** Single app-wide `<Canvas>` in `BaseLayout`. Scene registry maps route/scroll slots to active scene. Solver layer provides RK4, Verlet, ETDRK4, GPU compute, and FFT primitives. Each sim declares a `Sim<Config, State>` module with its own scene subtree. Leva panel composes schemas per-scene; `prefers-reduced-motion` + IntersectionObserver pause compute.

**Tech Stack:** three.js, @react-three/fiber, @react-three/drei, leva, detect-gpu, fft.js, vitest (already installed in sub-project A Phase 1).

**Reference Spec:** `docs/superpowers/specs/2026-04-16-vaultcms-graph-sim-design.md` (§7, §8.4, §9, §10).

**Chunks:** This plan is split across three files for review:
- Chunks 1 (this file): Phases 0-6 (deps, types, solvers, GPU compute, symmetry, perf)
- Chunk 2: Phases 7-14 (registry/router/canvas, leva, help, Singularity port, Lorenz, Magnetic, Gray-Scott, KS)
- Chunk 3: Phases 15-19 (playground pages, Home integration, cleanup, perf verification, E2E)

Chunks 2 and 3 will be appended to this same file in separate dispatches. Do not add placeholder headers for them in this chunk.

---

## Phase 0 — Prerequisites

### Pre-Task 0.1: Verify Sub-Project A Phase 1 (vitest) is complete

- [ ] **Step 1: Check that `vitest.config.ts` exists at repo root**

```bash
ls vitest.config.ts
```

Run: `ls vitest.config.ts`
Expected: the file is listed with no error. If the command returns "No such file or directory", **STOP** and output: `BLOCKED: run sub-project A Phase 1 first` — do not proceed with any Phase 1+ tasks until vitest is installed and the harness smoke test passes.

---

## Phase 1 — Dependency install

### Task D1: Install r3f / three / leva / detect-gpu / fft.js

**Files:**
- Modify: `package.json`
- Modify: `pnpm-lock.yaml` (auto-updated by pnpm)

- [ ] **Step 1: Install runtime dependencies**

```bash
pnpm add three @react-three/fiber @react-three/drei leva detect-gpu fft.js
```

Run: `pnpm add three @react-three/fiber @react-three/drei leva detect-gpu fft.js`
Expected: exit code 0; `package.json` `dependencies` now lists `three`, `@react-three/fiber`, `@react-three/drei`, `leva`, `detect-gpu`, `fft.js`.

- [ ] **Step 2: Install TypeScript types for three.js**

```bash
pnpm add -D @types/three
```

Run: `pnpm add -D @types/three`
Expected: exit code 0; `@types/three` appears in `devDependencies`.

- [ ] **Step 3: Verify the project still builds with no usage yet**

```bash
pnpm build
```

Run: `pnpm build`
Expected: build exits 0 with no new TypeScript errors. The new packages are not yet imported anywhere, so the build output is identical to pre-task.

- [ ] **Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore(deps): add r3f/three/drei/leva/detect-gpu/fft.js"
```

---

## Phase 2 — Type definitions + Sim contract

### Task D2: Create `src/scenes/engine/types.ts`

**Files:**
- Create: `src/scenes/engine/types.ts`

- [ ] **Step 1: Create the directory structure**

```bash
mkdir -p src/scenes/engine src/scenes/solvers src/scenes/sims src/scenes/ui
```

Run: `mkdir -p src/scenes/engine src/scenes/solvers src/scenes/sims src/scenes/ui`
Expected: exit code 0; directories created.

- [ ] **Step 2: Create `src/scenes/engine/types.ts`**

```ts
import type React from 'react'

// ---------------------------------------------------------------------------
// Perf tier — determined once at boot by PerfController
// ---------------------------------------------------------------------------
export type PerfTier = 'low' | 'mid' | 'high'

// ---------------------------------------------------------------------------
// Symmetry — constrained initial conditions
// ---------------------------------------------------------------------------
export type SymmetryType = 'none' | 'C' | 'D'

export interface SymmetryConfig {
  type: SymmetryType
  /** order n: C_n gives n-fold rotation; D_n gives n-fold rotation + n reflections */
  order: number
}

// ---------------------------------------------------------------------------
// Scene identifiers
// ---------------------------------------------------------------------------
export type SceneId =
  | 'singularity'
  | 'magnetic'
  | 'lorenz'
  | 'gray-scott'
  | 'kuramoto-sivashinsky'

// ---------------------------------------------------------------------------
// Leva schema — opaque at this layer; each sim provides its own typed schema
// object at runtime. We use unknown here so the engine layer does not import
// leva directly (keeping it optional / tree-shakeable for SSR).
// ---------------------------------------------------------------------------
export type LevaSchema = Record<string, unknown>

// ---------------------------------------------------------------------------
// Sim module contract
// ---------------------------------------------------------------------------
export interface SimModule<Config = unknown, State = unknown> {
  /** Unique identifier matching SceneId */
  id: SceneId

  /** Human-readable title shown in UI */
  title: string

  /** Math description shown in HelpOverlay */
  description: string

  /** Default config values */
  defaults: Config

  /** Named preset configs (partial overrides applied on top of defaults) */
  presets: Record<string, Partial<Config>>

  /** Leva schema object (opaque here; typed inside each sim module) */
  schema: LevaSchema

  /** The r3f scene subtree component */
  Scene: React.FC<{
    config: Config
    perf: PerfTier
    symmetry: SymmetryConfig
  }>

  /** Initialize solver state from config and perf tier */
  init(config: Config, perf: PerfTier): State

  /** Advance simulation by one time step dt (seconds) */
  step(state: State, dt: number): void

  /** Release GPU resources, cancel animation loops, etc. */
  dispose(state: State): void

  /**
   * Returns true when the given symmetry type + order is physically
   * meaningful for this sim. Used by the leva panel to disable invalid combos.
   */
  symmetryApplies(type: SymmetryType, order: number): boolean
}
```

Run: `pnpm tsc --noEmit`
Expected: no TypeScript errors introduced by this file.

- [ ] **Step 3: Commit**

```bash
git add src/scenes/engine/types.ts
git commit -m "feat(scenes): add Sim contract types"
```

---

## Phase 3 — Solvers

### Task D3: RK4 solver (`src/scenes/solvers/rk4.ts`)

**Files:**
- Create: `src/scenes/solvers/rk4.ts`
- Create: `tests/scenes/solvers/rk4.test.ts`

- [ ] **Step 1: Write the failing test first**

Create `tests/scenes/solvers/rk4.test.ts`:

```ts
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
```

- [ ] **Step 2: Run tests — expect FAIL (module missing)**

Run: `pnpm test tests/scenes/solvers/rk4.test.ts`
Expected: FAIL — cannot resolve `@/scenes/solvers/rk4`.

- [ ] **Step 3: Implement `src/scenes/solvers/rk4.ts`**

```ts
/**
 * Classical 4-stage explicit Runge-Kutta (RK4) for autonomous and
 * non-autonomous systems dx/dt = f(t, x) where x is a Float64Array.
 *
 * Returns a new Float64Array holding x(t + dt).
 * Does NOT mutate the input state array.
 */
export function rk4Step(
  f: (t: number, x: Float64Array) => Float64Array,
  t: number,
  x: Float64Array,
  dt: number,
): Float64Array {
  const n = x.length
  const half = dt * 0.5

  const k1 = f(t, x)

  const x2 = new Float64Array(n)
  for (let i = 0; i < n; i++) x2[i] = x[i] + half * k1[i]
  const k2 = f(t + half, x2)

  const x3 = new Float64Array(n)
  for (let i = 0; i < n; i++) x3[i] = x[i] + half * k2[i]
  const k3 = f(t + half, x3)

  const x4 = new Float64Array(n)
  for (let i = 0; i < n; i++) x4[i] = x[i] + dt * k3[i]
  const k4 = f(t + dt, x4)

  const next = new Float64Array(n)
  const sixth = dt / 6.0
  for (let i = 0; i < n; i++) {
    next[i] = x[i] + sixth * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i])
  }
  return next
}
```

- [ ] **Step 4: Run tests — expect PASS**

Run: `pnpm test tests/scenes/solvers/rk4.test.ts`
Expected: `✓ tests/scenes/solvers/rk4.test.ts (2 tests)` with exit code 0.

- [ ] **Step 5: Commit**

```bash
git add src/scenes/solvers/rk4.ts tests/scenes/solvers/rk4.test.ts
git commit -m "feat(scenes): RK4 solver with harmonic oscillator energy test"
```

---

### Task D4: Velocity-Verlet solver (`src/scenes/solvers/verlet.ts`)

**Files:**
- Create: `src/scenes/solvers/verlet.ts`
- Create: `tests/scenes/solvers/verlet.test.ts`

- [ ] **Step 1: Write the failing test first**

Create `tests/scenes/solvers/verlet.test.ts`:

```ts
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
  it('conserves energy to < 1e-6 relative drift over 100_000 steps (symplectic)', () => {
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
    expect(relDrift).toBeLessThan(1e-6)
  })

  it('returns position and velocity fields', () => {
    const result = verletStep(1.0, 0.0, (pos) => -pos, 0.01)
    expect(typeof result.x).toBe('number')
    expect(typeof result.v).toBe('number')
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL (module missing)**

Run: `pnpm test tests/scenes/solvers/verlet.test.ts`
Expected: FAIL — cannot resolve `@/scenes/solvers/verlet`.

- [ ] **Step 3: Implement `src/scenes/solvers/verlet.ts`**

```ts
/**
 * Velocity-Verlet (Störmer-Verlet) symplectic integrator for second-order ODEs
 * of the form d²x/dt² = a(x).
 *
 * This is a 1-DOF variant. For N-body systems call it per-particle.
 * Symplectic property: conserves a modified Hamiltonian exactly → no secular
 * energy drift over arbitrarily long runs (unlike dissipative methods).
 *
 * Algorithm:
 *   x_{n+1} = x_n + v_n * dt + 0.5 * a(x_n) * dt²
 *   a_{n+1} = a(x_{n+1})
 *   v_{n+1} = v_n + 0.5 * (a(x_n) + a(x_{n+1})) * dt
 */
export function verletStep(
  x: number,
  v: number,
  accel: (position: number) => number,
  dt: number,
): { x: number; v: number } {
  const a0 = accel(x)
  const xNew = x + v * dt + 0.5 * a0 * dt * dt
  const a1 = accel(xNew)
  const vNew = v + 0.5 * (a0 + a1) * dt
  return { x: xNew, v: vNew }
}

/**
 * Vector velocity-Verlet for N-dimensional systems where acceleration is a
 * function of the full position vector.
 *
 * positions and velocities are mutated in-place.
 */
export function verletStepVec(
  positions: Float64Array,
  velocities: Float64Array,
  accel: (pos: Float64Array) => Float64Array,
  dt: number,
): void {
  const n = positions.length
  const a0 = accel(positions)

  const newPos = new Float64Array(n)
  for (let i = 0; i < n; i++) {
    newPos[i] = positions[i] + velocities[i] * dt + 0.5 * a0[i] * dt * dt
  }

  const a1 = accel(newPos)

  for (let i = 0; i < n; i++) {
    positions[i] = newPos[i]
    velocities[i] = velocities[i] + 0.5 * (a0[i] + a1[i]) * dt
  }
}
```

- [ ] **Step 4: Run tests — expect PASS**

Run: `pnpm test tests/scenes/solvers/verlet.test.ts`
Expected: `✓ tests/scenes/solvers/verlet.test.ts (2 tests)` with exit code 0.

- [ ] **Step 5: Commit**

```bash
git add src/scenes/solvers/verlet.ts tests/scenes/solvers/verlet.test.ts
git commit -m "feat(scenes): velocity-Verlet symplectic integrator"
```

---

### Task D5: ETDRK4 solver (`src/scenes/solvers/etdrk4.ts`)

**Files:**
- Create: `src/scenes/solvers/etdrk4.ts`
- Create: `tests/scenes/solvers/etdrk4.test.ts`

- [ ] **Step 1: Write the failing test first**

Create `tests/scenes/solvers/etdrk4.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { etdrk4Step } from '@/scenes/solvers/etdrk4'

describe('etdrk4Step', () => {
  /**
   * Scalar stiff linear ODE:  du/dt = L*u + N(t)
   *   L = -100   (stiff linear part)
   *   N(t) = sin(t)   (nonlinear / forcing part — linear here for exact test)
   *
   * Analytic solution (with u(0) = 0):
   *   u(t) = [sin(t) - cos(t) + e^(-100t) * (1 + 100*sin(0) - cos(0)) +
   *            (100*sin(t) - cos(t)) / (1 + 100²)] ...
   *
   * Simplification: for large t the transient e^(-100t) vanishes.
   * Use the particular solution directly:
   *   u_p(t) = (sin(t) - 100*cos(t)) / (1 + 100²)  + (100/(1+100²)) e^(-100t)
   *   u(0)=0 => C = -1/(1+100²) ... exact steady-state:
   *   u_ss(t) = (sin(t) - 100*cos(t)) / 10001
   *
   * After transient decay (t >> 1/100 = 0.01), the ETDRK4 solution should
   * match u_ss to within 1e-6.
   */
  it('solves stiff scalar ODE du/dt = -100u + sin(t) accurately past transient', () => {
    // L is the diagonal linear operator (scalar here)
    const L = -100.0
    const dt = 0.05
    // N is the nonlinear (forcing) part
    function N(t: number, _u: number): number {
      return Math.sin(t)
    }

    let u = 0.0  // u(0) = 0
    let t = 0.0

    // Run past transient: t = 2 (>> 1/100 = 0.01)
    const steps = Math.round(2.0 / dt)
    for (let i = 0; i < steps; i++) {
      u = etdrk4Step(L, N, t, u, dt)
      t += dt
    }

    // Analytic steady-state value at t
    const uSS = (Math.sin(t) - 100 * Math.cos(t)) / 10001.0
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
```

- [ ] **Step 2: Run tests — expect FAIL (module missing)**

Run: `pnpm test tests/scenes/solvers/etdrk4.test.ts`
Expected: FAIL — cannot resolve `@/scenes/solvers/etdrk4`.

- [ ] **Step 3: Implement `src/scenes/solvers/etdrk4.ts`**

```ts
/**
 * Scalar ETDRK4 (Exponential Time Differencing Runge-Kutta order 4)
 * for semi-linear problems of the form:
 *
 *   du/dt = L * u + N(t, u)
 *
 * where L is a scalar (or diagonal entry) of the stiff linear operator, and
 * N is the nonlinear / non-stiff forcing term.
 *
 * This scalar version is used directly for 1D systems where L is diagonal
 * (Kuramoto-Sivashinsky in Fourier space has one scalar L per wavenumber).
 * For vector systems, call this per-mode.
 *
 * Reference: Cox & Matthews (2002), "Exponential time differencing for
 * stiff systems", J. Comput. Phys. 176, 430-455.
 *
 * Coefficients (precomputed for fixed L, dt):
 *   E  = exp(L * dt)
 *   E2 = exp(L * dt / 2)
 *   phi1(c) = (exp(c) - 1) / c  [limit 1 as c→0]
 *   phi1_half = phi1(L * dt / 2)
 *   phi1_full = phi1(L * dt)
 *
 * Stages:
 *   a = E2 * u + phi1(L*dt/2) * (dt/2) * N(t, u)
 *   b = E2 * u + phi1(L*dt/2) * (dt/2) * N(t + dt/2, a)
 *   c = E2 * a + phi1(L*dt/2) * (dt/2) * (2*N(t+dt/2,b) - N(t,u))
 *   u_new = E*u + dt * [phi1 - 3*phi2 + 4*phi3]*N(t,u)
 *              + dt * [2*phi2 - 4*phi3]*N(t+dt/2,a)
 *              + dt * [2*phi2 - 4*phi3]*N(t+dt/2,b)
 *              + dt * [-phi2 + 4*phi3]*N(t+dt,c)
 *
 * For practical use in KS we precompute all phi coefficients outside the
 * time loop. This scalar version recomputes each call; the vector wrapper
 * (in the KS sim) will cache them.
 */

/** Safe phi1 = (exp(c) - 1) / c with Taylor fallback near c=0 */
function phi1(c: number): number {
  if (Math.abs(c) < 1e-8) {
    // Taylor: 1 + c/2 + c²/6 + c³/24
    return 1 + c / 2 + (c * c) / 6 + (c * c * c) / 24
  }
  return (Math.exp(c) - 1) / c
}

/** phi2 = (exp(c) - 1 - c) / c² with Taylor fallback */
function phi2(c: number): number {
  if (Math.abs(c) < 1e-8) {
    return 0.5 + c / 6 + (c * c) / 24 + (c * c * c) / 120
  }
  return (Math.exp(c) - 1 - c) / (c * c)
}

/** phi3 = (exp(c) - 1 - c - c²/2) / c³ with Taylor fallback */
function phi3(c: number): number {
  if (Math.abs(c) < 1e-8) {
    return 1 / 6 + c / 24 + (c * c) / 120 + (c * c * c) / 720
  }
  return (Math.exp(c) - 1 - c - (c * c) / 2) / (c * c * c)
}

/**
 * Advance u by one time step dt using scalar ETDRK4.
 *
 * @param L   - scalar linear operator coefficient (negative for stiff decay)
 * @param N   - nonlinear/forcing function N(t, u)
 * @param t   - current time
 * @param u   - current state value
 * @param dt  - time step size
 * @returns   - new state value u(t + dt)
 */
export function etdrk4Step(
  L: number,
  N: (t: number, u: number) => number,
  t: number,
  u: number,
  dt: number,
): number {
  const c  = L * dt
  const ch = L * dt * 0.5

  const E  = Math.exp(c)
  const E2 = Math.exp(ch)

  const p1h = phi1(ch)
  const p1  = phi1(c)
  const p2  = phi2(c)
  const p3  = phi3(c)

  const half = dt * 0.5

  // Stage a
  const Na = N(t, u)
  const a = E2 * u + p1h * half * Na

  // Stage b
  const Nb = N(t + half, a)
  const b = E2 * u + p1h * half * Nb

  // Stage c
  const Nc = N(t + half, b)
  const c_ = E2 * a + p1h * half * (2 * Nc - Na)

  // Stage d
  const Nd = N(t + dt, c_)

  // Final combination (Cox-Matthews ETDRK4)
  const uNew =
    E * u +
    dt * (p1 - 3 * p2 + 4 * p3) * Na +
    dt * (2 * p2 - 4 * p3) * Nb +
    dt * (2 * p2 - 4 * p3) * Nc +
    dt * (-p2 + 4 * p3) * Nd

  return uNew
}
```

- [ ] **Step 4: Run tests — expect PASS**

Run: `pnpm test tests/scenes/solvers/etdrk4.test.ts`
Expected: `✓ tests/scenes/solvers/etdrk4.test.ts (2 tests)` with exit code 0.

- [ ] **Step 5: Commit**

```bash
git add src/scenes/solvers/etdrk4.ts tests/scenes/solvers/etdrk4.test.ts
git commit -m "feat(scenes): ETDRK4 solver for stiff semi-linear PDEs"
```

---

### Task D6: FFT wrapper (`src/scenes/solvers/fft.ts`)

**Files:**
- Create: `src/scenes/solvers/fft.ts`
- Create: `tests/scenes/solvers/fft.test.ts`

- [ ] **Step 1: Write the failing test first**

Create `tests/scenes/solvers/fft.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { fftForward, fftInverse } from '@/scenes/solvers/fft'

describe('fft round-trip', () => {
  it('forward then inverse recovers the original 256-point signal to 1e-10', () => {
    const N = 256
    const signal = new Float64Array(N)
    // Use a known signal: sum of two sinusoids
    for (let i = 0; i < N; i++) {
      signal[i] = Math.sin((2 * Math.PI * 3 * i) / N) + 0.5 * Math.cos((2 * Math.PI * 7 * i) / N)
    }

    const { re, im } = fftForward(signal)
    const recovered = fftInverse(re, im, N)

    for (let i = 0; i < N; i++) {
      expect(Math.abs(recovered[i] - signal[i])).toBeLessThan(1e-10)
    }
  })

  it('forward + inverse round-trips a pure DC signal', () => {
    const N = 64
    const signal = new Float64Array(N).fill(3.14)
    const { re, im } = fftForward(signal)
    const recovered = fftInverse(re, im, N)
    for (let i = 0; i < N; i++) {
      expect(Math.abs(recovered[i] - 3.14)).toBeLessThan(1e-10)
    }
  })

  it('returns re and im arrays of length N', () => {
    const N = 128
    const signal = new Float64Array(N)
    const { re, im } = fftForward(signal)
    expect(re.length).toBe(N)
    expect(im.length).toBe(N)
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL (module missing)**

Run: `pnpm test tests/scenes/solvers/fft.test.ts`
Expected: FAIL — cannot resolve `@/scenes/solvers/fft`.

- [ ] **Step 3: Implement `src/scenes/solvers/fft.ts`**

```ts
/**
 * Real-valued 1D FFT wrapper around the `fft.js` package.
 *
 * `fft.js` expects interleaved [re0, im0, re1, im1, ...] format.
 * This module provides a friendlier API with separate re/im arrays.
 *
 * For the Kuramoto-Sivashinsky solver we need:
 *   - fftForward(realSignal) → { re, im }  (complex spectrum)
 *   - fftInverse(re, im, N) → realSignal   (recovers real part)
 */

// fft.js ships as a CommonJS module; import default export.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const FFT = require('fft.js') as new (size: number) => {
  size: number
  createComplexArray(): Float64Array
  toComplexArray(input: ArrayLike<number>, output?: Float64Array): Float64Array
  fromComplexArray(input: Float64Array, output?: Float64Array): Float64Array
  transform(out: Float64Array, inp: Float64Array): void
  inverseTransform(out: Float64Array, inp: Float64Array): void
  realTransform(out: Float64Array, inp: Float64Array): void
  completeSpectrum(spectrum: Float64Array): void
}

/** Cache FFT instances by size to avoid repeated allocation */
const fftCache = new Map<number, InstanceType<typeof FFT>>()

function getFFT(n: number): InstanceType<typeof FFT> {
  if (!fftCache.has(n)) {
    fftCache.set(n, new FFT(n))
  }
  return fftCache.get(n)!
}

/**
 * Forward real-to-complex FFT.
 * Input:  real-valued signal of length N (must be power of 2).
 * Output: { re, im } each of length N (full spectrum, Hermitian-symmetric).
 */
export function fftForward(signal: Float64Array): { re: Float64Array; im: Float64Array } {
  const N = signal.length
  const fft = getFFT(N)

  // Build interleaved complex input (imaginary parts = 0 for real signal)
  const complexInput = fft.createComplexArray()
  for (let i = 0; i < N; i++) {
    complexInput[2 * i] = signal[i]
    complexInput[2 * i + 1] = 0
  }

  const complexOutput = fft.createComplexArray()
  fft.transform(complexOutput, complexInput)

  const re = new Float64Array(N)
  const im = new Float64Array(N)
  for (let i = 0; i < N; i++) {
    re[i] = complexOutput[2 * i]
    im[i] = complexOutput[2 * i + 1]
  }
  return { re, im }
}

/**
 * Inverse complex-to-real FFT.
 * Inputs: re, im each of length N.
 * Output: real-valued signal of length N (imaginary parts discarded after IFFT).
 * Normalises by 1/N (matches forward transform convention).
 */
export function fftInverse(re: Float64Array, im: Float64Array, N: number): Float64Array {
  const fft = getFFT(N)

  const complexInput = fft.createComplexArray()
  for (let i = 0; i < N; i++) {
    complexInput[2 * i] = re[i]
    complexInput[2 * i + 1] = im[i]
  }

  const complexOutput = fft.createComplexArray()
  fft.inverseTransform(complexOutput, complexInput)

  const result = new Float64Array(N)
  for (let i = 0; i < N; i++) {
    result[i] = complexOutput[2 * i] / N
  }
  return result
}
```

- [ ] **Step 4: Run tests — expect PASS**

Run: `pnpm test tests/scenes/solvers/fft.test.ts`
Expected: `✓ tests/scenes/solvers/fft.test.ts (3 tests)` with exit code 0.

- [ ] **Step 5: Commit**

```bash
git add src/scenes/solvers/fft.ts tests/scenes/solvers/fft.test.ts
git commit -m "feat(scenes): FFT wrapper (fft.js) with round-trip test"
```

---

## Phase 4 — GPU compute wrapper

### Task D7: `src/scenes/solvers/gpuCompute.ts`

**Files:**
- Create: `src/scenes/solvers/gpuCompute.ts`
- Create: `tests/scenes/solvers/gpuCompute.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/scenes/solvers/gpuCompute.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest'

// ---------------------------------------------------------------------------
// Pure-function unit test: RGBA16F capability detection
// This test mocks WebGLRenderingContext and runs without WebGL hardware.
// ---------------------------------------------------------------------------
describe('detectRGBA16F (unit, no WebGL required)', () => {
  it('returns true when EXT_color_buffer_float is available', () => {
    const mockGL = {
      getExtension: vi.fn((name: string) =>
        name === 'EXT_color_buffer_float' ? {} : null,
      ),
    } as unknown as WebGLRenderingContext
    // Lazy-import after mocking so the module uses our mock
    const { detectRGBA16F } = require('@/scenes/solvers/gpuCompute')
    expect(detectRGBA16F(mockGL)).toBe(true)
  })

  it('returns false when EXT_color_buffer_float is not available', () => {
    const mockGL = {
      getExtension: vi.fn(() => null),
    } as unknown as WebGLRenderingContext
    const { detectRGBA16F } = require('@/scenes/solvers/gpuCompute')
    expect(detectRGBA16F(mockGL)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Integration test: GPU advection (requires real WebGL context).
// Skipped in jsdom; will run in Playwright E2E (Phase 19).
// ---------------------------------------------------------------------------
function hasWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl')
    return gl !== null
  } catch {
    return false
  }
}

describe.skipIf(!hasWebGL())('createComputeField integration (WebGL required)', () => {
  it('advances r-channel by 1 per step over 3 steps', async () => {
    // This test body intentionally verifies the GPU advection contract.
    // When WebGL is unavailable (jsdom), the describe block is skipped.
    // When running under Playwright (Phase 19), this block executes fully.
    const THREE = await import('three')
    const { createComputeField } = await import('@/scenes/solvers/gpuCompute')

    const renderer = new THREE.WebGLRenderer()
    const width = 4
    const height = 4

    const field = createComputeField({
      renderer,
      width,
      height,
      initial: () => {
        const data = new Float32Array(width * height * 4)
        // r=0, g=0, b=0, a=1 for all pixels
        for (let i = 0; i < width * height; i++) data[i * 4 + 3] = 1
        return data
      },
      fragmentShader: `
        uniform sampler2D textureField;
        void main() {
          vec2 uv = gl_FragCoord.xy / resolution.xy;
          vec4 val = texture2D(textureField, uv);
          gl_FragColor = vec4(val.r + 1.0, val.g, val.b, val.a);
        }
      `,
      uniforms: {},
    })

    field.step()
    field.step()
    field.step()

    const buffer = new Float32Array(width * height * 4)
    renderer.readRenderTargetPixels(field.texture, 0, 0, width, height, buffer)

    // First pixel r-channel should be 3 after 3 steps
    expect(buffer[0]).toBeCloseTo(3, 1)

    field.dispose()
    renderer.dispose()
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL (module missing)**

Run: `pnpm test tests/scenes/solvers/gpuCompute.test.ts`
Expected: FAIL — cannot resolve `@/scenes/solvers/gpuCompute`. The `describe.skipIf` block will be skipped in jsdom; only the pure unit tests run (and fail on missing module).

- [ ] **Step 3: Implement `src/scenes/solvers/gpuCompute.ts`**

```ts
import * as THREE from 'three'
import { GPUComputationRenderer } from 'three/examples/jsm/misc/GPUComputationRenderer.js'

// ---------------------------------------------------------------------------
// Capability detection
// ---------------------------------------------------------------------------

/**
 * Returns true if the WebGL context supports rendering to RGBA16F textures
 * (EXT_color_buffer_float or OES_texture_half_float_linear, depending on
 * WebGL1 vs WebGL2). Three.js GPUComputationRenderer prefers RGBA32F; this
 * flag tells callers whether to downgrade to RGBA16F.
 */
export function detectRGBA16F(gl: WebGLRenderingContext | WebGL2RenderingContext): boolean {
  return (
    gl.getExtension('EXT_color_buffer_float') !== null ||
    gl.getExtension('OES_texture_half_float') !== null
  )
}

/**
 * Returns true if RGBA32F render targets are supported (preferred path).
 */
export function detectRGBA32F(gl: WebGLRenderingContext | WebGL2RenderingContext): boolean {
  return gl.getExtension('EXT_color_buffer_float') !== null
}

// ---------------------------------------------------------------------------
// Compute field factory
// ---------------------------------------------------------------------------

export interface ComputeFieldOptions {
  /** Three.js WebGLRenderer instance (must be already initialized) */
  renderer: THREE.WebGLRenderer
  /** Width of the compute texture in texels */
  width: number
  /** Height of the compute texture in texels */
  height: number
  /**
   * Function returning the initial RGBA Float32Array data.
   * Called once at construction. Length must be width * height * 4.
   */
  initial: (width: number, height: number) => Float32Array
  /** GLSL fragment shader source. Use `textureField` sampler2D uniform. */
  fragmentShader: string
  /** Additional uniforms to expose to the fragment shader */
  uniforms: Record<string, THREE.IUniform>
}

export interface ComputeField {
  /** Advance the simulation by one substep */
  step(): void
  /**
   * The current output render target. Bind as a texture sampler in your
   * display material: `material.uniforms.uField.value = field.texture.texture`.
   */
  texture: THREE.WebGLRenderTarget
  /** Release all GPU resources. Call on scene unmount. */
  dispose(): void
}

/**
 * Creates a GPU compute field using Three.js GPUComputationRenderer.
 *
 * Automatically detects RGBA32F vs RGBA16F capability and sets the renderer's
 * internal format accordingly.
 *
 * @example
 * ```ts
 * const field = createComputeField({ renderer, width: 256, height: 256,
 *   initial: () => new Float32Array(256*256*4),
 *   fragmentShader: reactionDiffusionGLSL,
 *   uniforms: { uF: { value: 0.03 }, uK: { value: 0.062 } }
 * })
 * // In useFrame: field.step()
 * // In display material: uniforms.uTexture.value = field.texture.texture
 * ```
 */
export function createComputeField(options: ComputeFieldOptions): ComputeField {
  const { renderer, width, height, initial, fragmentShader, uniforms } = options

  const gpu = new GPUComputationRenderer(width, height, renderer)

  // Check capability and downgrade texture type if RGBA32F unavailable
  const gl = renderer.getContext()
  if (!detectRGBA32F(gl)) {
    if (detectRGBA16F(gl)) {
      gpu.setDataType(THREE.HalfFloatType)
    }
    // If neither is supported, GPUComputationRenderer will throw on init —
    // callers should fall back to a static placeholder scene.
  }

  // Create the initial texture data
  const initData = initial(width, height)
  const initTexture = gpu.createTexture()
  const pixelData = initTexture.image.data as Float32Array
  for (let i = 0; i < initData.length; i++) {
    pixelData[i] = initData[i]
  }

  // Add the variable
  const variable = gpu.addVariable('textureField', fragmentShader, initTexture)

  // Set dependencies (self-referential: ping-pong)
  gpu.setVariableDependencies(variable, [variable])

  // Assign extra uniforms
  for (const [key, uniform] of Object.entries(uniforms)) {
    variable.material.uniforms[key] = uniform
  }

  // Initialize (throws if WebGL state invalid)
  const error = gpu.init()
  if (error !== null) {
    throw new Error(`GPUComputationRenderer init failed: ${error}`)
  }

  return {
    step() {
      gpu.compute()
    },
    get texture() {
      return gpu.getCurrentRenderTarget(variable)
    },
    dispose() {
      // Dispose render targets held by GPUComputationRenderer
      // (Three.js doesn't expose a public dispose, so we release targets manually)
      const rt1 = gpu.getCurrentRenderTarget(variable)
      const rt2 = gpu.getAlternateRenderTarget(variable)
      rt1.dispose()
      rt2.dispose()
      initTexture.dispose()
    },
  }
}
```

- [ ] **Step 4: Run tests — expect PASS (unit tests), SKIP (integration)**

Run: `pnpm test tests/scenes/solvers/gpuCompute.test.ts`
Expected: 2 unit tests pass (`detectRGBA16F` returns true/false correctly); integration describe block is skipped because jsdom has no WebGL context. Exit code 0.

- [ ] **Step 5: Commit**

```bash
git add src/scenes/solvers/gpuCompute.ts tests/scenes/solvers/gpuCompute.test.ts
git commit -m "feat(scenes): GPU compute wrapper with RGBA16F fallback"
```

---

## Phase 5 — Symmetry generators

### Task D8: `src/scenes/engine/Symmetry.ts`

**Files:**
- Create: `src/scenes/engine/Symmetry.ts`
- Create: `tests/scenes/engine/symmetry.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/scenes/engine/symmetry.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { cyclicRing, dihedralRing, cnMask, dnMask } from '@/scenes/engine/Symmetry'

describe('cyclicRing', () => {
  it('returns exactly N points', () => {
    expect(cyclicRing(5, 1.0).length).toBe(5)
  })

  it('all points lie on the given radius', () => {
    const pts = cyclicRing(6, 2.5)
    for (const [x, y] of pts) {
      expect(Math.sqrt(x * x + y * y)).toBeCloseTo(2.5, 8)
    }
  })

  it('is rotationally invariant by 2π/N: rotating each point by one step gives the next point', () => {
    const N = 4
    const pts = cyclicRing(N, 1.0)
    const angle = (2 * Math.PI) / N
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)
    for (let i = 0; i < N; i++) {
      const [x, y] = pts[i]
      const [nx, ny] = pts[(i + 1) % N]
      expect(cos * x - sin * y).toBeCloseTo(nx, 8)
      expect(sin * x + cos * y).toBeCloseTo(ny, 8)
    }
  })
})

describe('dihedralRing', () => {
  it('returns exactly 2N points', () => {
    expect(dihedralRing(5, 1.0).length).toBe(10)
  })

  it('all points lie on the given radius', () => {
    const pts = dihedralRing(4, 3.0)
    for (const [x, y] of pts) {
      expect(Math.sqrt(x * x + y * y)).toBeCloseTo(3.0, 8)
    }
  })

  it('includes reflection: for every point (x, y) there is a point (x, -y)', () => {
    const pts = dihedralRing(3, 1.0)
    for (const [x, y] of pts) {
      const hasReflection = pts.some(
        ([px, py]) => Math.abs(px - x) < 1e-8 && Math.abs(py + y) < 1e-8,
      )
      expect(hasReflection).toBe(true)
    }
  })
})

describe('cnMask', () => {
  it('returns a Float32Array of length size*size', () => {
    const size = 16
    const mask = cnMask(size, 4, (x, y) => Math.sqrt(x * x + y * y))
    expect(mask).toBeInstanceOf(Float32Array)
    expect(mask.length).toBe(size * size)
  })

  it('is N-fold rotationally symmetric: f(r, θ) ≈ f(r, θ + 2π/N)', () => {
    const size = 64
    const N = 4
    const base = (x: number, y: number) => Math.exp(-(x * x + y * y) * 4)
    const mask = cnMask(size, N, base)

    // Sample a few off-axis pixels and verify they match their rotated counterpart
    // Use center-based coordinates: pixel (i, j) → (x, y) in [-1, 1]
    const toIdx = (i: number, j: number) => j * size + i
    const half = size / 2

    // Point at 45°: (half + 8, half) rotated by 90° → (half, half + 8)
    const ix = Math.round(half + 8)
    const iy = Math.round(half)
    const rotX = Math.round(half)
    const rotY = Math.round(half + 8)

    if (ix < size && iy < size && rotX < size && rotY < size) {
      expect(mask[toIdx(ix, iy)]).toBeCloseTo(mask[toIdx(rotX, rotY)], 3)
    }
  })
})

describe('dnMask', () => {
  it('returns a Float32Array of length size*size', () => {
    const mask = dnMask(16, 3, () => 1.0)
    expect(mask).toBeInstanceOf(Float32Array)
    expect(mask.length).toBe(16 * 16)
  })

  it('is N-fold rotationally symmetric (same as cnMask)', () => {
    const size = 32
    const N = 3
    const base = (x: number, y: number) => Math.cos(Math.sqrt(x * x + y * y) * 5)
    const cn = cnMask(size, N, base)
    const dn = dnMask(size, N, base)
    // D_n includes C_n symmetry, so values at all C_n-symmetric pixels must match
    const half = size / 2
    const toIdx = (i: number, j: number) => j * size + i
    const ix = Math.round(half + 4); const iy = Math.round(half + 2)
    // Rotate by 2π/3
    const angle = (2 * Math.PI) / N
    const rx = Math.round(half + Math.cos(angle) * 4 - Math.sin(angle) * 2)
    const ry = Math.round(half + Math.sin(angle) * 4 + Math.cos(angle) * 2)
    if (ix < size && iy < size && rx < size && ry < size) {
      expect(cn[toIdx(ix, iy)]).toBeCloseTo(cn[toIdx(rx, ry)], 3)
      expect(dn[toIdx(ix, iy)]).toBeCloseTo(dn[toIdx(rx, ry)], 3)
    }
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL (module missing)**

Run: `pnpm test tests/scenes/engine/symmetry.test.ts`
Expected: FAIL — cannot resolve `@/scenes/engine/Symmetry`.

- [ ] **Step 3: Implement `src/scenes/engine/Symmetry.ts`**

```ts
/**
 * Symmetry IC generators for constrained initial conditions.
 *
 * Supports:
 *   - C_n  cyclic group of order n  (n-fold rotational symmetry)
 *   - D_n  dihedral group of order n (n-fold rotation + n reflections)
 *
 * Used by each sim's `init()` to place particles / seed textures with the
 * symmetry requested by the user via the Symmetry leva controls.
 */

// ---------------------------------------------------------------------------
// Point-set generators (for particle-based sims: Magnetic, Lorenz)
// ---------------------------------------------------------------------------

/**
 * Returns N points evenly spaced on a circle of the given radius.
 * Points start at angle 0 (positive x-axis) and progress counter-clockwise.
 */
export function cyclicRing(n: number, radius: number): Array<[number, number]> {
  const points: Array<[number, number]> = []
  for (let i = 0; i < n; i++) {
    const angle = (2 * Math.PI * i) / n
    points.push([radius * Math.cos(angle), radius * Math.sin(angle)])
  }
  return points
}

/**
 * Returns 2N points on a circle of the given radius.
 * The first N points are the C_n ring. The second N points are their
 * reflections across the x-axis (y → -y), giving the D_n dihedral arrangement.
 */
export function dihedralRing(n: number, radius: number): Array<[number, number]> {
  const base = cyclicRing(n, radius)
  const reflected: Array<[number, number]> = base.map(([x, y]) => [x, -y])
  return [...base, ...reflected]
}

// ---------------------------------------------------------------------------
// 2D texture mask generators (for PDE sims: Gray-Scott, KS)
// ---------------------------------------------------------------------------

/**
 * Generates a 2D Float32Array of dimensions size×size where each pixel value
 * is the average of base(x, y) evaluated at all N rotations of the pixel's
 * normalized coordinates. This guarantees exact C_n symmetry.
 *
 * Coordinates are mapped to the range [-1, 1] from pixel indices.
 *
 * @param size  - grid size (pixels per side)
 * @param n     - fold order of C_n symmetry
 * @param base  - scalar function of (x, y) in [-1, 1]²
 * @returns     - row-major Float32Array of length size*size
 */
export function cnMask(
  size: number,
  n: number,
  base: (x: number, y: number) => number,
): Float32Array {
  const mask = new Float32Array(size * size)
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      // Map pixel to [-1, 1]
      const x = (i / (size - 1)) * 2 - 1
      const y = (j / (size - 1)) * 2 - 1

      // Average over all C_n rotations
      let sum = 0
      for (let k = 0; k < n; k++) {
        const angle = (2 * Math.PI * k) / n
        const cos = Math.cos(angle)
        const sin = Math.sin(angle)
        const rx = cos * x - sin * y
        const ry = sin * x + cos * y
        sum += base(rx, ry)
      }
      mask[j * size + i] = sum / n
    }
  }
  return mask
}

/**
 * Generates a 2D Float32Array with D_n dihedral symmetry (C_n + reflection).
 *
 * Achieved by first reflecting the coordinates across the x-axis and then
 * averaging the C_n symmetrized values of the original and reflected
 * coordinates. This guarantees the mask is symmetric under both rotation by
 * 2π/n and reflection across the x-axis.
 *
 * @param size  - grid size (pixels per side)
 * @param n     - fold order of D_n symmetry
 * @param base  - scalar function of (x, y) in [-1, 1]²
 * @returns     - row-major Float32Array of length size*size
 */
export function dnMask(
  size: number,
  n: number,
  base: (x: number, y: number) => number,
): Float32Array {
  const mask = new Float32Array(size * size)
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      const x = (i / (size - 1)) * 2 - 1
      const y = (j / (size - 1)) * 2 - 1

      // D_n = C_n + reflection: average over all 2n group elements
      let sum = 0
      for (let k = 0; k < n; k++) {
        const angle = (2 * Math.PI * k) / n
        const cos = Math.cos(angle)
        const sin = Math.sin(angle)

        // Rotation
        const rx = cos * x - sin * y
        const ry = sin * x + cos * y
        sum += base(rx, ry)

        // Rotation of reflection (reflect y first, then rotate)
        const rrx = cos * x + sin * y
        const rry = sin * x - cos * y
        sum += base(rrx, rry)
      }
      mask[j * size + i] = sum / (2 * n)
    }
  }
  return mask
}
```

- [ ] **Step 4: Run tests — expect PASS**

Run: `pnpm test tests/scenes/engine/symmetry.test.ts`
Expected: `✓ tests/scenes/engine/symmetry.test.ts (8 tests)` with exit code 0.

- [ ] **Step 5: Commit**

```bash
git add src/scenes/engine/Symmetry.ts tests/scenes/engine/symmetry.test.ts
git commit -m "feat(scenes): symmetry IC generators (C_n, D_n)"
```

---

## Phase 6 — PerfController

### Task D9: `src/scenes/engine/PerfController.ts`

**Files:**
- Create: `src/scenes/engine/PerfController.ts`
- Create: `tests/scenes/engine/PerfController.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/scenes/engine/PerfController.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// We must mock 'detect-gpu' before importing PerfController
vi.mock('detect-gpu', () => ({
  getGPUTier: vi.fn(),
}))

import { getGPUTier } from 'detect-gpu'
import { getPerfTier, resetPerfCache } from '@/scenes/engine/PerfController'

const mockGetGPUTier = vi.mocked(getGPUTier)

// Helper: mock window.matchMedia for prefers-reduced-motion
function mockMatchMedia(prefersReduced: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn((query: string) => ({
      matches: query.includes('reduce') ? prefersReduced : false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}

describe('getPerfTier — reduced motion short-circuit', () => {
  beforeEach(() => {
    resetPerfCache()
    mockGetGPUTier.mockResolvedValue({ tier: 3, type: 'BENCHMARK' } as never)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns low + reducedMotion=true when prefers-reduced-motion is active, regardless of GPU tier', async () => {
    mockMatchMedia(true)
    const result = await getPerfTier()
    expect(result.tier).toBe('low')
    expect(result.reducedMotion).toBe(true)
  })

  it('does NOT short-circuit when prefers-reduced-motion is off', async () => {
    mockMatchMedia(false)
    const result = await getPerfTier()
    expect(result.reducedMotion).toBe(false)
    expect(result.tier).toBe('high') // GPU tier 3 → high
  })
})

describe('getPerfTier — GPU tier mapping', () => {
  beforeEach(() => {
    resetPerfCache()
    mockMatchMedia(false)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('maps detect-gpu tier 0 → low', async () => {
    mockGetGPUTier.mockResolvedValue({ tier: 0, type: 'BENCHMARK' } as never)
    const result = await getPerfTier()
    expect(result.tier).toBe('low')
  })

  it('maps detect-gpu tier 1 → low', async () => {
    mockGetGPUTier.mockResolvedValue({ tier: 1, type: 'BENCHMARK' } as never)
    const result = await getPerfTier()
    expect(result.tier).toBe('low')
  })

  it('maps detect-gpu tier 2 → mid', async () => {
    mockGetGPUTier.mockResolvedValue({ tier: 2, type: 'BENCHMARK' } as never)
    const result = await getPerfTier()
    expect(result.tier).toBe('mid')
  })

  it('maps detect-gpu tier 3 → high', async () => {
    mockGetGPUTier.mockResolvedValue({ tier: 3, type: 'BENCHMARK' } as never)
    const result = await getPerfTier()
    expect(result.tier).toBe('high')
  })

  it('caches the result: second call does not re-invoke getGPUTier', async () => {
    mockGetGPUTier.mockResolvedValue({ tier: 2, type: 'BENCHMARK' } as never)
    await getPerfTier()
    await getPerfTier()
    expect(mockGetGPUTier).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL (module missing)**

Run: `pnpm test tests/scenes/engine/PerfController.test.ts`
Expected: FAIL — cannot resolve `@/scenes/engine/PerfController`.

- [ ] **Step 3: Implement `src/scenes/engine/PerfController.ts`**

```ts
import { getGPUTier } from 'detect-gpu'
import type { PerfTier } from './types'

// ---------------------------------------------------------------------------
// Result type
// ---------------------------------------------------------------------------

export interface PerfResult {
  /** GPU capability tier after mapping */
  tier: PerfTier
  /**
   * True when the OS-level `prefers-reduced-motion: reduce` media query is
   * active. In this case tier is forced to 'low' regardless of GPU score, and
   * the engine should render only static snapshots.
   */
  reducedMotion: boolean
}

// ---------------------------------------------------------------------------
// Internal cache — reset via resetPerfCache() for tests
// ---------------------------------------------------------------------------

let cached: PerfResult | null = null

/** Clears the cached result. Exposed for unit tests; do not call in production. */
export function resetPerfCache(): void {
  cached = null
}

// ---------------------------------------------------------------------------
// Reduced-motion detection
// ---------------------------------------------------------------------------

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

// ---------------------------------------------------------------------------
// GPU tier mapping
// ---------------------------------------------------------------------------

function mapGPUTier(tier: number): PerfTier {
  if (tier <= 1) return 'low'
  if (tier === 2) return 'mid'
  return 'high'
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Detects the GPU performance tier once at boot and caches the result.
 *
 * - If `prefers-reduced-motion: reduce` is set, immediately returns
 *   `{ tier: 'low', reducedMotion: true }` without calling detect-gpu.
 * - Otherwise, calls `getGPUTier()` from `detect-gpu` and maps tiers:
 *   0–1 → 'low', 2 → 'mid', 3 → 'high'.
 * - Subsequent calls return the cached result (no repeat GPU detection).
 *
 * @returns Promise resolving to a PerfResult with tier and reducedMotion flag.
 */
export async function getPerfTier(): Promise<PerfResult> {
  if (cached !== null) return cached

  // Short-circuit for accessibility preference
  if (prefersReducedMotion()) {
    cached = { tier: 'low', reducedMotion: true }
    return cached
  }

  let gpuTierNumber = 2 // default to mid if detection fails
  try {
    const result = await getGPUTier()
    gpuTierNumber = result.tier ?? 2
  } catch {
    // Detection failure treated as mid tier (safe default)
    gpuTierNumber = 2
  }

  cached = { tier: mapGPUTier(gpuTierNumber), reducedMotion: false }
  return cached
}
```

- [ ] **Step 4: Run tests — expect PASS**

Run: `pnpm test tests/scenes/engine/PerfController.test.ts`
Expected: `✓ tests/scenes/engine/PerfController.test.ts (7 tests)` with exit code 0.

- [ ] **Step 5: Run full test suite to confirm no regressions**

Run: `pnpm test`
Expected: all tests pass. Vitest reports the harness test plus all new solver + engine tests. Exit code 0.

- [ ] **Step 6: Commit**

```bash
git add src/scenes/engine/PerfController.ts tests/scenes/engine/PerfController.test.ts
git commit -m "feat(scenes): PerfController with GPU-tier detect + reduced-motion"
```
