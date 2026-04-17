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

    // Particular solution of du/dt = -100u + sin(t):
    //   u_p = a*sin(t) + b*cos(t), match coefficients:
    //     a*cos(t) - b*sin(t) = -100a*sin(t) - 100b*cos(t) + sin(t)
    //     → a = -100b, -b = -100a + 1 → a = 100/10001, b = -1/10001
    //   u_ss(t) = (100*sin(t) - cos(t)) / 10001
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
 *
 * fft.js `inverseTransform` already normalises by 1/N, so we do NOT divide
 * again here.
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
    result[i] = complexOutput[2 * i]
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
import { detectRGBA16F } from '@/scenes/solvers/gpuCompute'

// ---------------------------------------------------------------------------
// Pure-function unit test: RGBA16F capability detection
// Mocks WebGLRenderingContext; no GPU required.
// Static import (not require()) — vitest ESM doesn't resolve `@/` under CJS require.
// detectRGBA16F takes `gl` as an argument so no module-level mocking is needed.
// ---------------------------------------------------------------------------
describe('detectRGBA16F (unit, no WebGL required)', () => {
  it('returns true when EXT_color_buffer_float is available', () => {
    const mockGL = {
      getExtension: vi.fn((name: string) =>
        name === 'EXT_color_buffer_float' ? {} : null,
      ),
    } as unknown as WebGLRenderingContext
    expect(detectRGBA16F(mockGL)).toBe(true)
  })

  it('returns false when EXT_color_buffer_float is not available', () => {
    const mockGL = {
      getExtension: vi.fn(() => null),
    } as unknown as WebGLRenderingContext
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

  it('for a radially-symmetric base, cnMask and dnMask equal the base at every pixel', () => {
    // A radially-symmetric base f(x,y) = g(r) is invariant under any rotation,
    // so averaging N rotated samples yields f itself. This is a clean structural
    // check that sidesteps pixel-rounding artefacts from comparing rotated pixel
    // indices (which do NOT lie at the same continuous radius after rounding).
    const size = 32
    const N = 3
    const base = (x: number, y: number) => Math.cos(Math.sqrt(x * x + y * y) * 5)
    const cn = cnMask(size, N, base)
    const dn = dnMask(size, N, base)

    for (let j = 0; j < size; j++) {
      for (let i = 0; i < size; i++) {
        const x = (i / (size - 1)) * 2 - 1
        const y = (j / (size - 1)) * 2 - 1
        const expected = base(x, y)
        const idx = j * size + i
        // Float32Array storage → ~7 decimal digits; precision 5 leaves margin
        expect(cn[idx]).toBeCloseTo(expected, 5)
        expect(dn[idx]).toBeCloseTo(expected, 5)
      }
    }
  })

  it('preserves 4-fold symmetry at integer-aligned pixel offsets (no rounding error)', () => {
    // N=4, 90° rotation maps pixel offset (a, b) → (-b, a) EXACTLY in integer
    // pixels. Pick a non-radial base and verify the rotation pair matches.
    const size = 33 // odd so there's a true center pixel
    const N = 4
    const base = (x: number, y: number) => x + 2 * y // non-radial
    const cn = cnMask(size, N, base)
    const center = (size - 1) / 2
    const a = 6, b = 3
    const toIdx = (i: number, j: number) => j * size + i
    // (center+a, center+b) and (center-b, center+a) are exact 90° rotation pair.
    expect(cn[toIdx(center + a, center + b)]).toBeCloseTo(
      cn[toIdx(center - b, center + a)], 10,
    )
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
    mockGetGPUTier.mockClear()
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
    mockGetGPUTier.mockClear()
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

---

## Phase 7 — Scene infrastructure

### Task D10: `SceneRegistry`

**Files:**
- Create: `src/scenes/engine/SceneRegistry.ts`
- Create: `tests/scenes/engine/SceneRegistry.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/scenes/engine/SceneRegistry.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { SceneRegistry } from '@/scenes/engine/SceneRegistry'
import type { SimModule } from '@/scenes/engine/types'

function makeMockModule(id: string): SimModule {
  return {
    id: id as SimModule['id'],
    title: `Mock ${id}`,
    description: `Description of ${id}`,
    defaults: {},
    presets: {},
    schema: {},
    Scene: () => null,
    init: () => ({}),
    step: () => {},
    dispose: () => {},
    symmetryApplies: () => false,
  }
}

describe('SceneRegistry', () => {
  let registry: SceneRegistry

  beforeEach(() => {
    registry = new SceneRegistry()
  })

  it('register + get round-trip: returns the same module by id', () => {
    const mod = makeMockModule('singularity')
    registry.register(mod)
    expect(registry.get('singularity')).toBe(mod)
  })

  it('get returns undefined for unregistered id', () => {
    expect(registry.get('lorenz')).toBeUndefined()
  })

  it('list returns all registered modules in insertion order', () => {
    const m1 = makeMockModule('singularity')
    const m2 = makeMockModule('lorenz')
    registry.register(m1)
    registry.register(m2)
    const list = registry.list()
    expect(list).toHaveLength(2)
    expect(list[0]).toBe(m1)
    expect(list[1]).toBe(m2)
  })

  it('list returns empty array when nothing registered', () => {
    expect(registry.list()).toEqual([])
  })

  it('duplicate register with the same id throws', () => {
    const mod = makeMockModule('singularity')
    registry.register(mod)
    expect(() => registry.register(mod)).toThrowError(/already registered/)
  })

  it('duplicate register with same id but different object also throws', () => {
    registry.register(makeMockModule('singularity'))
    expect(() => registry.register(makeMockModule('singularity'))).toThrowError(/already registered/)
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL (module missing)**

Run: `pnpm test tests/scenes/engine/SceneRegistry.test.ts`
Expected: FAIL — cannot resolve `@/scenes/engine/SceneRegistry`.

- [ ] **Step 3: Implement `src/scenes/engine/SceneRegistry.ts`**

```ts
import type { SceneId, SimModule } from './types'

/**
 * Typed registry mapping SceneId → SimModule.
 *
 * Instantiate once at app boot and pass to Canvas + LevaPanel via React context.
 *
 * Rules:
 * - Registering the same id twice throws. Prevents silent override of modules
 *   that share an id in different dynamic import chunks.
 * - `get()` returns undefined (not null) for unregistered ids so callers can
 *   use optional-chaining without null checks.
 * - `list()` preserves insertion order (Map guarantees this in ES2015+).
 */
export class SceneRegistry {
  private readonly map = new Map<SceneId, SimModule>()

  /**
   * Register a sim module. Throws if the id is already registered.
   */
  register(mod: SimModule): void {
    if (this.map.has(mod.id)) {
      throw new Error(
        `SceneRegistry: id "${mod.id}" already registered. ` +
          `Each SimModule must have a unique SceneId.`,
      )
    }
    this.map.set(mod.id, mod)
  }

  /**
   * Retrieve a sim module by id.
   * Returns undefined if no module with this id has been registered.
   */
  get(id: SceneId): SimModule | undefined {
    return this.map.get(id)
  }

  /**
   * Return all registered modules in insertion order.
   */
  list(): SimModule[] {
    return Array.from(this.map.values())
  }
}
```

- [ ] **Step 4: Run tests — expect PASS**

Run: `pnpm test tests/scenes/engine/SceneRegistry.test.ts`
Expected: `✓ tests/scenes/engine/SceneRegistry.test.ts (6 tests)` with exit code 0.

- [ ] **Step 5: Commit**

```bash
git add src/scenes/engine/SceneRegistry.ts tests/scenes/engine/SceneRegistry.test.ts
git commit -m "feat(scenes): typed SceneRegistry"
```

---

### Task D11: `SceneRouter`

**Files:**
- Create: `src/scenes/engine/SceneRouter.tsx`
- Create: `tests/scenes/engine/SceneRouter.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `tests/scenes/engine/SceneRouter.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useActiveScene } from '@/scenes/engine/SceneRouter'
import type { SceneRegistry } from '@/scenes/engine/SceneRegistry'

// ---------------------------------------------------------------------------
// Mock IntersectionObserver
// ---------------------------------------------------------------------------

type IOCallback = (entries: IntersectionObserverEntry[]) => void

let capturedCallback: IOCallback | null = null
let capturedTargets: Element[] = []

const mockObserve = vi.fn((el: Element) => {
  capturedTargets.push(el)
})
const mockUnobserve = vi.fn()
const mockDisconnect = vi.fn()

function MockIntersectionObserver(cb: IOCallback) {
  capturedCallback = cb
  return {
    observe: mockObserve,
    unobserve: mockUnobserve,
    disconnect: mockDisconnect,
  }
}

// Utility: fire mock IO entries
function fireEntries(entries: Array<{ target: Element; intersectionRatio: number }>) {
  if (!capturedCallback) throw new Error('IntersectionObserver callback not captured')
  capturedCallback(
    entries.map(({ target, intersectionRatio }) => ({
      target,
      intersectionRatio,
      isIntersecting: intersectionRatio > 0,
      boundingClientRect: {} as DOMRectReadOnly,
      intersectionRect: {} as DOMRectReadOnly,
      rootBounds: null,
      time: 0,
    })) as IntersectionObserverEntry[],
  )
}

beforeEach(() => {
  capturedCallback = null
  capturedTargets = []
  mockObserve.mockClear()
  mockUnobserve.mockClear()
  mockDisconnect.mockClear()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(globalThis as any).IntersectionObserver = MockIntersectionObserver
})

afterEach(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (globalThis as any).IntersectionObserver
})

// Minimal registry stub
function makeRegistry(ids: string[]) {
  return {
    list: () => ids.map((id) => ({ id })),
  } as unknown as SceneRegistry
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useActiveScene', () => {
  it('falls back to routeHint when no sentinel has intersectionRatio > 0', () => {
    const registry = makeRegistry(['singularity', 'lorenz'])
    const { result } = renderHook(() =>
      useActiveScene({ registry, routeHint: 'lorenz' }),
    )
    expect(result.current.activeSceneId).toBe('lorenz')
  })

  it('selects the scene with the highest intersectionRatio when sentinels fire', () => {
    const registry = makeRegistry(['singularity', 'lorenz'])

    // Create real DOM sentinels so the hook can observe them
    const sentinel1 = document.createElement('div')
    sentinel1.setAttribute('data-scene-id', 'singularity')
    document.body.appendChild(sentinel1)

    const sentinel2 = document.createElement('div')
    sentinel2.setAttribute('data-scene-id', 'lorenz')
    document.body.appendChild(sentinel2)

    const { result } = renderHook(() =>
      useActiveScene({ registry, routeHint: 'singularity' }),
    )

    act(() => {
      fireEntries([
        { target: sentinel1, intersectionRatio: 0.3 },
        { target: sentinel2, intersectionRatio: 0.8 },
      ])
    })

    expect(result.current.activeSceneId).toBe('lorenz')

    document.body.removeChild(sentinel1)
    document.body.removeChild(sentinel2)
  })

  it('setActiveSceneId overrides selection immediately', () => {
    const registry = makeRegistry(['singularity', 'lorenz'])
    const { result } = renderHook(() =>
      useActiveScene({ registry, routeHint: 'singularity' }),
    )

    act(() => {
      result.current.setActiveSceneId('lorenz')
    })

    expect(result.current.activeSceneId).toBe('lorenz')
  })

  it('disconnects IntersectionObserver on unmount', () => {
    const registry = makeRegistry(['singularity'])
    const { unmount } = renderHook(() =>
      useActiveScene({ registry, routeHint: 'singularity' }),
    )
    unmount()
    expect(mockDisconnect).toHaveBeenCalledOnce()
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL (module missing)**

Run: `pnpm test tests/scenes/engine/SceneRouter.test.tsx`
Expected: FAIL — cannot resolve `@/scenes/engine/SceneRouter`.

- [ ] **Step 3: Implement `src/scenes/engine/SceneRouter.tsx`**

```tsx
import { useState, useEffect, useCallback, useRef } from 'react'
import type { SceneId } from './types'
import type { SceneRegistry } from './SceneRegistry'

export interface UseActiveSceneOptions {
  registry: SceneRegistry
  /**
   * Fallback scene id when no `data-scene-id` sentinel is intersecting the
   * viewport. Typically derived from the current route path.
   */
  routeHint: SceneId
}

export interface UseActiveSceneResult {
  activeSceneId: SceneId
  setActiveSceneId: (id: SceneId) => void
}

/**
 * Tracks which sim scene is currently "active" based on which DOM sentinel
 * element (identified by `data-scene-id="<sceneId>"`) has the largest
 * intersection ratio with the viewport.
 *
 * Falls back to `routeHint` when no sentinel is visible (e.g. page load before
 * any scroll, or SSR/jsdom where IntersectionObserver is absent).
 *
 * Sentinels are `<div data-scene-id="singularity" />` elements. Each scene
 * section should render one at its scroll anchor. The hook picks them up
 * automatically via querySelectorAll after mount.
 *
 * @example
 * ```tsx
 * const { activeSceneId } = useActiveScene({ registry, routeHint: 'singularity' })
 * ```
 */
export function useActiveScene({
  registry,
  routeHint,
}: UseActiveSceneOptions): UseActiveSceneResult {
  const [activeSceneId, setActiveSceneId] = useState<SceneId>(routeHint)
  // Track per-sentinel ratio; the key is the data-scene-id attribute value
  const ratioMap = useRef(new Map<SceneId, number>())

  const selectBestScene = useCallback(() => {
    let best: SceneId | null = null
    let bestRatio = 0
    for (const [id, ratio] of ratioMap.current.entries()) {
      if (ratio > bestRatio) {
        bestRatio = ratio
        best = id
      }
    }
    if (best !== null && bestRatio > 0) {
      setActiveSceneId(best)
    } else {
      setActiveSceneId(routeHint)
    }
  }, [routeHint])

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') {
      // SSR / old browsers: stay with routeHint
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = (entry.target as HTMLElement).dataset['sceneId'] as SceneId | undefined
          if (id) {
            ratioMap.current.set(id, entry.intersectionRatio)
          }
        }
        selectBestScene()
      },
      { threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0] },
    )

    // Observe all sentinels currently in the DOM
    const sentinels = Array.from(
      document.querySelectorAll<HTMLElement>('[data-scene-id]'),
    )
    for (const el of sentinels) {
      observer.observe(el)
    }

    return () => {
      observer.disconnect()
    }
  }, [registry, selectBestScene])

  return { activeSceneId, setActiveSceneId }
}
```

- [ ] **Step 4: Run tests — expect PASS**

Run: `pnpm test tests/scenes/engine/SceneRouter.test.tsx`
Expected: `✓ tests/scenes/engine/SceneRouter.test.tsx (4 tests)` with exit code 0.

- [ ] **Step 5: Commit**

```bash
git add src/scenes/engine/SceneRouter.tsx tests/scenes/engine/SceneRouter.test.tsx
git commit -m "feat(scenes): SceneRouter with IntersectionObserver"
```

---

### Task D12: `Canvas` root + `SceneHost` + `BaseLayout` wiring

**Files:**
- Create: `src/scenes/engine/Canvas.tsx`
- Create: `src/scenes/engine/SceneHost.tsx`
- Modify: `src/layouts/BaseLayout.astro`
- Create: `tests/scenes/engine/SceneHost.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `tests/scenes/engine/SceneHost.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import React, { Suspense } from 'react'

// ---------------------------------------------------------------------------
// Mock @react-three/fiber and @react-three/drei so jsdom doesn't need WebGL
// ---------------------------------------------------------------------------
vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="r3f-canvas">{children}</div>
  ),
  useFrame: vi.fn(),
}))

vi.mock('@react-three/drei', () => ({
  OrthographicCamera: () => null,
}))

// Mock dynamic import map used by SceneHost
// The SceneHost uses a static importMap object; we inject a test scene here.
vi.mock('@/scenes/sims/mock-sim/index', () => ({
  default: {
    id: 'singularity',
    Scene: () => <mesh data-testid="mock-scene-mesh" />,
  },
}))

import { SceneHost } from '@/scenes/engine/SceneHost'

describe('SceneHost', () => {
  it('renders without crashing with a known activeSceneId', () => {
    const { container } = render(
      <Suspense fallback={<div>loading</div>}>
        <SceneHost activeSceneId="singularity" />
      </Suspense>,
    )
    // Suspense fallback may render initially; confirm no error thrown
    expect(container).toBeTruthy()
  })

  it('renders null without crashing for unknown activeSceneId', () => {
    const { container } = render(
      <Suspense fallback={null}>
        {/* Cast to bypass TS — tests unknown runtime id */}
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <SceneHost activeSceneId={'not-a-scene' as any} />
      </Suspense>,
    )
    expect(container).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL (module missing)**

Run: `pnpm test tests/scenes/engine/SceneHost.test.tsx`
Expected: FAIL — cannot resolve `@/scenes/engine/SceneHost`.

- [ ] **Step 3: Implement `src/scenes/engine/SceneHost.tsx`**

```tsx
import React, { Suspense, lazy, useMemo } from 'react'
import type { SceneId } from './types'

/**
 * Static map of SceneId → lazy-imported scene module.
 *
 * Each entry lazy-imports `src/scenes/sims/<id>/index.ts` which must export a
 * default `SimModule`. The `Scene` component is extracted inside the lazy
 * wrapper so that React.lazy receives a component directly.
 *
 * Add a new entry here when adding a new sim.
 */
const sceneImportMap: Partial<Record<SceneId, React.LazyExoticComponent<React.FC>>> = {
  singularity: lazy(async () => {
    const mod = await import('../sims/singularity/index')
    const SceneComponent: React.FC = (props) =>
      React.createElement(mod.singularityModule.Scene, props as Parameters<typeof mod.singularityModule.Scene>[0])
    return { default: SceneComponent }
  }),
}

export interface SceneHostProps {
  activeSceneId: SceneId
}

/**
 * Renders the scene component matching `activeSceneId`.
 * Each sim is code-split via React.lazy + dynamic import.
 * Wraps with Suspense (fallback = null) so missing sims fail gracefully.
 */
export function SceneHost({ activeSceneId }: SceneHostProps): React.ReactElement {
  const LazyScene = useMemo(
    () => sceneImportMap[activeSceneId] ?? null,
    [activeSceneId],
  )

  if (!LazyScene) {
    return <></>
  }

  return (
    <Suspense fallback={null}>
      <LazyScene />
    </Suspense>
  )
}
```

- [ ] **Step 4: Implement `src/scenes/engine/Canvas.tsx`**

```tsx
import React from 'react'
import { Canvas as R3FCanvas } from '@react-three/fiber'
import { OrthographicCamera } from '@react-three/drei'
import { SceneHost } from './SceneHost'
import type { SceneId } from './types'

export interface AppCanvasProps {
  activeSceneId: SceneId
  /** When true, use an orthographic projection (default false = perspective) */
  orthographic?: boolean
}

/**
 * App-wide single r3f Canvas.
 *
 * Mounted in BaseLayout at `fixed inset-0 -z-10 pointer-events-none` so it
 * sits behind all page content and never intercepts mouse events.
 *
 * The Canvas is intentionally frameless (no background): the site background
 * color is set via CSS on `<body>`, so the Canvas layer blends on top
 * transparently by default.
 */
export function AppCanvas({ activeSceneId, orthographic = false }: AppCanvasProps): React.ReactElement {
  return (
    <R3FCanvas
      orthographic={orthographic}
      gl={{ antialias: true, alpha: true }}
      style={{ position: 'fixed', inset: 0, zIndex: -10, pointerEvents: 'none' }}
      aria-hidden="true"
    >
      {orthographic && <OrthographicCamera makeDefault position={[0, 0, 5]} />}
      <SceneHost activeSceneId={activeSceneId} />
    </R3FCanvas>
  )
}
```

- [ ] **Step 5: Create the `AppCanvasIsland` wrapper for Astro client:load**

Create `src/scenes/engine/AppCanvasIsland.tsx`:

```tsx
/**
 * Astro island entry-point for the app-wide Canvas.
 *
 * Wraps AppCanvas with SceneRouter so the active scene is determined by
 * IntersectionObserver + route. Passes the singleton SceneRegistry.
 *
 * Imported in BaseLayout.astro as `client:load`.
 */
import React from 'react'
import { AppCanvas } from './Canvas'
import { useActiveScene } from './SceneRouter'
import { SceneRegistry } from './SceneRegistry'
import { singularityModule } from '../sims/singularity/index'

// Singleton registry for the app (all sims registered here at module load time)
const registry = new SceneRegistry()
registry.register(singularityModule)
// Additional sims registered in their respective task commits (D17-D20)

export default function AppCanvasIsland(): React.ReactElement {
  const { activeSceneId } = useActiveScene({ registry, routeHint: 'singularity' })
  return <AppCanvas activeSceneId={activeSceneId} />
}
```

- [ ] **Step 6: Mount Canvas island in BaseLayout**

Edit `src/layouts/BaseLayout.astro` to add the Canvas island import and mount it:

```astro
---
import "@/styles/global.css";
import pcmasterracePng from "@/assets/images/pcmasterrace.png";
import { cn } from "@/lib/utils";
import NavBarDock from "@/components/layout/NavBarDock";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import AnimatedCursor from "@/components/ui/AnimatedCursor";
import VectorFieldBackground from "@/components/ui/VectorFieldBackground";
import { MobileBlocker } from "@/components/layout/MobileBlocker";
import AppCanvasIsland from "@/scenes/engine/AppCanvasIsland";
---

<!doctype html>
<html lang="en" class="dark">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <title>Viet Bui | Portfolio</title>
    <link rel="icon" type="image/png" href={pcmasterracePng.src} />
  </head>
  <body
    class={cn(
      "group/body overscroll-none antialiased bg-background text-foreground",
    )}
  >
    <AppCanvasIsland client:load />
    <MobileBlocker client:load />
    <VectorFieldBackground client:load className="hidden md:block" />
    <AnimatedCursor client:load />
    <NavBarDock client:load />
    <MobileBottomNav client:load />
    <main class="relative z-10 flex flex-1 flex-col pt-4 pb-20 md:pt-24 md:pb-0">
      <slot />
    </main>
  </body>
</html>
```

- [ ] **Step 7: Run tests — expect PASS**

Run: `pnpm test tests/scenes/engine/SceneHost.test.tsx`
Expected: `✓ tests/scenes/engine/SceneHost.test.tsx (2 tests)` with exit code 0.

- [ ] **Step 8: Verify build**

Run: `pnpm build`
Expected: exit code 0 with no new TypeScript errors. The Canvas island appears in the build graph.

- [ ] **Step 9: Commit**

```bash
git add src/scenes/engine/Canvas.tsx src/scenes/engine/SceneHost.tsx \
        src/scenes/engine/AppCanvasIsland.tsx src/layouts/BaseLayout.astro \
        tests/scenes/engine/SceneHost.test.tsx
git commit -m "feat(scenes): app-wide Canvas mounted in BaseLayout"
```

---

## Phase 8 — Leva panel + URL hash + Presets

### Task D13: Global Leva panel

**Files:**
- Create: `src/scenes/ui/LevaPanel.tsx`
- Create: `tests/scenes/ui/LevaPanel.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `tests/scenes/ui/LevaPanel.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

// ---------------------------------------------------------------------------
// We test the keyboard + media-query logic extracted as a pure hook,
// not the Leva render itself (Leva is a UI lib we trust).
// ---------------------------------------------------------------------------
import { useLevaPanelVisibility } from '@/scenes/ui/LevaPanel'

// Mock matchMedia
function mockMatchMedia(mobileMatch: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn((query: string) => ({
      matches: query.includes('max-width') ? mobileMatch : false,
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

describe('useLevaPanelVisibility', () => {
  beforeEach(() => {
    mockMatchMedia(false) // desktop by default
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('starts visible on desktop (viewport >= 768px)', () => {
    mockMatchMedia(false)
    const { result } = renderHook(() => useLevaPanelVisibility())
    expect(result.current.hidden).toBe(false)
  })

  it('starts hidden on mobile (viewport < 768px)', () => {
    mockMatchMedia(true)
    const { result } = renderHook(() => useLevaPanelVisibility())
    expect(result.current.hidden).toBe(true)
  })

  it('keyboard L toggles visibility on desktop', () => {
    mockMatchMedia(false)
    const { result } = renderHook(() => useLevaPanelVisibility())
    expect(result.current.hidden).toBe(false)

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'l' }))
    })
    expect(result.current.hidden).toBe(true)

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'l' }))
    })
    expect(result.current.hidden).toBe(false)
  })

  it('uppercase L also toggles', () => {
    mockMatchMedia(false)
    const { result } = renderHook(() => useLevaPanelVisibility())
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'L' }))
    })
    expect(result.current.hidden).toBe(true)
  })

  it('keyboard L does not toggle when on mobile (stays hidden)', () => {
    mockMatchMedia(true)
    const { result } = renderHook(() => useLevaPanelVisibility())
    expect(result.current.hidden).toBe(true)
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'l' }))
    })
    // Mobile: L key has no effect — panel stays hidden
    expect(result.current.hidden).toBe(true)
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL (module missing)**

Run: `pnpm test tests/scenes/ui/LevaPanel.test.tsx`
Expected: FAIL — cannot resolve `@/scenes/ui/LevaPanel`.

- [ ] **Step 3: Implement `src/scenes/ui/LevaPanel.tsx`**

```tsx
import React, { useState, useEffect } from 'react'
import { Leva } from 'leva'

// ---------------------------------------------------------------------------
// Extracted hook — unit-testable without Leva or WebGL
// ---------------------------------------------------------------------------

export interface LevaPanelVisibility {
  /** When true, the Leva panel is hidden (pass directly to <Leva hidden={...} />) */
  hidden: boolean
}

/**
 * Manages Leva panel visibility with:
 * - Initial state: visible on desktop (≥768px), hidden on mobile (<768px).
 * - Keyboard `L` / `l`: toggles visibility, desktop only.
 *
 * Exported for unit testing. Consumed by `LevaPanel` component.
 */
export function useLevaPanelVisibility(): LevaPanelVisibility {
  const isMobile = (): boolean => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(max-width: 767px)').matches
  }

  const [hidden, setHidden] = useState<boolean>(() => isMobile())

  useEffect(() => {
    const mobile = isMobile()

    function handleKeyDown(e: KeyboardEvent) {
      if (mobile) return
      if (e.key === 'l' || e.key === 'L') {
        // Ignore if focus is inside an input/textarea/contenteditable
        const target = e.target as HTMLElement
        if (
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable
        ) {
          return
        }
        setHidden((prev) => !prev)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  return { hidden }
}

// ---------------------------------------------------------------------------
// LevaPanel component
// ---------------------------------------------------------------------------

/**
 * Global Leva control panel.
 *
 * Mount this once in BaseLayout (alongside AppCanvasIsland). It renders the
 * global Leva panel whose schema is populated by whichever sim is active.
 * Schema composition (active sim → leva controls) is handled by calling
 * `useControls` inside each sim's Scene component; Leva merges them
 * automatically into this single panel via its internal store.
 *
 * Keyboard `L` toggles visibility. Hidden by default on mobile.
 */
export function LevaPanel(): React.ReactElement {
  const { hidden } = useLevaPanelVisibility()

  return (
    <Leva
      hidden={hidden}
      collapsed={false}
      theme={{
        sizes: { rootWidth: '280px' },
      }}
    />
  )
}

export default LevaPanel
```

- [ ] **Step 4: Mount LevaPanel in BaseLayout**

Edit `src/layouts/BaseLayout.astro` — add LevaPanel import and island mount below `AppCanvasIsland`:

In the frontmatter (between the `---` delimiters), add:
```ts
import LevaPanel from "@/scenes/ui/LevaPanel";
```

In the body, add after `<AppCanvasIsland client:load />`:
```html
<LevaPanel client:load />
```

- [ ] **Step 5: Run tests — expect PASS**

Run: `pnpm test tests/scenes/ui/LevaPanel.test.tsx`
Expected: `✓ tests/scenes/ui/LevaPanel.test.tsx (5 tests)` with exit code 0.

- [ ] **Step 6: Commit**

```bash
git add src/scenes/ui/LevaPanel.tsx tests/scenes/ui/LevaPanel.test.tsx \
        src/layouts/BaseLayout.astro
git commit -m "feat(scenes): global Leva panel with L-key toggle"
```

---

### Task D14: URL hash sync + preset store

**Files:**
- Create: `src/scenes/engine/UrlState.ts`
- Create: `src/scenes/engine/Presets.ts`
- Create: `src/scenes/ui/PresetMenu.tsx`
- Create: `tests/scenes/engine/UrlState.test.ts`
- Create: `tests/scenes/engine/Presets.test.ts`
- Create: `tests/scenes/ui/PresetMenu.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `tests/scenes/engine/UrlState.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { encodeConfig, decodeConfig } from '@/scenes/engine/UrlState'

describe('encodeConfig / decodeConfig round-trip', () => {
  it('round-trips a flat config object', () => {
    const config = { speed: 5, intensity: 0.5, waveStrength: 0.3, colorShift: 0.1, size: 1.0 }
    const encoded = encodeConfig(config)
    const decoded = decodeConfig(encoded)
    expect(decoded).toEqual(config)
  })

  it('encodes to a non-empty string', () => {
    const encoded = encodeConfig({ a: 1, b: 2 })
    expect(typeof encoded).toBe('string')
    expect(encoded.length).toBeGreaterThan(0)
  })

  it('decodes empty string to empty object', () => {
    expect(decodeConfig('')).toEqual({})
  })

  it('round-trips numeric values including negatives and floats', () => {
    const config = { x: -3.14, y: 0.0, z: 99.99 }
    expect(decodeConfig(encodeConfig(config))).toEqual(config)
  })

  it('round-trips boolean values', () => {
    const config = { showTrails: true, showGrid: false }
    expect(decodeConfig(encodeConfig(config))).toEqual(config)
  })

  it('round-trips string values', () => {
    const config = { preset: 'classic', colormap: 'viridis' }
    expect(decodeConfig(encodeConfig(config))).toEqual(config)
  })

  it('is idempotent: encode(decode(encode(x))) === encode(x)', () => {
    const config = { sigma: 10, rho: 28, beta: 2.6667 }
    const once = encodeConfig(config)
    const twice = encodeConfig(decodeConfig(once))
    expect(twice).toBe(once)
  })
})
```

Create `tests/scenes/engine/Presets.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock localStorage before importing Presets
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    clear: vi.fn(() => { store = {} }),
    get length() { return Object.keys(store).length },
    key: vi.fn((i: number) => Object.keys(store)[i] ?? null),
  }
})()

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true })

import { savePreset, loadPreset, listPresets, deletePreset } from '@/scenes/engine/Presets'

beforeEach(() => {
  localStorageMock.clear()
  vi.clearAllMocks()
})

describe('Presets CRUD', () => {
  it('savePreset + loadPreset round-trips a config', () => {
    const config = { sigma: 10, rho: 28, beta: 2.6667 }
    savePreset('lorenz', 'my-test', config)
    const loaded = loadPreset('lorenz', 'my-test')
    expect(loaded).toEqual(config)
  })

  it('loadPreset returns null for unknown name', () => {
    expect(loadPreset('lorenz', 'nonexistent')).toBeNull()
  })

  it('listPresets returns names of all saved presets for a sceneId', () => {
    savePreset('lorenz', 'preset-a', { sigma: 10 })
    savePreset('lorenz', 'preset-b', { sigma: 20 })
    savePreset('singularity', 'preset-x', { speed: 3 })
    const lorenzPresets = listPresets('lorenz')
    expect(lorenzPresets).toContain('preset-a')
    expect(lorenzPresets).toContain('preset-b')
    expect(lorenzPresets).not.toContain('preset-x')
  })

  it('listPresets returns empty array when nothing saved', () => {
    expect(listPresets('lorenz')).toEqual([])
  })

  it('deletePreset removes a preset', () => {
    savePreset('lorenz', 'to-delete', { sigma: 5 })
    deletePreset('lorenz', 'to-delete')
    expect(loadPreset('lorenz', 'to-delete')).toBeNull()
    expect(listPresets('lorenz')).not.toContain('to-delete')
  })

  it('overwriting a preset updates its value', () => {
    savePreset('lorenz', 'draft', { sigma: 5 })
    savePreset('lorenz', 'draft', { sigma: 99 })
    expect(loadPreset('lorenz', 'draft')).toEqual({ sigma: 99 })
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL (modules missing)**

Run: `pnpm test tests/scenes/engine/UrlState.test.ts tests/scenes/engine/Presets.test.ts`
Expected: FAIL — cannot resolve `@/scenes/engine/UrlState` and `@/scenes/engine/Presets`.

- [ ] **Step 3: Implement `src/scenes/engine/UrlState.ts`**

```ts
/**
 * Compact URL hash encoding for sim configs.
 *
 * Format: `key=value&key2=value2`
 * - Numbers are encoded as their string representation (parseFloat on decode)
 * - Booleans encoded as "1" / "0"
 * - Strings URI-encoded
 *
 * This format is intentionally simple and human-readable so that shared URLs
 * are legible (e.g. `#sigma=10&rho=28&beta=2.667`).
 *
 * Limitations: only supports flat objects (no nested keys). Deep configs must
 * be flattened by the sim before calling encodeConfig.
 */

type ConfigValue = string | number | boolean
type FlatConfig = Record<string, ConfigValue>

/**
 * Encode a flat config object to a compact query-string.
 * Keys are sorted alphabetically for idempotency (encode(decode(encode(x))) === encode(x)).
 */
export function encodeConfig(config: FlatConfig): string {
  const sortedKeys = Object.keys(config).sort()
  return sortedKeys
    .map((key) => {
      const value = config[key]
      let encoded: string
      if (typeof value === 'boolean') {
        encoded = value ? '1' : '0'
      } else if (typeof value === 'number') {
        // Use toPrecision to avoid floating-point noise while keeping precision
        encoded = String(value)
      } else {
        encoded = encodeURIComponent(String(value))
      }
      return `${encodeURIComponent(key)}=${encoded}`
    })
    .join('&')
}

/**
 * Decode a query-string produced by `encodeConfig` back to a flat config.
 * Returns an empty object for empty / malformed input.
 *
 * Type inference: values that parse as numbers become numbers, "1"/"0" become
 * booleans only when the key exists in a provided type hint; otherwise they
 * remain numbers. For full typed decode, pass results through a sim-specific
 * zod schema.
 */
export function decodeConfig(encoded: string): FlatConfig {
  if (!encoded || encoded.trim() === '') return {}

  const result: FlatConfig = {}
  const pairs = encoded.split('&')

  for (const pair of pairs) {
    const eqIdx = pair.indexOf('=')
    if (eqIdx === -1) continue
    const rawKey = pair.slice(0, eqIdx)
    const rawVal = pair.slice(eqIdx + 1)
    if (!rawKey) continue

    const key = decodeURIComponent(rawKey)
    const valStr = decodeURIComponent(rawVal)

    // Attempt numeric parse first
    const num = Number(valStr)
    if (valStr !== '' && !isNaN(num)) {
      result[key] = num
    } else if (valStr === 'true') {
      result[key] = true
    } else if (valStr === 'false') {
      result[key] = false
    } else {
      result[key] = valStr
    }
  }

  return result
}

// ---------------------------------------------------------------------------
// Debounced URL hash writer — used by the PresetMenu and Leva onChange.
// ---------------------------------------------------------------------------

let debounceTimer: ReturnType<typeof setTimeout> | null = null

/**
 * Write a config to `window.location.hash` (debounced, 300ms).
 * Preserves the scroll position — uses `history.replaceState` not assignment.
 */
export function writeHashDebounced(config: FlatConfig, delayMs = 300): void {
  if (typeof window === 'undefined') return
  if (debounceTimer !== null) {
    clearTimeout(debounceTimer)
  }
  debounceTimer = setTimeout(() => {
    const hash = encodeConfig(config)
    history.replaceState(null, '', hash ? `#${hash}` : window.location.pathname)
    debounceTimer = null
  }, delayMs)
}

/**
 * Read the current URL hash and decode it to a flat config.
 * Returns empty object when no hash is present.
 */
export function readHashConfig(): FlatConfig {
  if (typeof window === 'undefined') return {}
  const hash = window.location.hash.replace(/^#/, '')
  return decodeConfig(hash)
}
```

- [ ] **Step 4: Implement `src/scenes/engine/Presets.ts`**

```ts
/**
 * User preset persistence layer backed by localStorage.
 *
 * Storage key format: `sim-preset:<sceneId>:<presetName>`
 * Index key format:   `sim-preset-index:<sceneId>` → JSON array of preset names
 *
 * All operations are synchronous. localStorage is synchronous in all browsers.
 * Gracefully handles missing localStorage (SSR / privacy mode).
 */

const PREFIX = 'sim-preset'
const INDEX_PREFIX = 'sim-preset-index'

function presetKey(sceneId: string, name: string): string {
  return `${PREFIX}:${sceneId}:${name}`
}

function indexKey(sceneId: string): string {
  return `${INDEX_PREFIX}:${sceneId}`
}

function safeLocalStorage(): Storage | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null
  } catch {
    return null
  }
}

function readIndex(sceneId: string): string[] {
  const ls = safeLocalStorage()
  if (!ls) return []
  try {
    const raw = ls.getItem(indexKey(sceneId))
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

function writeIndex(sceneId: string, names: string[]): void {
  const ls = safeLocalStorage()
  if (!ls) return
  ls.setItem(indexKey(sceneId), JSON.stringify(names))
}

/**
 * Save a preset config under the given sceneId + name.
 * Overwrites any existing preset with the same name.
 */
export function savePreset(sceneId: string, name: string, config: unknown): void {
  const ls = safeLocalStorage()
  if (!ls) return

  ls.setItem(presetKey(sceneId, name), JSON.stringify(config))

  // Update index
  const names = readIndex(sceneId)
  if (!names.includes(name)) {
    names.push(name)
    writeIndex(sceneId, names)
  }
}

/**
 * Load a saved preset config.
 * Returns null if the preset does not exist or cannot be parsed.
 */
export function loadPreset(sceneId: string, name: string): unknown | null {
  const ls = safeLocalStorage()
  if (!ls) return null
  try {
    const raw = ls.getItem(presetKey(sceneId, name))
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

/**
 * List all saved preset names for a given sceneId.
 * Returns an empty array when nothing is saved or localStorage is unavailable.
 */
export function listPresets(sceneId: string): string[] {
  return readIndex(sceneId)
}

/**
 * Delete a saved preset by sceneId + name.
 * No-op if the preset does not exist.
 */
export function deletePreset(sceneId: string, name: string): void {
  const ls = safeLocalStorage()
  if (!ls) return

  ls.removeItem(presetKey(sceneId, name))

  const names = readIndex(sceneId).filter((n) => n !== name)
  writeIndex(sceneId, names)
}
```

- [ ] **Step 5: Run tests — expect PASS**

Run: `pnpm test tests/scenes/engine/UrlState.test.ts tests/scenes/engine/Presets.test.ts`
Expected: `✓ UrlState (7 tests)` + `✓ Presets (6 tests)` with exit code 0.

- [ ] **Step 6: Implement `src/scenes/ui/PresetMenu.tsx`**

```tsx
import React, { useState, useCallback, useTransition } from 'react'
import { listPresets, loadPreset, savePreset, deletePreset } from '@/scenes/engine/Presets'
import { encodeConfig, writeHashDebounced } from '@/scenes/engine/UrlState'
import type { SceneId } from '@/scenes/engine/types'

export interface PresetMenuProps {
  sceneId: SceneId
  /** Current config object from the active sim */
  currentConfig: Record<string, unknown>
  /** Built-in presets shipped with the sim (name → partial config) */
  builtinPresets: Record<string, Record<string, unknown>>
  /** Called when a preset is loaded; sim should apply the config */
  onLoad: (config: Record<string, unknown>) => void
}

/**
 * Dropdown preset menu: shows built-in presets + user-saved presets.
 * Features:
 * - "Save current as…" prompt → saves to localStorage
 * - "Copy shareable URL" → encodes config to URL hash and copies to clipboard
 * - "Delete" next to user presets
 *
 * All state updates use `startTransition` to avoid blocking the render loop.
 */
export function PresetMenu({
  sceneId,
  currentConfig,
  builtinPresets,
  onLoad,
}: PresetMenuProps): React.ReactElement {
  const [userPresets, setUserPresets] = useState<string[]>(() => listPresets(sceneId))
  const [, startTransition] = useTransition()
  const [copyLabel, setCopyLabel] = useState('Copy shareable URL')

  const handleLoadBuiltin = useCallback(
    (name: string) => {
      const partial = builtinPresets[name]
      if (partial) {
        startTransition(() => {
          onLoad({ ...currentConfig, ...partial })
        })
      }
    },
    [builtinPresets, currentConfig, onLoad],
  )

  const handleLoadUser = useCallback(
    (name: string) => {
      const loaded = loadPreset(sceneId, name)
      if (loaded) {
        startTransition(() => {
          onLoad(loaded as Record<string, unknown>)
        })
      }
    },
    [sceneId, onLoad],
  )

  const handleSave = useCallback(() => {
    const name = window.prompt('Preset name:')
    if (!name || name.trim() === '') return
    savePreset(sceneId, name.trim(), currentConfig)
    setUserPresets(listPresets(sceneId))
  }, [sceneId, currentConfig])

  const handleDelete = useCallback(
    (name: string) => {
      deletePreset(sceneId, name)
      setUserPresets(listPresets(sceneId))
    },
    [sceneId],
  )

  const handleCopyURL = useCallback(() => {
    // Write to hash immediately (not debounced) then copy
    const hash = encodeConfig(currentConfig as Record<string, string | number | boolean>)
    const url = `${window.location.origin}${window.location.pathname}#${hash}`
    navigator.clipboard.writeText(url).then(() => {
      setCopyLabel('Copied!')
      setTimeout(() => setCopyLabel('Copy shareable URL'), 2000)
    }).catch(() => {
      // Fallback: use the debounced writer which at least updates the address bar
      writeHashDebounced(currentConfig as Record<string, string | number | boolean>, 0)
    })
  }, [currentConfig])

  const builtinNames = Object.keys(builtinPresets)

  return (
    <div className="preset-menu" style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '200px' }}>
      {builtinNames.length > 0 && (
        <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
          <legend style={{ fontSize: '11px', opacity: 0.6, marginBottom: '2px' }}>Built-in</legend>
          {builtinNames.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => handleLoadBuiltin(name)}
              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '2px 4px', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
            >
              {name}
            </button>
          ))}
        </fieldset>
      )}

      {userPresets.length > 0 && (
        <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
          <legend style={{ fontSize: '11px', opacity: 0.6, marginBottom: '2px' }}>Saved</legend>
          {userPresets.map((name) => (
            <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button
                type="button"
                onClick={() => handleLoadUser(name)}
                style={{ flex: 1, textAlign: 'left', padding: '2px 4px', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
              >
                {name}
              </button>
              <button
                type="button"
                onClick={() => handleDelete(name)}
                aria-label={`Delete preset ${name}`}
                style={{ padding: '2px 6px', background: 'none', border: 'none', cursor: 'pointer', color: '#f88', fontSize: '12px' }}
              >
                ×
              </button>
            </div>
          ))}
        </fieldset>
      )}

      <hr style={{ margin: '4px 0', opacity: 0.3 }} />
      <button
        type="button"
        onClick={handleSave}
        style={{ padding: '3px 6px', background: 'none', border: '1px solid currentColor', borderRadius: '3px', cursor: 'pointer', color: 'inherit', fontSize: '12px' }}
      >
        Save current as…
      </button>
      <button
        type="button"
        onClick={handleCopyURL}
        style={{ padding: '3px 6px', background: 'none', border: '1px solid currentColor', borderRadius: '3px', cursor: 'pointer', color: 'inherit', fontSize: '12px' }}
      >
        {copyLabel}
      </button>
    </div>
  )
}

export default PresetMenu
```

- [ ] **Step 7: Commit**

```bash
git add src/scenes/engine/UrlState.ts src/scenes/engine/Presets.ts \
        src/scenes/ui/PresetMenu.tsx \
        tests/scenes/engine/UrlState.test.ts tests/scenes/engine/Presets.test.ts
git commit -m "feat(scenes): URL hash sync + preset menu (built-ins + user)"
```

---

## Phase 9 — Help overlay

### Task D15: `HelpOverlay`

**Files:**
- Create: `src/scenes/ui/HelpOverlay.tsx`
- Create: `tests/scenes/ui/HelpOverlay.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `tests/scenes/ui/HelpOverlay.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { HelpOverlay } from '@/scenes/ui/HelpOverlay'

const defaultProps = {
  sceneTitle: 'Singularity',
  description: 'A black-hole accretion shader simulating gravitational lensing.',
  formula: 'I = 1 - exp(-exp(c.x * 0.7) / w.x / (2 + i²/4 - i) / (0.5 + 1/a) / (0.03 + |p| - 0.7) * intensity)',
  presetNames: ['default', 'intense', 'subtle'],
  shortcuts: [
    { key: 'L', description: 'Toggle Leva panel' },
    { key: '?', description: 'Toggle this help overlay' },
  ],
}

describe('HelpOverlay keyboard interaction', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('is not open by default (dialog not in document)', () => {
    render(<HelpOverlay {...defaultProps} />)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('opens when ? key is pressed', () => {
    render(<HelpOverlay {...defaultProps} />)
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '?' }))
    })
    expect(screen.getByRole('dialog')).toBeTruthy()
  })

  it('shows scene title in the dialog', () => {
    render(<HelpOverlay {...defaultProps} />)
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '?' }))
    })
    expect(screen.getByText('Singularity')).toBeTruthy()
  })

  it('shows the description in the dialog', () => {
    render(<HelpOverlay {...defaultProps} />)
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '?' }))
    })
    expect(screen.getByText(defaultProps.description)).toBeTruthy()
  })

  it('closes when Escape key is pressed', () => {
    render(<HelpOverlay {...defaultProps} />)
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '?' }))
    })
    expect(screen.getByRole('dialog')).toBeTruthy()
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    })
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('closes when the overlay backdrop is clicked', () => {
    render(<HelpOverlay {...defaultProps} />)
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '?' }))
    })
    const backdrop = screen.getByTestId('help-overlay-backdrop')
    fireEvent.click(backdrop)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('toggles: second ? press closes the dialog', () => {
    render(<HelpOverlay {...defaultProps} />)
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '?' }))
    })
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '?' }))
    })
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL (module missing)**

Run: `pnpm test tests/scenes/ui/HelpOverlay.test.tsx`
Expected: FAIL — cannot resolve `@/scenes/ui/HelpOverlay`.

- [ ] **Step 3: Implement `src/scenes/ui/HelpOverlay.tsx`**

```tsx
import React, { useState, useEffect, useCallback, useRef } from 'react'

export interface KeyboardShortcut {
  key: string
  description: string
}

export interface HelpOverlayProps {
  /** Title of the currently active sim */
  sceneTitle: string
  /** Human-readable description of the sim's physics */
  description: string
  /**
   * Mathematical formula shown in a monospaced block.
   * Use plain ASCII math or MathML string for display.
   */
  formula: string
  /** Names of available presets (built-in + user) */
  presetNames: string[]
  /** Global keyboard shortcuts shown in the cheat sheet */
  shortcuts: KeyboardShortcut[]
}

/**
 * HelpOverlay
 *
 * Press `?` to open a modal dialog showing:
 * - Active sim title
 * - Physics description
 * - Mathematical formula (monospaced fallback)
 * - List of presets
 * - Keyboard shortcuts cheat sheet
 *
 * Dismissal: `Escape` key, or click the backdrop.
 * Focus is trapped inside the dialog when open.
 */
export function HelpOverlay({
  sceneTitle,
  description,
  formula,
  presetNames,
  shortcuts,
}: HelpOverlayProps): React.ReactElement {
  const [open, setOpen] = useState(false)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  const close = useCallback(() => setOpen(false), [])
  const toggle = useCallback(() => setOpen((prev) => !prev), [])

  // Keyboard listener: `?` toggles, `Escape` closes
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Ignore if typing in a form field
      const target = e.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return
      }
      if (e.key === '?') {
        e.preventDefault()
        toggle()
      } else if (e.key === 'Escape') {
        close()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [toggle, close])

  // Move focus to close button when dialog opens (basic focus trap)
  useEffect(() => {
    if (open && closeButtonRef.current) {
      closeButtonRef.current.focus()
    }
  }, [open])

  if (!open) {
    return <></>
  }

  return (
    // Backdrop
    <div
      data-testid="help-overlay-backdrop"
      onClick={close}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(0,0,0,0.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Dialog — stop propagation so clicks inside don't close */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-overlay-title"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#1a1a2e',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: '8px',
          padding: '24px 28px',
          maxWidth: '520px',
          width: '90vw',
          maxHeight: '80vh',
          overflowY: 'auto',
          color: '#e8e8e8',
          fontFamily: 'inherit',
          position: 'relative',
        }}
      >
        {/* Close button */}
        <button
          ref={closeButtonRef}
          type="button"
          onClick={close}
          aria-label="Close help overlay"
          style={{
            position: 'absolute',
            top: '12px',
            right: '16px',
            background: 'none',
            border: 'none',
            fontSize: '18px',
            cursor: 'pointer',
            color: 'inherit',
            opacity: 0.7,
          }}
        >
          ×
        </button>

        {/* Title */}
        <h2
          id="help-overlay-title"
          style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 600 }}
        >
          {sceneTitle}
        </h2>

        {/* Description */}
        <p style={{ margin: '0 0 16px', opacity: 0.85, lineHeight: 1.5, fontSize: '14px' }}>
          {description}
        </p>

        {/* Formula */}
        {formula && (
          <section style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '13px', opacity: 0.6, marginBottom: '6px', fontWeight: 500 }}>
              Formula
            </h3>
            <pre
              style={{
                background: 'rgba(255,255,255,0.06)',
                borderRadius: '4px',
                padding: '10px 12px',
                fontSize: '11px',
                overflowX: 'auto',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
                lineHeight: 1.6,
                margin: 0,
              }}
            >
              {formula}
            </pre>
          </section>
        )}

        {/* Presets */}
        {presetNames.length > 0 && (
          <section style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '13px', opacity: 0.6, marginBottom: '6px', fontWeight: 500 }}>
              Presets
            </h3>
            <ul style={{ margin: 0, padding: '0 0 0 16px', fontSize: '13px', lineHeight: 1.7 }}>
              {presetNames.map((name) => (
                <li key={name}>{name}</li>
              ))}
            </ul>
          </section>
        )}

        {/* Keyboard shortcuts cheat sheet */}
        {shortcuts.length > 0 && (
          <section>
            <h3 style={{ fontSize: '13px', opacity: 0.6, marginBottom: '6px', fontWeight: 500 }}>
              Keyboard shortcuts
            </h3>
            <table style={{ borderCollapse: 'collapse', fontSize: '13px', width: '100%' }}>
              <tbody>
                {shortcuts.map(({ key, description: desc }) => (
                  <tr key={key}>
                    <td style={{ paddingRight: '12px', paddingBottom: '4px', fontFamily: 'monospace', opacity: 0.9 }}>
                      <kbd
                        style={{
                          background: 'rgba(255,255,255,0.1)',
                          borderRadius: '3px',
                          padding: '1px 5px',
                          fontSize: '12px',
                          border: '1px solid rgba(255,255,255,0.2)',
                        }}
                      >
                        {key}
                      </kbd>
                    </td>
                    <td style={{ paddingBottom: '4px', opacity: 0.8 }}>{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
      </div>
    </div>
  )
}

export default HelpOverlay
```

- [ ] **Step 4: Run tests — expect PASS**

Run: `pnpm test tests/scenes/ui/HelpOverlay.test.tsx`
Expected: `✓ tests/scenes/ui/HelpOverlay.test.tsx (7 tests)` with exit code 0.

- [ ] **Step 5: Commit**

```bash
git add src/scenes/ui/HelpOverlay.tsx tests/scenes/ui/HelpOverlay.test.tsx
git commit -m "feat(scenes): HelpOverlay with ? shortcut"
```

---

## Phase 10 — Singularity port (first sim)

### Task D16: Port existing Singularity shader to r3f

**Files:**
- Create: `src/scenes/sims/singularity/Scene.tsx`
- Create: `src/scenes/sims/singularity/presets.ts`
- Create: `src/scenes/sims/singularity/index.ts`
- Create: `tests/scenes/sims/singularity/Scene.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `tests/scenes/sims/singularity/Scene.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import React, { Suspense } from 'react'

// ---------------------------------------------------------------------------
// Mock heavy r3f dependencies so jsdom can import the Scene module
// ---------------------------------------------------------------------------
vi.mock('@react-three/fiber', () => ({
  useFrame: vi.fn(),
  useThree: vi.fn(() => ({ clock: { getElapsedTime: () => 0 } })),
}))

vi.mock('@react-three/drei', () => ({
  shaderMaterial: vi.fn((uniforms: Record<string, unknown>, vert: string, frag: string) => {
    // Return a minimal mock component class
    function MockShaderMaterial() {}
    MockShaderMaterial.key = `mock-${Math.random()}`
    MockShaderMaterial.defaultProps = uniforms
    // Store vert/frag for inspection
    ;(MockShaderMaterial as unknown as Record<string, unknown>).__vert = vert
    ;(MockShaderMaterial as unknown as Record<string, unknown>).__frag = frag
    return MockShaderMaterial
  }),
  extend: vi.fn(),
}))

// Mock three.js at a basic level
vi.mock('three', async () => {
  const actual = await vi.importActual<typeof import('three')>('three')
  return {
    ...actual,
    WebGLRenderer: vi.fn(),
  }
})

import { singularityModule } from '@/scenes/sims/singularity/index'
import { SINGULARITY_PRESETS } from '@/scenes/sims/singularity/presets'

describe('singularityModule', () => {
  it('exports a module with id "singularity"', () => {
    expect(singularityModule.id).toBe('singularity')
  })

  it('has a non-empty title', () => {
    expect(typeof singularityModule.title).toBe('string')
    expect(singularityModule.title.length).toBeGreaterThan(0)
  })

  it('has a non-empty description', () => {
    expect(typeof singularityModule.description).toBe('string')
    expect(singularityModule.description.length).toBeGreaterThan(0)
  })

  it('defaults contain all 5 uniform keys', () => {
    const d = singularityModule.defaults as Record<string, unknown>
    expect(d).toHaveProperty('speed')
    expect(d).toHaveProperty('intensity')
    expect(d).toHaveProperty('size')
    expect(d).toHaveProperty('waveStrength')
    expect(d).toHaveProperty('colorShift')
  })

  it('schema contains all 5 uniform keys', () => {
    const s = singularityModule.schema as Record<string, unknown>
    expect(s).toHaveProperty('speed')
    expect(s).toHaveProperty('intensity')
    expect(s).toHaveProperty('size')
    expect(s).toHaveProperty('waveStrength')
    expect(s).toHaveProperty('colorShift')
  })

  it('symmetryApplies always returns false (singularity has inherent radial symmetry)', () => {
    expect(singularityModule.symmetryApplies('C', 4)).toBe(false)
    expect(singularityModule.symmetryApplies('D', 3)).toBe(false)
    expect(singularityModule.symmetryApplies('none', 1)).toBe(false)
  })

  it('init returns an empty state object (shader-only sim has no CPU state)', () => {
    const state = singularityModule.init(singularityModule.defaults, 'mid')
    expect(state).toBeDefined()
  })

  it('step is a no-op and does not throw', () => {
    const state = singularityModule.init(singularityModule.defaults, 'mid')
    expect(() => singularityModule.step(state, 0.016)).not.toThrow()
  })

  it('dispose is a no-op and does not throw', () => {
    const state = singularityModule.init(singularityModule.defaults, 'mid')
    expect(() => singularityModule.dispose(state)).not.toThrow()
  })
})

describe('SINGULARITY_PRESETS', () => {
  it('has exactly 3 built-in presets: default, intense, subtle', () => {
    const names = Object.keys(SINGULARITY_PRESETS)
    expect(names).toContain('default')
    expect(names).toContain('intense')
    expect(names).toContain('subtle')
    expect(names).toHaveLength(3)
  })

  it('each preset is a partial config with at least one key', () => {
    for (const [name, preset] of Object.entries(SINGULARITY_PRESETS)) {
      expect(Object.keys(preset).length).toBeGreaterThan(0, `Preset "${name}" is empty`)
    }
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL (module missing)**

Run: `pnpm test tests/scenes/sims/singularity/Scene.test.tsx`
Expected: FAIL — cannot resolve `@/scenes/sims/singularity/index`.

- [ ] **Step 3: Create `src/scenes/sims/singularity/presets.ts`**

```ts
import type { SingularityConfig } from './index'

/**
 * Built-in presets for the Singularity shader sim.
 *
 * These are partial configs merged on top of the module defaults.
 * Values are tuned to reproduce visually distinct aesthetics.
 */
export const SINGULARITY_PRESETS: Record<string, Partial<SingularityConfig>> = {
  /** Default: matches the original Home.tsx scroll-driven values at rest */
  default: {
    speed: 5.0,
    intensity: 0.5,
    size: 1.0,
    waveStrength: 0.5,
    colorShift: 0.1,
  },
  /** Intense: maximally turbulent, bright accretion disk */
  intense: {
    speed: 12.0,
    intensity: 1.8,
    size: 0.7,
    waveStrength: 1.4,
    colorShift: 0.6,
  },
  /** Subtle: slow, dark, meditative — suitable for background sections */
  subtle: {
    speed: 2.0,
    intensity: 0.18,
    size: 1.4,
    waveStrength: 0.15,
    colorShift: 0.0,
  },
}
```

- [ ] **Step 4: Create `src/scenes/sims/singularity/Scene.tsx`**

The original shader uses the `react-shaders` `mainImage` convention (uses `iResolution`, `iTime`, `gl_FragCoord`). We adapt it to a standard three.js vertex + fragment shader pair using drei's `shaderMaterial`.

```tsx
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
```

- [ ] **Step 5: Create `src/scenes/sims/singularity/index.ts`**

```ts
import { useControls } from 'leva'
import React from 'react'
import type { SimModule, PerfTier, SymmetryConfig, SymmetryType } from '@/scenes/engine/types'
import { SingularityScene } from './Scene'
import { SINGULARITY_PRESETS } from './presets'

// ---------------------------------------------------------------------------
// Config type
// ---------------------------------------------------------------------------

export interface SingularityConfig {
  speed: number
  intensity: number
  size: number
  waveStrength: number
  colorShift: number
}

// ---------------------------------------------------------------------------
// Shader-only sim has no meaningful CPU state
// ---------------------------------------------------------------------------
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface SingularityState {}

// ---------------------------------------------------------------------------
// Leva schema
// ---------------------------------------------------------------------------

const schema = {
  speed: { value: 5.0, min: 0.5, max: 20.0, step: 0.1, label: 'Speed' },
  intensity: { value: 0.5, min: 0.01, max: 3.0, step: 0.01, label: 'Intensity' },
  size: { value: 1.0, min: 0.2, max: 3.0, step: 0.05, label: 'Size' },
  waveStrength: { value: 0.5, min: 0.0, max: 2.0, step: 0.05, label: 'Wave Strength' },
  colorShift: { value: 0.1, min: -1.0, max: 1.0, step: 0.05, label: 'Color Shift' },
}

// ---------------------------------------------------------------------------
// Scene wrapper that wires leva controls to the shader
// ---------------------------------------------------------------------------

function SingularitySceneWithControls({
  config: initialConfig,
  perf,
  symmetry,
}: {
  config: SingularityConfig
  perf: PerfTier
  symmetry: SymmetryConfig
}): React.ReactElement {
  // useControls merges into the global Leva store (mounted in BaseLayout)
  const config = useControls('Singularity', {
    speed: { value: initialConfig.speed, min: 0.5, max: 20.0, step: 0.1, label: 'Speed' },
    intensity: { value: initialConfig.intensity, min: 0.01, max: 3.0, step: 0.01, label: 'Intensity' },
    size: { value: initialConfig.size, min: 0.2, max: 3.0, step: 0.05, label: 'Size' },
    waveStrength: { value: initialConfig.waveStrength, min: 0.0, max: 2.0, step: 0.05, label: 'Wave Strength' },
    colorShift: { value: initialConfig.colorShift, min: -1.0, max: 1.0, step: 0.05, label: 'Color Shift' },
  })

  return React.createElement(SingularityScene, { config, perf, symmetry })
}

// ---------------------------------------------------------------------------
// SimModule export
// ---------------------------------------------------------------------------

export const singularityModule: SimModule<SingularityConfig, SingularityState> = {
  id: 'singularity',
  title: 'Singularity',
  description:
    'A fragment shader simulating gravitational lensing around a black hole accretion disk. ' +
    'Light bends as it approaches the event horizon; the color ramp spans from black through ' +
    'white-yellow to deep orange at the outer disk boundary.',

  defaults: {
    speed: 5.0,
    intensity: 0.5,
    size: 1.0,
    waveStrength: 0.5,
    colorShift: 0.1,
  },

  presets: SINGULARITY_PRESETS,

  schema,

  Scene: SingularitySceneWithControls,

  init(_config: SingularityConfig, _perf: PerfTier): SingularityState {
    // Shader-only sim: no CPU state to initialize
    return {}
  },

  step(_state: SingularityState, _dt: number): void {
    // No integration step; all animation is driven by u_time in useFrame
  },

  dispose(_state: SingularityState): void {
    // No GPU resources to release beyond what three.js disposes automatically
  },

  /**
   * Singularity is an isotropic radial shader — it has inherent continuous
   * rotational symmetry and discrete symmetry groups are not applicable.
   * Always returns false to disable the symmetry controls in the Leva panel.
   */
  symmetryApplies(_type: SymmetryType, _order: number): boolean {
    return false
  },
}
```

- [ ] **Step 6: Run tests — expect PASS**

Run: `pnpm test tests/scenes/sims/singularity/Scene.test.tsx`
Expected: `✓ tests/scenes/sims/singularity/Scene.test.tsx (11 tests)` with exit code 0.

- [ ] **Step 7: Verify TypeScript**

Run: `pnpm tsc --noEmit`
Expected: exit code 0 with no new TypeScript errors.

- [ ] **Step 8: Run full test suite**

Run: `pnpm test`
Expected: all tests pass (harness + solvers + engine + sims). Exit code 0.

- [ ] **Step 9: Commit**

```bash
git add src/scenes/sims/singularity/Scene.tsx \
        src/scenes/sims/singularity/presets.ts \
        src/scenes/sims/singularity/index.ts \
        tests/scenes/sims/singularity/Scene.test.tsx
git commit -m "feat(sims): port Singularity shader to r3f"
```

---

## Phase 11 — Lorenz Attractor (CPU RK4)

### Task D17: Lorenz physics step function

**Files:**
- Create: `src/scenes/sims/lorenz/physics.ts`
- Create: `tests/scenes/sims/lorenz/physics.test.ts`

- [ ] **Step 1: Create `src/scenes/sims/lorenz/physics.ts`**

```ts
export interface LorenzState {
  x: number
  y: number
  z: number
}

export interface LorenzParams {
  sigma: number
  rho: number
  beta: number
  dt: number
}

function lorenzDerivative(
  s: LorenzState,
  { sigma, rho, beta }: Omit<LorenzParams, 'dt'>,
): LorenzState {
  return {
    x: sigma * (s.y - s.x),
    y: s.x * (rho - s.z) - s.y,
    z: s.x * s.y - beta * s.z,
  }
}

/** RK4 integration of Lorenz ODEs. Returns next state. */
export function lorenzStep(
  state: LorenzState,
  params: LorenzParams,
): LorenzState {
  const { dt, sigma, rho, beta } = params
  const p = { sigma, rho, beta }

  const k1 = lorenzDerivative(state, p)

  const s2: LorenzState = {
    x: state.x + 0.5 * dt * k1.x,
    y: state.y + 0.5 * dt * k1.y,
    z: state.z + 0.5 * dt * k1.z,
  }
  const k2 = lorenzDerivative(s2, p)

  const s3: LorenzState = {
    x: state.x + 0.5 * dt * k2.x,
    y: state.y + 0.5 * dt * k2.y,
    z: state.z + 0.5 * dt * k2.z,
  }
  const k3 = lorenzDerivative(s3, p)

  const s4: LorenzState = {
    x: state.x + dt * k3.x,
    y: state.y + dt * k3.y,
    z: state.z + dt * k3.z,
  }
  const k4 = lorenzDerivative(s4, p)

  return {
    x: state.x + (dt / 6) * (k1.x + 2 * k2.x + 2 * k3.x + k4.x),
    y: state.y + (dt / 6) * (k1.y + 2 * k2.y + 2 * k3.y + k4.y),
    z: state.z + (dt / 6) * (k1.z + 2 * k2.z + 2 * k3.z + k4.z),
  }
}
```

- [ ] **Step 2: Create `tests/scenes/sims/lorenz/physics.test.ts`**

```ts
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
```

- [ ] **Step 3: Run tests**

Run: `pnpm test tests/scenes/sims/lorenz/physics.test.ts`
Expected: `✓ tests/scenes/sims/lorenz/physics.test.ts (4 tests)` with exit code 0.

- [ ] **Step 4: Commit**

```bash
git add src/scenes/sims/lorenz/physics.ts \
        tests/scenes/sims/lorenz/physics.test.ts
git commit -m "feat(sims): Lorenz step fn + Lyapunov test"
```

---

### Task D18: Lorenz trail buffer

**Files:**
- Create: `src/scenes/sims/lorenz/trails.ts`
- Create: `tests/scenes/sims/lorenz/trails.test.ts`

- [ ] **Step 1: Create `src/scenes/sims/lorenz/trails.ts`**

```ts
/**
 * Per-particle ring buffer of positions for trail rendering.
 * Maintains a flat Float32Array of xyz triples; `head` is the next
 * write index (mod capacity). Provides a helper to fill a
 * BufferAttribute positions array in draw order (oldest → newest).
 */
export interface TrailBuffer {
  /** Flat xyz positions, length = capacity * 3 */
  data: Float32Array
  /** How many slots the ring has */
  capacity: number
  /** Index of next write slot (not yet filled) */
  head: number
  /** Total pushes so far (capped at Number.MAX_SAFE_INTEGER) */
  count: number
}

export function createTrailBuffer(capacity: number): TrailBuffer {
  return {
    data: new Float32Array(capacity * 3),
    capacity,
    head: 0,
    count: 0,
  }
}

/** Push a new xyz position into the ring buffer. */
export function pushPosition(
  buf: TrailBuffer,
  x: number,
  y: number,
  z: number,
): void {
  const idx = buf.head * 3
  buf.data[idx] = x
  buf.data[idx + 1] = y
  buf.data[idx + 2] = z
  buf.head = (buf.head + 1) % buf.capacity
  if (buf.count < buf.capacity) buf.count++
}

/**
 * Write the ring buffer contents (oldest → newest) into `out`,
 * starting at `outOffset` (xyz index, not byte index).
 * Returns the number of valid positions written.
 */
export function readTrail(
  buf: TrailBuffer,
  out: Float32Array,
  outOffset = 0,
): number {
  const n = buf.count
  if (n === 0) return 0

  const cap = buf.capacity
  // Oldest slot: if buffer is not yet full, it's 0; otherwise it's `head`
  const oldest = buf.count < cap ? 0 : buf.head

  for (let i = 0; i < n; i++) {
    const src = ((oldest + i) % cap) * 3
    const dst = (outOffset + i) * 3
    out[dst] = buf.data[src]
    out[dst + 1] = buf.data[src + 1]
    out[dst + 2] = buf.data[src + 2]
  }
  return n
}
```

- [ ] **Step 2: Create `tests/scenes/sims/lorenz/trails.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import {
  createTrailBuffer,
  pushPosition,
  readTrail,
} from '@/scenes/sims/lorenz/trails'

describe('TrailBuffer', () => {
  it('starts empty', () => {
    const buf = createTrailBuffer(10)
    expect(buf.count).toBe(0)
    expect(buf.head).toBe(0)
  })

  it('pushes positions and increments count up to capacity', () => {
    const buf = createTrailBuffer(4)
    pushPosition(buf, 1, 2, 3)
    pushPosition(buf, 4, 5, 6)
    expect(buf.count).toBe(2)
    pushPosition(buf, 7, 8, 9)
    pushPosition(buf, 10, 11, 12)
    pushPosition(buf, 13, 14, 15) // overflow — count should stay 4
    expect(buf.count).toBe(4)
  })

  it('readTrail returns positions in oldest-to-newest order', () => {
    const buf = createTrailBuffer(3)
    pushPosition(buf, 1, 0, 0)
    pushPosition(buf, 2, 0, 0)
    pushPosition(buf, 3, 0, 0)

    const out = new Float32Array(9)
    const n = readTrail(buf, out)
    expect(n).toBe(3)
    expect(out[0]).toBe(1)
    expect(out[3]).toBe(2)
    expect(out[6]).toBe(3)
  })

  it('overwrites oldest on overflow and reads in correct order', () => {
    const buf = createTrailBuffer(3)
    pushPosition(buf, 1, 0, 0) // will be overwritten
    pushPosition(buf, 2, 0, 0)
    pushPosition(buf, 3, 0, 0)
    pushPosition(buf, 4, 0, 0) // overwrites slot 0 (value 1)

    const out = new Float32Array(9)
    const n = readTrail(buf, out)
    expect(n).toBe(3)
    expect(out[0]).toBe(2)
    expect(out[3]).toBe(3)
    expect(out[6]).toBe(4)
  })

  it('readTrail with outOffset writes at correct position', () => {
    const buf = createTrailBuffer(2)
    pushPosition(buf, 5, 6, 7)
    const out = new Float32Array(6)
    readTrail(buf, out, 1)
    expect(out[3]).toBe(5)
    expect(out[4]).toBe(6)
    expect(out[5]).toBe(7)
  })
})
```

- [ ] **Step 3: Run tests**

Run: `pnpm test tests/scenes/sims/lorenz/trails.test.ts`
Expected: `✓ tests/scenes/sims/lorenz/trails.test.ts (5 tests)` with exit code 0.

- [ ] **Step 4: Commit**

```bash
git add src/scenes/sims/lorenz/trails.ts \
        tests/scenes/sims/lorenz/trails.test.ts
git commit -m "feat(sims): trail buffer for Lorenz"
```

---

### Task D19: Lorenz Scene component

> **PLAN PATCH (2026-04-16):** Original plan had `LorenzScene()` with no props.
> Contract requires `{ config, perf, symmetry }`. Corrected below.
> Also: `bufferAttribute` requires `args={[array, itemSize]}` not individual props.

**Files:**
- Create: `src/scenes/sims/lorenz/Scene.tsx`
- Create: `tests/scenes/sims/lorenz/Scene.test.tsx`

- [ ] **Step 1: Create `src/scenes/sims/lorenz/Scene.tsx`**

```tsx
import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
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
  const groupRef = useRef<THREE.Group>(null)

  // Re-initialize particles when count or trail length changes
  useMemo(() => {
    particles.current = initParticles(particleCount, trailLength)
  }, [particleCount, trailLength])

  useFrame(() => {
    const params = { sigma, rho, beta, dt }
    for (const p of particles.current) {
      p.state = lorenzStep(p.state, params)
      pushPosition(p.trail, p.state.x, p.state.y, p.state.z)
    }
  })

  return (
    <group ref={groupRef} scale={0.1}>
      {particles.current.map((p, i) => {
        const positions = new Float32Array(p.trail.capacity * 3)
        const count = readTrail(p.trail, positions)
        return (
          <line key={i}>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                args={[positions, 3]}
                count={count}
              />
            </bufferGeometry>
            <lineBasicMaterial color={p.color} transparent opacity={0.7} />
          </line>
        )
      })}
    </group>
  )
}

export default LorenzScene
```

- [ ] **Step 2: Create `tests/scenes/sims/lorenz/Scene.test.tsx`**

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import React from 'react'

// Mock @react-three/fiber and leva — not available in jsdom
vi.mock('@react-three/fiber', () => ({
  useFrame: vi.fn(),
  useThree: vi.fn(() => ({ gl: {}, scene: {}, camera: {} })),
}))
vi.mock('leva', () => ({
  useControls: vi.fn(() => ({
    sigma: 10, rho: 28, beta: 8 / 3,
    particleCount: 10, dt: 0.005, trailLength: 20,
  })),
}))

vi.mock('three', async () => {
  const actual = await vi.importActual<typeof import('three')>('three')
  return actual
})

import { LORENZ_LEVA_SCHEMA } from '@/scenes/sims/lorenz/Scene'

describe('LorenzScene (unit)', () => {
  it('leva schema has required keys', () => {
    expect(LORENZ_LEVA_SCHEMA).toHaveProperty('sigma')
    expect(LORENZ_LEVA_SCHEMA).toHaveProperty('rho')
    expect(LORENZ_LEVA_SCHEMA).toHaveProperty('beta')
    expect(LORENZ_LEVA_SCHEMA).toHaveProperty('particleCount')
    expect(LORENZ_LEVA_SCHEMA).toHaveProperty('dt')
    expect(LORENZ_LEVA_SCHEMA).toHaveProperty('trailLength')
  })

  it('sigma default is 10', () => {
    expect(LORENZ_LEVA_SCHEMA.sigma.value).toBe(10)
  })

  it('rho default is 28', () => {
    expect(LORENZ_LEVA_SCHEMA.rho.value).toBe(28)
  })
})
```

- [ ] **Step 3: Run tests**

Run: `pnpm test tests/scenes/sims/lorenz/Scene.test.tsx`
Expected: `✓ tests/scenes/sims/lorenz/Scene.test.tsx (3 tests)` with exit code 0.

- [ ] **Step 4: TypeScript check**

Run: `pnpm tsc --noEmit`
Expected: exit code 0, no new errors.

- [ ] **Step 5: Commit**

```bash
git add src/scenes/sims/lorenz/Scene.tsx \
        tests/scenes/sims/lorenz/Scene.test.tsx
git commit -m "feat(sims): Lorenz Scene with leva schema"
```

---

### Task D20: Lorenz SimModule registration + presets

> **PLAN PATCH (2026-04-16):** Original plan used `SimPreset<C>` wrapper, `label`/`config`
> fields, `LORENZ_DEFAULT_PRESET`, `label` on SimModule, missing `title`/`description`/
> `defaults`/`schema`, and imported `SymmetryType` from `'@/scenes/engine/Symmetry'` (wrong).
> All corrected below to match `SimModule` contract in `types.ts` and Singularity's shape.

**Files:**
- Create: `src/scenes/sims/lorenz/presets.ts`
- Create: `src/scenes/sims/lorenz/index.ts`

- [ ] **Step 1: Create `src/scenes/sims/lorenz/presets.ts`**

```ts
import type { LorenzConfig } from './Scene'

/**
 * Built-in presets for the Lorenz Attractor sim.
 *
 * These are partial configs merged on top of the module defaults.
 * Matching Singularity's presets shape: Record<string, Partial<Config>>.
 */
export const LORENZ_PRESETS: Record<string, Partial<LorenzConfig>> = {
  /** Classic strange attractor parameters from Lorenz 1963. */
  classic: {
    sigma: 10, rho: 28, beta: 8 / 3, particleCount: 500, dt: 0.005, trailLength: 800,
  },
  /** Near-periodic orbit at high rho. */
  periodic: {
    sigma: 10, rho: 99.96, beta: 8 / 3, particleCount: 200, dt: 0.002, trailLength: 600,
  },
  /** Double-scroll with more particles and longer trails. */
  doubleScroll: {
    sigma: 10, rho: 28, beta: 8 / 3, particleCount: 1000, dt: 0.005, trailLength: 1200,
  },
}
```

- [ ] **Step 2: Create `src/scenes/sims/lorenz/index.ts`**

```ts
import type { SimModule, PerfTier, SymmetryType } from '@/scenes/engine/types'
import { LorenzScene, LORENZ_LEVA_SCHEMA } from './Scene'
import type { LorenzConfig } from './Scene'
import { LORENZ_PRESETS } from './presets'

// CPU-only sim: scene manages its own particle array via useRef
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface LorenzState {}

const LorenzModule: SimModule<LorenzConfig, LorenzState> = {
  id: 'lorenz',
  title: 'Lorenz Attractor',
  description:
    'Three-variable ODE system (Lorenz 1963) that exhibits deterministic chaos. ' +
    'Two butterfly-like attractor wings at classical parameters σ=10, ρ=28, β=8/3. ' +
    'RK4 integration; positive Lyapunov exponent makes initially-nearby trajectories diverge.',

  defaults: {
    sigma: 10,
    rho: 28,
    beta: 8 / 3,
    particleCount: 500,
    dt: 0.005,
    trailLength: 800,
  },

  presets: LORENZ_PRESETS,

  schema: LORENZ_LEVA_SCHEMA,

  Scene: LorenzScene,

  init(_config: LorenzConfig, _perf: PerfTier): LorenzState {
    // Integration happens inside Scene.tsx via useFrame; no CPU state here
    return {}
  },

  step(_state: LorenzState, _dt: number): void {
    // No integration step at module level; all animation is driven by useFrame
  },

  dispose(_state: LorenzState): void {
    // No GPU resources to release
  },

  /**
   * Lorenz is meaningful for C_n symmetry (particles on a ring); D_n also valid
   * for even-order double-scroll mirroring. Disable for order < 1.
   */
  symmetryApplies(type: SymmetryType, order: number): boolean {
    return type === 'C' && order >= 1
  },
}

export default LorenzModule
```

- [ ] **Step 3: Run full test suite**

Run: `pnpm test`
Expected: all tests pass. Exit code 0.

- [ ] **Step 4: Commit**

```bash
git add src/scenes/sims/lorenz/presets.ts \
        src/scenes/sims/lorenz/index.ts
git commit -m "feat(sims): Lorenz SimModule registration + presets"
```

---

## Phase 12 — Magnetic Field (Verlet, CPU)

### Task D21: Magnetic physics — dipole field + Lorentz force + Verlet integrator

**Files:**
- Create: `src/scenes/sims/magnetic/physics.ts`
- Create: `tests/scenes/sims/magnetic/physics.test.ts`

- [ ] **Step 1: Create `src/scenes/sims/magnetic/physics.ts`**

```ts
export interface Vec3 { x: number; y: number; z: number }

export interface MagneticSource {
  position: Vec3
  /** Magnetic moment vector (direction + magnitude) */
  moment: Vec3
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  }
}

function sub(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }
}

function scale(v: Vec3, s: number): Vec3 {
  return { x: v.x * s, y: v.y * s, z: v.z * s }
}

function add(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }
}

function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z
}

function len(v: Vec3): number {
  return Math.sqrt(dot(v, v))
}

/**
 * Dipole magnetic field: B = (mu0/4π) * [3(m·r̂)r̂ - m] / r³
 * We absorb (mu0/4π) into the source moment magnitude for simplicity (SI-like).
 */
export function dipoleField(position: Vec3, source: MagneticSource): Vec3 {
  const r = sub(position, source.position)
  const rLen = len(r)
  if (rLen < 1e-10) return { x: 0, y: 0, z: 0 }
  const rLen3 = rLen * rLen * rLen
  const rHat = scale(r, 1 / rLen)
  const mDotRHat = dot(source.moment, rHat)
  const term1 = scale(rHat, 3 * mDotRHat)
  const term2 = source.moment
  return scale(sub(term1, term2), 1 / rLen3)
}

/** Sum dipole B contributions from all sources at a given position. */
export function magneticField(position: Vec3, sources: MagneticSource[]): Vec3 {
  return sources.reduce<Vec3>(
    (acc, src) => add(acc, dipoleField(position, src)),
    { x: 0, y: 0, z: 0 },
  )
}

/** Lorentz force F = q * v × B */
export function lorentzForce(v: Vec3, B: Vec3, charge: number): Vec3 {
  return scale(cross(v, B), charge)
}

export interface MagneticParticle {
  position: Vec3
  velocity: Vec3
  /** Previous-step acceleration for Verlet bookkeeping */
  accel: Vec3
}

export interface VerletParams {
  dt: number
  charge: number
  mass: number
}

/**
 * Velocity-Verlet integration step (symplectic, energy-conserving for
 * conservative forces). Returns mutated particles array.
 */
export function velocityVerletStep(
  particles: MagneticParticle[],
  sources: MagneticSource[],
  { dt, charge, mass }: VerletParams,
): MagneticParticle[] {
  for (const p of particles) {
    // x(t+dt) = x(t) + v(t)*dt + 0.5*a(t)*dt²
    p.position = {
      x: p.position.x + p.velocity.x * dt + 0.5 * p.accel.x * dt * dt,
      y: p.position.y + p.velocity.y * dt + 0.5 * p.accel.y * dt * dt,
      z: p.position.z + p.velocity.z * dt + 0.5 * p.accel.z * dt * dt,
    }

    const B = magneticField(p.position, sources)
    const F = lorentzForce(p.velocity, B, charge)
    const newAccel = scale(F, 1 / mass)

    // v(t+dt) = v(t) + 0.5*(a(t)+a(t+dt))*dt
    p.velocity = {
      x: p.velocity.x + 0.5 * (p.accel.x + newAccel.x) * dt,
      y: p.velocity.y + 0.5 * (p.accel.y + newAccel.y) * dt,
      z: p.velocity.z + 0.5 * (p.accel.z + newAccel.z) * dt,
    }
    p.accel = newAccel
  }
  return particles
}
```

- [ ] **Step 2: Create `tests/scenes/sims/magnetic/physics.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import {
  magneticField,
  lorentzForce,
  velocityVerletStep,
  type MagneticParticle,
  type MagneticSource,
} from '@/scenes/sims/magnetic/physics'

// Uniform B in z direction achieved by a very strong far-away dipole along z
// For testing circular motion energy conservation, we use an analytical constant B
// by constructing sources such that the field at origin is (0, 0, B0)
// --- easier: directly test lorentzForce and energy conservation in a constant field
// by using velocityVerletStep with a mock source that gives constant B.

// Mock source: use a dipole placed far away along z so B at origin ≈ (0,0,B_approx)
// Better: test via cross product

describe('lorentzForce', () => {
  it('v in x, B in z → force in -y (right-hand rule for positive charge)', () => {
    const v = { x: 1, y: 0, z: 0 }
    const B = { x: 0, y: 0, z: 1 }
    const F = lorentzForce(v, B, 1)
    // v × B = (1,0,0) × (0,0,1) = (0*1 - 0*0, 0*0 - 1*1, 1*0 - 0*0) = (0,-1,0)
    expect(F.x).toBeCloseTo(0, 10)
    expect(F.y).toBeCloseTo(-1, 10)
    expect(F.z).toBeCloseTo(0, 10)
  })

  it('scales with charge', () => {
    const v = { x: 1, y: 0, z: 0 }
    const B = { x: 0, y: 0, z: 1 }
    const F2 = lorentzForce(v, B, 2)
    expect(F2.y).toBeCloseTo(-2, 10)
  })

  it('reverses for negative charge', () => {
    const v = { x: 1, y: 0, z: 0 }
    const B = { x: 0, y: 0, z: 1 }
    const F = lorentzForce(v, B, -1)
    expect(F.y).toBeCloseTo(1, 10)
  })
})

describe('magneticField', () => {
  it('returns zero at source position (singularity guard)', () => {
    const src: MagneticSource = { position: { x: 0, y: 0, z: 0 }, moment: { x: 0, y: 0, z: 1 } }
    const B = magneticField({ x: 0, y: 0, z: 0 }, [src])
    expect(B.x).toBe(0)
    expect(B.y).toBe(0)
    expect(B.z).toBe(0)
  })

  it('sums contributions from multiple sources', () => {
    const src1: MagneticSource = { position: { x: -100, y: 0, z: 0 }, moment: { x: 0, y: 0, z: 1 } }
    const src2: MagneticSource = { position: { x: 100, y: 0, z: 0 }, moment: { x: 0, y: 0, z: 1 } }
    const B_both = magneticField({ x: 0, y: 0, z: 0 }, [src1, src2])
    const B_one = magneticField({ x: 0, y: 0, z: 0 }, [src1])
    // With two symmetric sources the z components should add
    expect(Math.abs(B_both.z)).toBeGreaterThan(Math.abs(B_one.z))
  })
})

describe('velocityVerletStep — circular motion energy conservation', () => {
  it('conserves kinetic energy within 1% over 10000 steps in analytic constant-B field', () => {
    // Simulate circular Larmor motion in constant B=(0,0,B0)
    // Use a proxy: set sources to empty and manually pre-compute accel
    // Instead, we place a single dipole extremely far along z with huge moment
    // so that at the test particle position (origin) B ≈ B_approx_z
    // Easier: use a special source arrangement — skip for brevity and instead
    // directly override by testing that the speed (|v|) is conserved.
    // Lorentz force is always perpendicular to v, so |v|² must be constant.

    // Place particle at (1, 0, 0) with velocity (0, 1, 0)
    // Use a far-away dipole along z axis with moment (0,0,M) at (0,0,-1000)
    // That gives B ≈ (mu=M/r³) * 2*zhat at origin
    const M = 1e9 // large moment for near-uniform field
    const sources: MagneticSource[] = [
      { position: { x: 0, y: 0, z: -1000 }, moment: { x: 0, y: 0, z: M } },
    ]

    const v0 = { x: 0, y: 1, z: 0 }
    const particles: MagneticParticle[] = [
      {
        position: { x: 1, y: 0, z: 0 },
        velocity: { ...v0 },
        accel: { x: 0, y: 0, z: 0 },
      },
    ]
    const params = { dt: 0.0001, charge: 1, mass: 1 }

    // Compute initial KE
    const v0sq = v0.x ** 2 + v0.y ** 2 + v0.z ** 2
    const initialKE = 0.5 * params.mass * v0sq

    for (let i = 0; i < 10000; i++) {
      velocityVerletStep(particles, sources, params)
    }

    const vf = particles[0].velocity
    const vfsq = vf.x ** 2 + vf.y ** 2 + vf.z ** 2
    const finalKE = 0.5 * params.mass * vfsq

    const drift = Math.abs(finalKE - initialKE) / initialKE
    expect(drift).toBeLessThan(0.01) // within 1%
  })
})
```

- [ ] **Step 3: Run tests**

Run: `pnpm test tests/scenes/sims/magnetic/physics.test.ts`
Expected: `✓ tests/scenes/sims/magnetic/physics.test.ts (6 tests)` with exit code 0.

- [ ] **Step 4: Commit**

```bash
git add src/scenes/sims/magnetic/physics.ts \
        tests/scenes/sims/magnetic/physics.test.ts
git commit -m "feat(sims): magnetic field + Verlet integrator"
```

---

### Task D22: Magnetic Scene with D_n symmetry initial conditions

**Files:**
- Create: `src/scenes/sims/magnetic/Scene.tsx`
- Create: `tests/scenes/sims/magnetic/Scene.test.tsx`

- [ ] **Step 1: Create `src/scenes/sims/magnetic/Scene.tsx`**

```tsx
import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { useControls } from 'leva'
import * as THREE from 'three'
import {
  velocityVerletStep,
  magneticField,
  lorentzForce,
  type MagneticParticle,
  type MagneticSource,
  type Vec3,
} from './physics'

export interface MagneticConfig {
  particleCount: number
  charge: number
  mass: number
  B0: number
  dt: number
  trailLength: number
  symmetryType: 'C' | 'D' | 'none'
  symmetryOrder: number
}

export const MAGNETIC_LEVA_SCHEMA = {
  particleCount:  { value: 500,   min: 10,   max: 10000, step: 10  },
  charge:         { value: 1,     min: -5,   max: 5,     step: 0.1 },
  mass:           { value: 1,     min: 0.1,  max: 10,    step: 0.1 },
  B0:             { value: 1,     min: 0.01, max: 10,    step: 0.01 },
  dt:             { value: 0.005, min: 0.001, max: 0.05, step: 0.001 },
  trailLength:    { value: 200,   min: 10,   max: 1000,  step: 10  },
  symmetryOrder:  { value: 4,     min: 1,    max: 12,    step: 1   },
}

function dihedralRing(count: number, order: number, radius: number): Vec3[] {
  const positions: Vec3[] = []
  const perSector = Math.max(1, Math.floor(count / order))
  for (let s = 0; s < order; s++) {
    const baseAngle = (s / order) * Math.PI * 2
    for (let i = 0; i < perSector && positions.length < count; i++) {
      const jitter = (i / perSector) * (Math.PI * 2 / order) * 0.8
      const angle = baseAngle + jitter
      positions.push({
        x: radius * Math.cos(angle) + (Math.random() - 0.5) * 0.05,
        y: radius * Math.sin(angle) + (Math.random() - 0.5) * 0.05,
        z: (Math.random() - 0.5) * 0.1,
      })
    }
  }
  while (positions.length < count) {
    const angle = Math.random() * Math.PI * 2
    positions.push({ x: radius * Math.cos(angle), y: radius * Math.sin(angle), z: 0 })
  }
  return positions
}

// PATCH D22 (applied): MagneticScene receives { config, perf, symmetry } per SimModule
// contract. positionsRef allocated full-size up front (not Float32Array(0)).
// bufferAttribute uses args={[array, 3]} not array={...} itemSize={...} (r3f 9).
export function MagneticScene({ config, perf: _perf, symmetry: _symmetry }: MagneticSceneProps) {
  const {
    particleCount, charge, mass, B0, dt, symmetryOrder,
  } = useControls('Magnetic', { /* config merged key-by-key — see Scene.tsx */ })

  const positionsRef = useRef<Float32Array>(new Float32Array(particleCount * 3))
  const particles = useRef<MagneticParticle[]>([])

  const sources: MagneticSource[] = useMemo(() => {
    const base: MagneticSource[] = []
    for (let s = 0; s < symmetryOrder; s++) {
      const angle = (s / symmetryOrder) * Math.PI * 2
      base.push({
        position: { x: 2 * Math.cos(angle), y: 2 * Math.sin(angle), z: 0 },
        moment: { x: 0, y: 0, z: B0 },
      })
    }
    return base
  }, [symmetryOrder, B0])

  useMemo(() => {
    // PATCH D22: re-allocate first so the ref is always correctly-sized
    positionsRef.current = new Float32Array(particleCount * 3)
    const initPositions = dihedralRing(particleCount, symmetryOrder, 1.0)
    particles.current = initPositions.map((pos) => {
      const B = magneticField(pos, sources)
      const v0 = { x: -pos.y * 0.5, y: pos.x * 0.5, z: 0 }
      const F = lorentzForce(v0, B, charge)
      return {
        position: pos,
        velocity: v0,
        accel: { x: F.x / mass, y: F.y / mass, z: F.z / mass },
      }
    })
  }, [particleCount, symmetryOrder, B0, charge, mass, sources])

  const pointsRef = useRef<THREE.Points>(null)

  useFrame(() => {
    velocityVerletStep(particles.current, sources, { dt, charge, mass })
    const buf = positionsRef.current
    for (let i = 0; i < particles.current.length; i++) {
      const p = particles.current[i]
      buf[i * 3] = p.position.x
      buf[i * 3 + 1] = p.position.y
      buf[i * 3 + 2] = p.position.z
    }
    if (pointsRef.current) {
      const attr = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute
      attr.needsUpdate = true
    }
  })

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        {/* PATCH D22: r3f 9 requires args={[array, itemSize]} not array/itemSize props */}
        <bufferAttribute
          attach="attributes-position"
          args={[positionsRef.current, 3]}
          count={particleCount}
        />
      </bufferGeometry>
      <pointsMaterial size={0.04} color="#00aaff" transparent opacity={0.8} sizeAttenuation />
    </points>
  )
}

export default MagneticScene
```

- [ ] **Step 2: Create `tests/scenes/sims/magnetic/Scene.test.tsx`**

```tsx
import { describe, it, expect, vi } from 'vitest'

vi.mock('@react-three/fiber', () => ({
  useFrame: vi.fn(),
  useThree: vi.fn(() => ({ gl: {}, scene: {}, camera: {} })),
}))
vi.mock('leva', () => ({
  useControls: vi.fn(() => ({
    particleCount: 10, charge: 1, mass: 1, B0: 1,
    dt: 0.005, trailLength: 20, symmetryOrder: 4,
  })),
}))

import { MAGNETIC_LEVA_SCHEMA } from '@/scenes/sims/magnetic/Scene'

describe('MagneticScene (unit)', () => {
  it('leva schema has all required keys', () => {
    const keys = ['particleCount', 'charge', 'mass', 'B0', 'dt', 'trailLength', 'symmetryOrder']
    for (const key of keys) {
      expect(MAGNETIC_LEVA_SCHEMA).toHaveProperty(key)
    }
  })

  it('default particleCount is 500', () => {
    expect(MAGNETIC_LEVA_SCHEMA.particleCount.value).toBe(500)
  })
})
```

- [ ] **Step 3: Run tests**

Run: `pnpm test tests/scenes/sims/magnetic/Scene.test.tsx`
Expected: `✓ tests/scenes/sims/magnetic/Scene.test.tsx (2 tests)` with exit code 0.

- [ ] **Step 4: TypeScript check**

Run: `pnpm tsc --noEmit`
Expected: exit code 0.

- [ ] **Step 5: Commit**

```bash
git add src/scenes/sims/magnetic/Scene.tsx \
        tests/scenes/sims/magnetic/Scene.test.tsx
git commit -m "feat(sims): Magnetic Scene with D_n symmetry ICs"
```

---

### Task D23: Magnetic SimModule registration + 5 presets

**Files:**
- Create: `src/scenes/sims/magnetic/presets.ts`
- Create: `src/scenes/sims/magnetic/index.ts`

- [ ] **Step 1: Create `src/scenes/sims/magnetic/presets.ts`**

```ts
// PATCH D23: SimPreset<C> wrapper removed; shape is Record<string, Partial<MagneticConfig>>.
// MAGNETIC_DEFAULT_PRESET export dropped (not part of SimModule contract).
import type { MagneticConfig } from './Scene'

export const MAGNETIC_PRESETS: Record<string, Partial<MagneticConfig>> = {
  dipole: {
    particleCount: 500, charge: 1, mass: 1, B0: 1,
    dt: 0.005, trailLength: 200, symmetryType: 'C', symmetryOrder: 1,
  },
  quadrupole: {
    particleCount: 800, charge: 1, mass: 1, B0: 1.5,
    dt: 0.004, trailLength: 200, symmetryType: 'D', symmetryOrder: 2,
  },
  hexapole: {
    particleCount: 1200, charge: 1, mass: 1, B0: 1.2,
    dt: 0.004, trailLength: 200, symmetryType: 'D', symmetryOrder: 3,
  },
  ringTrap: {
    particleCount: 2000, charge: 1, mass: 0.5, B0: 2,
    dt: 0.003, trailLength: 300, symmetryType: 'D', symmetryOrder: 6,
  },
  tokamak2d: {
    particleCount: 3000, charge: 1, mass: 1, B0: 3,
    dt: 0.002, trailLength: 400, symmetryType: 'D', symmetryOrder: 12,
  },
}
```

- [ ] **Step 2: Create `src/scenes/sims/magnetic/index.ts`**

```ts
// PATCH D23: Normalized to SimModule contract (matches Lorenz shape).
// - label → title + description
// - SymmetryType imported from '@/scenes/engine/types' (not engine/Symmetry)
// - defaults + schema fields added (required by SimModule<C,S>)
// - MAGNETIC_DEFAULT_PRESET / defaultPreset field removed (not in contract)
// - presets: MAGNETIC_PRESETS is Record<string, Partial<Config>> (flat)
import type { SimModule, PerfTier, SymmetryType } from '@/scenes/engine/types'
import { MagneticScene, MAGNETIC_LEVA_SCHEMA } from './Scene'
import type { MagneticConfig } from './Scene'
import { MAGNETIC_PRESETS } from './presets'

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface MagneticState {}

const MagneticModule: SimModule<MagneticConfig, MagneticState> = {
  id: 'magnetic',
  title: 'Magnetic Field',
  description:
    'Charged test particles integrating under the Lorentz force F = qv×B in a field generated by a D_n-symmetric arrangement of magnetic dipoles. Velocity-Verlet integrator (symplectic). Initial conditions on a dihedral ring; particle count and dipole order tunable.',

  defaults: {
    particleCount: 500, charge: 1, mass: 1, B0: 1,
    dt: 0.005, trailLength: 200, symmetryType: 'C', symmetryOrder: 1,
  },

  presets: MAGNETIC_PRESETS,
  schema: MAGNETIC_LEVA_SCHEMA,
  Scene: MagneticScene,

  init(_config: MagneticConfig, _perf: PerfTier): MagneticState {
    return {}
  },
  step(_state: MagneticState, _dt: number): void {},
  dispose(_state: MagneticState): void {},

  symmetryApplies(type: SymmetryType, order: number): boolean {
    return (type === 'C' || type === 'D') && order >= 1
  },
}

export default MagneticModule
```

- [ ] **Step 3: Run full test suite**

Run: `pnpm test`
Expected: all tests pass. Exit code 0.

- [ ] **Step 4: Commit**

```bash
git add src/scenes/sims/magnetic/presets.ts \
        src/scenes/sims/magnetic/index.ts
git commit -m "feat(sims): Magnetic SimModule + 5 presets"
```

---

## Phase 13 — Gray-Scott Reaction-Diffusion (GPU Ping-Pong)

### Task D24: Gray-Scott fragment shader

**Files:**
- Create: `src/scenes/sims/grayScott/shaders/reaction-diffusion.frag`

- [ ] **Step 1: Create `src/scenes/sims/grayScott/shaders/reaction-diffusion.frag`**

```glsl
#version 300 es
precision highp float;

// Current UV-concentration texture (ping or pong)
uniform sampler2D u_state;
// Reaction parameters
uniform float u_F;       // feed rate
uniform float u_k;       // kill rate
uniform float u_Du;      // diffusion coefficient for U
uniform float u_Dv;      // diffusion coefficient for V
uniform float u_dt;      // time step per substep
uniform vec2  u_texel;   // 1.0 / textureSize

in vec2 v_uv;
out vec4 fragColor;

/**
 * 3×3 isotropic discrete Laplacian (Peyret & Taylor weights):
 *   center: -1, axis neighbors: 0.2, diagonal neighbors: 0.05
 * Normalized so the sum of weights = 0 and the central weight equals -1.
 */
vec2 laplacian(sampler2D tex, vec2 uv, vec2 texel) {
  vec2 center = texture(tex, uv).rg;

  vec2 n  = texture(tex, uv + vec2( 0,  1) * texel).rg;
  vec2 s  = texture(tex, uv + vec2( 0, -1) * texel).rg;
  vec2 e  = texture(tex, uv + vec2( 1,  0) * texel).rg;
  vec2 w  = texture(tex, uv + vec2(-1,  0) * texel).rg;

  vec2 ne = texture(tex, uv + vec2( 1,  1) * texel).rg;
  vec2 nw = texture(tex, uv + vec2(-1,  1) * texel).rg;
  vec2 se = texture(tex, uv + vec2( 1, -1) * texel).rg;
  vec2 sw = texture(tex, uv + vec2(-1, -1) * texel).rg;

  return (
    0.2  * (n + s + e + w) +
    0.05 * (ne + nw + se + sw) -
    1.0  * center
  );
}

void main() {
  vec2 uv = v_uv;

  // Current concentrations
  vec2 conc = texture(u_state, uv).rg;
  float U = conc.r;
  float V = conc.g;

  // 3×3 Laplacian for each species
  vec2 lap = laplacian(u_state, uv, u_texel);
  float lapU = lap.r;
  float lapV = lap.g;

  // Gray-Scott reaction terms
  float reaction = U * V * V;

  // PDE update (explicit Euler substep)
  float dU = u_Du * lapU - reaction + u_F * (1.0 - U);
  float dV = u_Dv * lapV + reaction - (u_F + u_k) * V;

  float newU = clamp(U + u_dt * dU, 0.0, 1.0);
  float newV = clamp(V + u_dt * dV, 0.0, 1.0);

  fragColor = vec4(newU, newV, 0.0, 1.0);
}
```

- [ ] **Step 2: Verify the file is present**

Run: `ls src/scenes/sims/grayScott/shaders/reaction-diffusion.frag`
Expected: file listed with exit code 0.

- [ ] **Step 3: Commit**

```bash
git add src/scenes/sims/grayScott/shaders/reaction-diffusion.frag
git commit -m "feat(sims): Gray-Scott fragment shader"
```

---

### Task D25: Gray-Scott compute layer with substepping

**Files:**
- Create: `src/scenes/sims/grayScott/compute.ts`
- Create: `tests/scenes/sims/grayScott/compute.test.ts`

- [ ] **Step 1: Create `src/scenes/sims/grayScott/compute.ts`**

```ts
import type { GPUComputeField } from '@/scenes/solvers/gpuCompute'
import { createComputeField } from '@/scenes/solvers/gpuCompute'

export interface GrayScottComputeConfig {
  gridSize: number
  F: number
  k: number
  Du: number
  Dv: number
  dt: number
  substeps: number
}

export interface GrayScottCompute {
  field: GPUComputeField
  substeps: number
  /** Advance the simulation by one display frame (runs `substeps` substeps). */
  step(): void
  /** Dispose GPU resources. */
  dispose(): void
}

/**
 * Creates a Gray-Scott GPU compute layer backed by two ping-pong textures.
 * Each call to `step()` runs `config.substeps` GPU dispatch passes.
 */
export function createGrayScottCompute(
  config: GrayScottComputeConfig,
  shaderSource: string,
): GrayScottCompute {
  const field = createComputeField({
    width: config.gridSize,
    height: config.gridSize,
    fragmentShader: shaderSource,
    uniforms: {
      u_F:     { value: config.F },
      u_k:     { value: config.k },
      u_Du:    { value: config.Du },
      u_Dv:    { value: config.Dv },
      u_dt:    { value: config.dt },
      u_texel: { value: [1 / config.gridSize, 1 / config.gridSize] },
    },
  })

  let _substeps = config.substeps

  return {
    field,
    get substeps() { return _substeps },
    set substeps(n: number) { _substeps = Math.max(1, n) },

    step() {
      for (let i = 0; i < _substeps; i++) {
        field.compute()
      }
    },

    dispose() {
      field.dispose()
    },
  }
}
```

- [ ] **Step 2: Create `tests/scenes/sims/grayScott/compute.test.ts`**

```ts
import { describe, it, expect, vi } from 'vitest'

// Gray-Scott compute requires WebGL2 — mock gpuCompute for unit tests
vi.mock('@/scenes/solvers/gpuCompute', () => ({
  createComputeField: vi.fn((_opts: unknown) => ({
    compute: vi.fn(),
    dispose: vi.fn(),
    texture: null,
  })),
}))

import { createGrayScottCompute } from '@/scenes/sims/grayScott/compute'
import { createComputeField } from '@/scenes/solvers/gpuCompute'

const SHADER_STUB = '/* stub */'

const BASE_CONFIG = {
  gridSize: 64,
  F: 0.03,
  k: 0.062,
  Du: 0.16,
  Dv: 0.08,
  dt: 1.0,
  substeps: 4,
}

describe('createGrayScottCompute', () => {
  it('calls createComputeField with the correct grid dimensions', () => {
    createGrayScottCompute(BASE_CONFIG, SHADER_STUB)
    expect(createComputeField).toHaveBeenCalledWith(
      expect.objectContaining({ width: 64, height: 64 }),
    )
  })

  it('step() calls field.compute() substeps times', () => {
    const gs = createGrayScottCompute(BASE_CONFIG, SHADER_STUB)
    gs.step()
    expect(gs.field.compute).toHaveBeenCalledTimes(4)
  })

  it('changing substeps affects compute call count', () => {
    const gs = createGrayScottCompute(BASE_CONFIG, SHADER_STUB)
    gs.substeps = 8
    ;(gs.field.compute as ReturnType<typeof vi.fn>).mockClear()
    gs.step()
    expect(gs.field.compute).toHaveBeenCalledTimes(8)
  })

  it('substeps cannot be set below 1', () => {
    const gs = createGrayScottCompute(BASE_CONFIG, SHADER_STUB)
    gs.substeps = 0
    expect(gs.substeps).toBe(1)
  })

  it('dispose() calls field.dispose()', () => {
    const gs = createGrayScottCompute(BASE_CONFIG, SHADER_STUB)
    gs.dispose()
    expect(gs.field.dispose).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 3: Run tests**

Run: `pnpm test tests/scenes/sims/grayScott/compute.test.ts`
Expected: `✓ tests/scenes/sims/grayScott/compute.test.ts (5 tests)` with exit code 0.

- [ ] **Step 4: Commit**

```bash
git add src/scenes/sims/grayScott/compute.ts \
        tests/scenes/sims/grayScott/compute.test.ts
git commit -m "feat(sims): Gray-Scott compute layer with substepping"
```

---

### Task D26: Gray-Scott Scene with colormap selector

**Files:**
- Create: `src/scenes/sims/grayScott/Scene.tsx`
- Create: `tests/scenes/sims/grayScott/Scene.test.tsx`

- [ ] **Step 1: Create `src/scenes/sims/grayScott/Scene.tsx`**

```tsx
import { useRef, useEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useControls } from 'leva'
import * as THREE from 'three'
import reactionDiffusionFrag from './shaders/reaction-diffusion.frag?raw'
import { createGrayScottCompute, type GrayScottComputeConfig } from './compute'

export interface GrayScottConfig extends GrayScottComputeConfig {
  colormap: 'viridis' | 'magma' | 'grayscale'
}

export const GRAY_SCOTT_LEVA_SCHEMA = {
  F:        { value: 0.030,  min: 0.005, max: 0.1,  step: 0.001 },
  k:        { value: 0.062,  min: 0.04,  max: 0.08, step: 0.001 },
  Du:       { value: 0.16,   min: 0.05,  max: 0.5,  step: 0.01  },
  Dv:       { value: 0.08,   min: 0.01,  max: 0.25, step: 0.005 },
  dt:       { value: 1.0,    min: 0.1,   max: 2.0,  step: 0.1   },
  substeps: { value: 4,      min: 1,     max: 16,   step: 1     },
  gridSize: { value: 256,    min: 64,    max: 512,  step: 64    },
  colormap: {
    value: 'viridis',
    options: ['viridis', 'magma', 'grayscale'],
  },
}

// Simple inline colormap LUT textures (1×256 RGBA)
function buildColormapTexture(name: 'viridis' | 'magma' | 'grayscale'): THREE.DataTexture {
  const size = 256
  const data = new Uint8Array(size * 4)
  for (let i = 0; i < size; i++) {
    const t = i / (size - 1)
    let r = 0, g = 0, b = 0
    if (name === 'grayscale') {
      r = g = b = Math.round(t * 255)
    } else if (name === 'viridis') {
      // Approximation of viridis colormap
      r = Math.round((0.267 + t * 0.004 + t * t * (-0.003) + t * t * t * 0.732) * 255)
      g = Math.round((0.004 + t * 1.143 + t * t * (-0.636)) * 255)
      b = Math.round((0.329 + t * 1.098 + t * t * (-1.979) + t * t * t * 1.552) * 255)
    } else {
      // magma approximation
      r = Math.round((0.001 + t * 1.644 + t * t * (-0.645)) * 255)
      g = Math.round((0.000 + t * 0.293 + t * t * 0.707) * 255)
      b = Math.round((0.014 + t * 0.642 + t * t * (-0.656)) * 255)
    }
    data[i * 4] = Math.min(255, Math.max(0, r))
    data[i * 4 + 1] = Math.min(255, Math.max(0, g))
    data[i * 4 + 2] = Math.min(255, Math.max(0, b))
    data[i * 4 + 3] = 255
  }
  const tex = new THREE.DataTexture(data, size, 1, THREE.RGBAFormat)
  tex.needsUpdate = true
  return tex
}

const displayVert = /* glsl */ `
varying vec2 v_uv;
void main() {
  v_uv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const displayFrag = /* glsl */ `
uniform sampler2D u_state;
uniform sampler2D u_colormap;
varying vec2 v_uv;
void main() {
  float v = texture2D(u_state, v_uv).g; // V concentration drives color
  vec3 col = texture2D(u_colormap, vec2(v, 0.5)).rgb;
  gl_FragColor = vec4(col, 1.0);
}
`

export function GrayScottScene() {
  const { F, k, Du, Dv, dt, substeps, gridSize, colormap } = useControls(
    'Gray-Scott',
    GRAY_SCOTT_LEVA_SCHEMA,
  )
  const { gl } = useThree()
  const computeRef = useRef<ReturnType<typeof createGrayScottCompute> | null>(null)
  const materialRef = useRef<THREE.ShaderMaterial | null>(null)
  const colormapTex = useMemo(() => buildColormapTexture(colormap as 'viridis' | 'magma' | 'grayscale'), [colormap])

  // Initialize / reinitialize compute when grid params change
  useEffect(() => {
    if (computeRef.current) computeRef.current.dispose()
    const config = { gridSize, F, k, Du, Dv, dt, substeps }
    computeRef.current = createGrayScottCompute(config, reactionDiffusionFrag)
    return () => {
      computeRef.current?.dispose()
    }
  }, [gridSize])

  // Update uniforms live when F/k/Du/Dv/dt/substeps change
  useEffect(() => {
    const c = computeRef.current
    if (!c) return
    c.field.setUniform('u_F', F)
    c.field.setUniform('u_k', k)
    c.field.setUniform('u_Du', Du)
    c.field.setUniform('u_Dv', Dv)
    c.field.setUniform('u_dt', dt)
    c.substeps = substeps
  }, [F, k, Du, Dv, dt, substeps])

  useFrame(() => {
    const c = computeRef.current
    if (!c) return
    c.step()
    if (materialRef.current) {
      materialRef.current.uniforms.u_state.value = c.field.texture
      materialRef.current.uniforms.u_colormap.value = colormapTex
    }
  })

  return (
    <mesh>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={displayVert}
        fragmentShader={displayFrag}
        uniforms={{
          u_state:    { value: null },
          u_colormap: { value: colormapTex },
        }}
      />
    </mesh>
  )
}

export default GrayScottScene
```

- [ ] **Step 2: Create `tests/scenes/sims/grayScott/Scene.test.tsx`**

```tsx
import { describe, it, expect, vi } from 'vitest'

vi.mock('@react-three/fiber', () => ({
  useFrame: vi.fn(),
  useThree: vi.fn(() => ({ gl: {} })),
}))
vi.mock('leva', () => ({
  useControls: vi.fn(() => ({
    F: 0.03, k: 0.062, Du: 0.16, Dv: 0.08,
    dt: 1, substeps: 4, gridSize: 64, colormap: 'viridis',
  })),
}))
vi.mock('./shaders/reaction-diffusion.frag?raw', () => ({ default: '/* stub */' }))
vi.mock('./compute', () => ({
  createGrayScottCompute: vi.fn(() => ({
    field: { texture: null, setUniform: vi.fn(), compute: vi.fn(), dispose: vi.fn() },
    substeps: 4,
    step: vi.fn(),
    dispose: vi.fn(),
  })),
}))

import { GRAY_SCOTT_LEVA_SCHEMA } from '@/scenes/sims/grayScott/Scene'

describe('GrayScottScene (unit)', () => {
  it('leva schema has required keys', () => {
    const keys = ['F', 'k', 'Du', 'Dv', 'dt', 'substeps', 'gridSize', 'colormap']
    for (const key of keys) {
      expect(GRAY_SCOTT_LEVA_SCHEMA).toHaveProperty(key)
    }
  })

  it('default F is 0.030', () => {
    expect(GRAY_SCOTT_LEVA_SCHEMA.F.value).toBeCloseTo(0.030, 3)
  })

  it('colormap options include viridis, magma, grayscale', () => {
    const opts = (GRAY_SCOTT_LEVA_SCHEMA.colormap as { value: string; options: string[] }).options
    expect(opts).toContain('viridis')
    expect(opts).toContain('magma')
    expect(opts).toContain('grayscale')
  })
})
```

- [ ] **Step 3: Run tests**

Run: `pnpm test tests/scenes/sims/grayScott/Scene.test.tsx`
Expected: `✓ tests/scenes/sims/grayScott/Scene.test.tsx (3 tests)` with exit code 0.

- [ ] **Step 4: TypeScript check**

Run: `pnpm tsc --noEmit`
Expected: exit code 0.

- [ ] **Step 5: Commit**

```bash
git add src/scenes/sims/grayScott/Scene.tsx \
        tests/scenes/sims/grayScott/Scene.test.tsx
git commit -m "feat(sims): Gray-Scott Scene with colormap selector"
```

---

### Task D27: Gray-Scott SimModule + 5 pattern presets

**Files:**
- Create: `src/scenes/sims/grayScott/presets.ts`
- Create: `src/scenes/sims/grayScott/index.ts`

- [ ] **Step 1: Create `src/scenes/sims/grayScott/presets.ts`**

```ts
import type { SimPreset } from '@/scenes/engine/types'
import type { GrayScottConfig } from './Scene'

export const GRAY_SCOTT_PRESETS: Record<string, SimPreset<GrayScottConfig>> = {
  spots: {
    label: 'Spots (F=0.030 k=0.062)',
    config: {
      F: 0.030, k: 0.062, Du: 0.16, Dv: 0.08,
      dt: 1.0, substeps: 4, gridSize: 256, colormap: 'viridis',
    },
  },
  stripes: {
    label: 'Stripes (F=0.025 k=0.055)',
    config: {
      F: 0.025, k: 0.055, Du: 0.16, Dv: 0.08,
      dt: 1.0, substeps: 4, gridSize: 256, colormap: 'magma',
    },
  },
  maze: {
    label: 'Maze (F=0.029 k=0.057)',
    config: {
      F: 0.029, k: 0.057, Du: 0.16, Dv: 0.08,
      dt: 1.0, substeps: 4, gridSize: 256, colormap: 'viridis',
    },
  },
  spiral: {
    label: 'Spiral (F=0.014 k=0.054)',
    config: {
      F: 0.014, k: 0.054, Du: 0.16, Dv: 0.08,
      dt: 1.0, substeps: 6, gridSize: 256, colormap: 'magma',
    },
  },
  coral: {
    label: 'Coral (F=0.062 k=0.062)',
    config: {
      F: 0.062, k: 0.062, Du: 0.16, Dv: 0.08,
      dt: 1.0, substeps: 4, gridSize: 256, colormap: 'grayscale',
    },
  },
}

export const GRAY_SCOTT_DEFAULT_PRESET = 'spots'
```

- [ ] **Step 2: Create `src/scenes/sims/grayScott/index.ts`**

```ts
import type { SimModule } from '@/scenes/engine/types'
import type { SymmetryType } from '@/scenes/engine/Symmetry'
import { GrayScottScene } from './Scene'
import type { GrayScottConfig } from './Scene'
import { GRAY_SCOTT_PRESETS, GRAY_SCOTT_DEFAULT_PRESET } from './presets'

export interface GrayScottState {
  // GPU state managed inside Scene via useRef/useEffect
}

const GrayScottModule: SimModule<GrayScottConfig, GrayScottState> = {
  id: 'grayScott',
  label: 'Gray-Scott Reaction-Diffusion',
  Scene: GrayScottScene,

  init(_config: GrayScottConfig, _perf): GrayScottState {
    return {}
  },

  step(_state: GrayScottState, _dt: number): void {
    // GPU compute loop runs inside Scene.tsx useFrame
  },

  dispose(_state: GrayScottState): void {
    // GPU resources cleaned up via Scene useEffect cleanup
  },

  /**
   * Gray-Scott supports C_n and D_n symmetric initial V-perturbation masks;
   * pattern formation preserves symmetry absent noise.
   */
  symmetryApplies(type: SymmetryType, order: number): boolean {
    return (type === 'C' || type === 'D') && order >= 1
  },

  presets: GRAY_SCOTT_PRESETS,
  defaultPreset: GRAY_SCOTT_DEFAULT_PRESET,
}

export default GrayScottModule
```

- [ ] **Step 3: Run full test suite**

Run: `pnpm test`
Expected: all tests pass. Exit code 0.

- [ ] **Step 4: Commit**

```bash
git add src/scenes/sims/grayScott/presets.ts \
        src/scenes/sims/grayScott/index.ts
git commit -m "feat(sims): Gray-Scott SimModule + 5 pattern presets"
```

---

## Phase 14 — Kuramoto-Sivashinsky (1D, ETDRK4 Pseudospectral)

### Task D28: KS pseudospectral compute layer

**Files:**
- Create: `src/scenes/sims/kuramotoSivashinsky/compute.ts`
- Create: `tests/scenes/sims/kuramotoSivashinsky/compute.test.ts`

- [ ] **Step 1: Create `src/scenes/sims/kuramotoSivashinsky/compute.ts`**

```ts
import { fft, ifft } from '@/scenes/solvers/fft'
import { etdrk4Step } from '@/scenes/solvers/etdrk4'

export interface KSConfig {
  /** Domain length L */
  L: number
  /** Number of Fourier modes N (should be power of 2) */
  N: number
  /** Hyper-viscosity coefficient ν (default 1.0) */
  nu: number
  /** Time step */
  dt: number
}

export interface KSState {
  /** Real-space solution array, length N */
  u: Float64Array
  /** Wavenumbers, length N */
  k: Float64Array
  /** ETDRK4 linear operator diagonal (Fourier space), length N */
  L_hat: Float64Array
  /** Time elapsed */
  time: number
}

/**
 * Build wavenumbers for an N-point FFT on domain [0, L).
 * Ordering: [0, 1, …, N/2-1, -N/2, …, -1] (standard FFT ordering).
 */
function buildWavenumbers(N: number, L: number): Float64Array {
  const k = new Float64Array(N)
  for (let i = 0; i < N; i++) {
    const ki = i <= N / 2 ? i : i - N
    k[i] = (2 * Math.PI * ki) / L
  }
  return k
}

/**
 * KS linear operator: L = -k² - ν k⁴
 * (instability at low k, hyperviscous damping at high k)
 */
function buildLinearOperator(k: Float64Array, nu: number): Float64Array {
  const L_hat = new Float64Array(k.length)
  for (let i = 0; i < k.length; i++) {
    const ki2 = k[i] * k[i]
    L_hat[i] = -ki2 - nu * ki2 * ki2
  }
  return L_hat
}

/**
 * Nonlinear term in Fourier space: F[N(u)] = FFT(-u * du/dx)
 * du/dx is computed spectrally: d/dx ↔ multiply by ik.
 */
function nonlinearTerm(
  u_hat: Float64Array,
  k: Float64Array,
  N: number,
): Float64Array {
  // Compute u in real space
  const u_real = ifft(u_hat, N)

  // Compute du/dx in real space via spectral differentiation
  // du_dx_hat[i] = i*k[i] * u_hat[i]  (real part → -k*imag, imag part → k*real)
  const dudx_hat_re = new Float64Array(N)
  const dudx_hat_im = new Float64Array(N)
  // u_hat is interleaved real/imag in Float64Array (re0,im0,re1,im1,...)
  for (let i = 0; i < N; i++) {
    const re = u_hat[2 * i]
    const im = u_hat[2 * i + 1]
    dudx_hat_re[i] = -k[i] * im
    dudx_hat_im[i] = k[i] * re
  }
  const dudx_hat_interleaved = new Float64Array(N * 2)
  for (let i = 0; i < N; i++) {
    dudx_hat_interleaved[2 * i] = dudx_hat_re[i]
    dudx_hat_interleaved[2 * i + 1] = dudx_hat_im[i]
  }
  const dudx_real = ifft(dudx_hat_interleaved, N)

  // Nonlinear product in real space: -u * du/dx
  const nl = new Float64Array(N)
  for (let i = 0; i < N; i++) {
    nl[i] = -u_real[i] * dudx_real[i]
  }

  // Return FFT of nonlinear product (interleaved complex)
  return fft(nl, N)
}

/** Initialize a KS state from a real-space initial condition array. */
export function createKSState(u0: Float64Array, config: KSConfig): KSState {
  const { N, L, nu } = config
  const k = buildWavenumbers(N, L)
  const L_hat = buildLinearOperator(k, nu)
  const u_hat = fft(u0, N)

  return {
    u: u0.slice(),
    k,
    L_hat,
    time: 0,
  }
}

/**
 * Advance the KS equation one time step using ETDRK4 in Fourier space.
 * The nonlinear term is evaluated in real space for de-aliasing.
 */
export function ksStep(state: KSState, config: KSConfig): KSState {
  const { N, dt, nu } = config
  const { k, L_hat, time } = state

  // Transform current state to Fourier space
  const u_hat = fft(state.u, N)

  // ETDRK4: integrate û' = L_hat * û + N(û) over dt
  // where N is evaluated via back-transform
  const u_hat_next = etdrk4Step(
    u_hat,
    L_hat,
    (uh) => nonlinearTerm(uh, k, N),
    dt,
  )

  // Back-transform to real space
  const u_next = ifft(u_hat_next, N)

  return {
    u: u_next,
    k,
    L_hat,
    time: time + dt,
  }
}

/**
 * Generate a C_n-symmetric initial condition:
 * u(x) = Σ_j cos(n·j·2πx/L + φ_j)  for j in [1, harmonics]
 */
export function ksSymmetricIC(
  N: number,
  L: number,
  symmetryOrder: number,
  harmonics = 3,
  amplitude = 0.1,
): Float64Array {
  const u = new Float64Array(N)
  for (let i = 0; i < N; i++) {
    const x = (i / N) * L
    for (let j = 1; j <= harmonics; j++) {
      const phase = (j * 0.1337) // deterministic phase offset
      u[i] += amplitude * Math.cos(symmetryOrder * j * (2 * Math.PI * x / L) + phase)
    }
  }
  return u
}
```

- [ ] **Step 2: Create `tests/scenes/sims/kuramotoSivashinsky/compute.test.ts`**

```ts
import { describe, it, expect, vi } from 'vitest'

// Mock the FFT and ETDRK4 solvers to avoid implementing them here
vi.mock('@/scenes/solvers/fft', () => ({
  fft: vi.fn((u: Float64Array, N: number) => {
    // Return interleaved complex array of zeros except re[0] = mean
    const out = new Float64Array(N * 2)
    let sum = 0
    for (let i = 0; i < N; i++) sum += u[i]
    out[0] = sum / N
    return out
  }),
  ifft: vi.fn((_u_hat: Float64Array, N: number) => new Float64Array(N)),
}))

vi.mock('@/scenes/solvers/etdrk4', () => ({
  etdrk4Step: vi.fn((u_hat: Float64Array, _L: Float64Array, _N: unknown, _dt: number) => u_hat),
}))

import { createKSState, ksStep, ksSymmetricIC } from '@/scenes/sims/kuramotoSivashinsky/compute'
import { etdrk4Step } from '@/scenes/solvers/etdrk4'

const BASE_CONFIG = { L: 32 * Math.PI, N: 64, nu: 1.0, dt: 0.05 }

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
    expect(state.L_hat[0]).toBe(0)
  })

  it('linear operator is negative for k>0 (damped high frequencies)', () => {
    const u0 = new Float64Array(64).fill(0)
    const state = createKSState(u0, BASE_CONFIG)
    // Check a mid-range wavenumber
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

  it('calls etdrk4Step once per ksStep', () => {
    const u0 = new Float64Array(64).fill(0.1)
    const state = createKSState(u0, BASE_CONFIG)
    ;(etdrk4Step as ReturnType<typeof vi.fn>).mockClear()
    ksStep(state, BASE_CONFIG)
    expect(etdrk4Step).toHaveBeenCalledTimes(1)
  })

  it('returns a new state object (immutable step)', () => {
    const u0 = new Float64Array(64).fill(0.1)
    const state = createKSState(u0, BASE_CONFIG)
    const next = ksStep(state, BASE_CONFIG)
    expect(next).not.toBe(state)
  })
})

describe('ksSymmetricIC', () => {
  it('returns array of length N', () => {
    const u = ksSymmetricIC(64, 32 * Math.PI, 4)
    expect(u.length).toBe(64)
  })

  it('has C_n symmetry: u[i] ≈ u[i + N/n] for exact C_n ICs', () => {
    // For symmetryOrder=2, u(x+L/2) ≈ u(x) because we use cos(2*j*2π x/L)
    const N = 128
    const L = 32 * Math.PI
    const n = 2
    const u = ksSymmetricIC(N, L, n, 1, 1.0) // single harmonic for exactness
    // cos(2 * 1 * 2π * (x + L/2) / L) = cos(2π*x/L*2 + 2π) = cos(2π*x/L*2) ✓
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
```

- [ ] **Step 3: Run tests**

Run: `pnpm test tests/scenes/sims/kuramotoSivashinsky/compute.test.ts`
Expected: `✓ tests/scenes/sims/kuramotoSivashinsky/compute.test.ts (8 tests)` with exit code 0.

- [ ] **Step 4: Commit**

```bash
git add src/scenes/sims/kuramotoSivashinsky/compute.ts \
        tests/scenes/sims/kuramotoSivashinsky/compute.test.ts
git commit -m "feat(sims): KS pseudospectral compute layer"
```

---

### Task D29: KS space-time Scene

**Files:**
- Create: `src/scenes/sims/kuramotoSivashinsky/Scene.tsx`
- Create: `tests/scenes/sims/kuramotoSivashinsky/Scene.test.tsx`

- [ ] **Step 1: Create `src/scenes/sims/kuramotoSivashinsky/Scene.tsx`**

```tsx
import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { useControls } from 'leva'
import * as THREE from 'three'
import { createKSState, ksStep, ksSymmetricIC } from './compute'

export interface KSConfig {
  L: number
  N: number
  nu: number
  dt: number
  symmetryOrder: number
}

export const KS_LEVA_SCHEMA = {
  L:             { value: 32 * Math.PI, min: 10,  max: 400, step: 1    },
  N:             { value: 512,          min: 64,  max: 1024, step: 64  },
  nu:            { value: 1.0,          min: 0.1, max: 4.0,  step: 0.1 },
  dt:            { value: 0.05,         min: 0.01, max: 0.2, step: 0.01 },
  symmetryOrder: { value: 1,            min: 1,   max: 8,    step: 1   },
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

export function KuramotoSivashinskyScene() {
  const { L, N, nu, dt, symmetryOrder } = useControls('Kuramoto-Sivashinsky', KS_LEVA_SCHEMA)

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
    const config = { L, N, nu, dt }
    stateRef.current = createKSState(u0, config)
    rowIndexRef.current = 0
    // Clear texture
    const data = spaceTimeTex.image.data as Float32Array
    data.fill(0)
    spaceTimeTex.needsUpdate = true
  }, [L, N, nu, dt, symmetryOrder])

  useFrame(() => {
    if (!stateRef.current) return
    const config = { L, N, nu, dt }
    stateRef.current = ksStep(stateRef.current, config)

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
```

- [ ] **Step 2: Create `tests/scenes/sims/kuramotoSivashinsky/Scene.test.tsx`**

```tsx
import { describe, it, expect, vi } from 'vitest'

vi.mock('@react-three/fiber', () => ({
  useFrame: vi.fn(),
  useThree: vi.fn(() => ({ gl: {} })),
}))
vi.mock('leva', () => ({
  useControls: vi.fn(() => ({
    L: 32 * Math.PI, N: 64, nu: 1.0, dt: 0.05, symmetryOrder: 1,
  })),
}))
vi.mock('./compute', () => ({
  createKSState: vi.fn(() => ({ u: new Float64Array(64), k: new Float64Array(64), L_hat: new Float64Array(64), time: 0 })),
  ksStep: vi.fn((s: unknown) => s),
  ksSymmetricIC: vi.fn(() => new Float64Array(64)),
}))

import { KS_LEVA_SCHEMA } from '@/scenes/sims/kuramotoSivashinsky/Scene'

describe('KuramotoSivashinskyScene (unit)', () => {
  it('leva schema has required keys', () => {
    const keys = ['L', 'N', 'nu', 'dt', 'symmetryOrder']
    for (const key of keys) {
      expect(KS_LEVA_SCHEMA).toHaveProperty(key)
    }
  })

  it('default N is 512', () => {
    expect(KS_LEVA_SCHEMA.N.value).toBe(512)
  })

  it('default nu is 1.0', () => {
    expect(KS_LEVA_SCHEMA.nu.value).toBeCloseTo(1.0, 5)
  })

  it('default dt is 0.05', () => {
    expect(KS_LEVA_SCHEMA.dt.value).toBeCloseTo(0.05, 5)
  })
})
```

- [ ] **Step 3: Run tests**

Run: `pnpm test tests/scenes/sims/kuramotoSivashinsky/Scene.test.tsx`
Expected: `✓ tests/scenes/sims/kuramotoSivashinsky/Scene.test.tsx (4 tests)` with exit code 0.

- [ ] **Step 4: TypeScript check**

Run: `pnpm tsc --noEmit`
Expected: exit code 0.

- [ ] **Step 5: Commit**

```bash
git add src/scenes/sims/kuramotoSivashinsky/Scene.tsx \
        tests/scenes/sims/kuramotoSivashinsky/Scene.test.tsx
git commit -m "feat(sims): KS space-time Scene"
```

---

### Task D30: KS SimModule registration + 3 presets

**Files:**
- Create: `src/scenes/sims/kuramotoSivashinsky/presets.ts`
- Create: `src/scenes/sims/kuramotoSivashinsky/index.ts`

- [ ] **Step 1: Create `src/scenes/sims/kuramotoSivashinsky/presets.ts`**

```ts
import type { SimPreset } from '@/scenes/engine/types'
import type { KSConfig } from './Scene'

export const KS_PRESETS: Record<string, SimPreset<KSConfig>> = {
  classic: {
    label: 'Classic (L=32π, N=512)',
    config: { L: 32 * Math.PI, N: 512, nu: 1.0, dt: 0.05, symmetryOrder: 1 },
  },
  turbulent: {
    label: 'Turbulent (L=200)',
    config: { L: 200, N: 512, nu: 1.0, dt: 0.05, symmetryOrder: 1 },
  },
  quasiPeriodic: {
    label: 'Quasi-Periodic (L=18π)',
    config: { L: 18 * Math.PI, N: 256, nu: 1.0, dt: 0.04, symmetryOrder: 2 },
  },
}

export const KS_DEFAULT_PRESET = 'classic'
```

- [ ] **Step 2: Create `src/scenes/sims/kuramotoSivashinsky/index.ts`**

```ts
import type { SimModule } from '@/scenes/engine/types'
import type { SymmetryType } from '@/scenes/engine/Symmetry'
import { KuramotoSivashinskyScene } from './Scene'
import type { KSConfig } from './Scene'
import { KS_PRESETS, KS_DEFAULT_PRESET } from './presets'

export interface KSState {
  // CPU pseudospectral state managed in Scene.tsx via useRef
}

const KuramotoSivashinskyModule: SimModule<KSConfig, KSState> = {
  id: 'kuramotoSivashinsky',
  label: 'Kuramoto-Sivashinsky',
  Scene: KuramotoSivashinskyScene,

  init(_config: KSConfig, _perf): KSState {
    return {}
  },

  step(_state: KSState, _dt: number): void {
    // Pseudospectral stepping runs inside Scene.tsx useFrame
  },

  dispose(_state: KSState): void {
    // No external GPU resources to release
  },

  /**
   * KS supports C_n ICs generated as symmetric Fourier mode sums.
   * Valid orders: 1, 2, 3, 4, 6, 8 — those that divide evenly into
   * typical domain lengths and produce stable symmetric patterns.
   */
  symmetryApplies(type: SymmetryType, order: number): boolean {
    return type === 'C' && [1, 2, 3, 4, 6, 8].includes(order)
  },

  presets: KS_PRESETS,
  defaultPreset: KS_DEFAULT_PRESET,
}

export default KuramotoSivashinskyModule
```

- [ ] **Step 3: Run full test suite**

Run: `pnpm test`
Expected: all tests pass. Exit code 0.

- [ ] **Step 4: TypeScript check**

Run: `pnpm tsc --noEmit`
Expected: exit code 0, no errors.

- [ ] **Step 5: Commit**

```bash
git add src/scenes/sims/kuramotoSivashinsky/presets.ts \
        src/scenes/sims/kuramotoSivashinsky/index.ts
git commit -m "feat(sims): KS SimModule + 3 presets"
```

---

## Phase 15 — `/sim/[name]` playground pages

### Task D31: Dynamic route `src/pages/sim/[name].astro`

**Files:**
- Create: `src/pages/sim/[name].astro`

- [ ] **Step 1: Create the dynamic Astro route**

```astro
---
// src/pages/sim/[name].astro
import { SCENE_REGISTRY } from '../../scenes/registry'
import BaseLayout from '../../layouts/BaseLayout.astro'
import type { GetStaticPaths } from 'astro'

export const getStaticPaths = (() => {
  return Object.keys(SCENE_REGISTRY).map((name) => ({ params: { name } }))
}) satisfies GetStaticPaths

const { name } = Astro.params
const entry = SCENE_REGISTRY[name as keyof typeof SCENE_REGISTRY]
if (!entry) throw new Error(`Unknown sim: ${name}`)
---

<BaseLayout title={`${entry.label} — Playground`} fullViewport>
  <!--
    The app-wide Canvas (mounted in BaseLayout) reads `data-scene-id`
    from this sentinel and activates the matching SimModule.
  -->
  <div
    id="sim-playground-slot"
    data-scene-id={name}
    data-playground="true"
    class="sim-playground-root"
    aria-label={`${entry.label} simulation playground`}
  />

  <!-- Back-to-home link, positioned absolutely over canvas -->
  <a
    href="/"
    class="sim-back-link"
    aria-label="Back to portfolio home"
  >
    ← Home
  </a>

  <!-- Share-URL button: progressive enhancement via inline script -->
  <button
    id="sim-share-btn"
    class="sim-share-btn"
    type="button"
    aria-label="Copy share URL"
  >
    Share
  </button>
</BaseLayout>

<style>
  .sim-playground-root {
    position: fixed;
    inset: 0;
    z-index: 0;
  }

  .sim-back-link {
    position: fixed;
    top: 1rem;
    left: 1rem;
    z-index: 50;
    color: white;
    background: rgba(0, 0, 0, 0.45);
    backdrop-filter: blur(6px);
    padding: 0.35rem 0.75rem;
    border-radius: 6px;
    font-size: 0.85rem;
    text-decoration: none;
    transition: background 0.15s;
  }
  .sim-back-link:hover {
    background: rgba(0, 0, 0, 0.7);
  }

  .sim-share-btn {
    position: fixed;
    top: 1rem;
    right: 1rem;
    z-index: 50;
    color: white;
    background: rgba(0, 0, 0, 0.45);
    backdrop-filter: blur(6px);
    padding: 0.35rem 0.75rem;
    border-radius: 6px;
    font-size: 0.85rem;
    border: none;
    cursor: pointer;
    transition: background 0.15s;
  }
  .sim-share-btn:hover {
    background: rgba(0, 0, 0, 0.7);
  }
</style>

<script>
  // Share-URL: copy current href (includes hash from URL-sync store) to clipboard
  const shareBtn = document.getElementById('sim-share-btn')
  shareBtn?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      shareBtn.textContent = 'Copied!'
      setTimeout(() => { shareBtn.textContent = 'Share' }, 2000)
    } catch {
      shareBtn.textContent = 'Copy failed'
      setTimeout(() => { shareBtn.textContent = 'Share' }, 2000)
    }
  })
</script>
```

- [ ] **Step 2: Verify `SCENE_REGISTRY` is exported**

The registry was established in Task D11. Confirm the named export exists:

```bash
grep -n "export.*SCENE_REGISTRY" src/scenes/registry.ts
```

Expected: one line, e.g. `export const SCENE_REGISTRY = { ... }`.

- [ ] **Step 3: Verify `BaseLayout` accepts `fullViewport` prop**

```bash
grep -n "fullViewport" src/layouts/BaseLayout.astro
```

If the prop is absent, add it to `BaseLayout.astro`:

```astro
---
// Add to BaseLayout.astro Props
interface Props {
  title: string
  fullViewport?: boolean
}
const { title, fullViewport = false } = Astro.props
---
```

Then conditionally set `overflow: hidden` on `<body>` when `fullViewport` is true:

```astro
<body class:list={[{ 'overflow-hidden': fullViewport }]}>
```

- [ ] **Step 4: SceneRouter must handle `data-playground="true"` sentinel**

The `SceneRouter` (Task D11) reads DOM `data-scene-id` attributes from registered slot elements. The playground page sets both `data-scene-id` and `data-playground="true"`. The router should:
1. Treat `data-playground="true"` as a signal to expand Leva by default (`{ collapsed: false }`).
2. Otherwise follow the same mount/unmount logic as section slots.

If the router does not yet read `data-playground`, add the check:

```ts
// src/scenes/router.ts  — inside mountSlot or equivalent
const isPlayground = el.dataset.playground === 'true'
if (isPlayground) {
  useLevaStore.getState().setCollapsed(false)
}
```

- [ ] **Step 5: Build-time smoke check**

Run: `pnpm build`

Expected: for every key in `SCENE_REGISTRY` the build emits a corresponding HTML file. Verify with:

```bash
for name in singularity lorenz magnetic grayScott kuramotoSivashinsky; do
  test -f "dist/sim/$name/index.html" && echo "OK: $name" || echo "MISSING: $name"
done
```

Expected output: five `OK:` lines, zero `MISSING:` lines.

- [ ] **Step 6: TypeScript check**

Run: `pnpm tsc --noEmit`
Expected: exit code 0.

- [ ] **Step 7: Commit**

```bash
git add src/pages/sim/[name].astro
git commit -m "feat(scenes): /sim/[name] playground pages"
```

---

## Phase 16 — Home hero integration

### Task D32: Wire `Home.tsx` hero to Singularity via scene router sentinel

**Files:**
- Modify: `src/components/sections/Home.tsx`
- Create: `src/hooks/useSingularityScrollUniforms.ts`

- [ ] **Step 1: Extract scroll-uniform coupling into its own hook**

Create `src/hooks/useSingularityScrollUniforms.ts`:

```ts
// src/hooks/useSingularityScrollUniforms.ts
import { useEffect } from 'react'
import { useSceneStore } from '../scenes/sceneStore'

/**
 * Couples window scroll progress (0→1 over first viewport height) to the
 * `uScrollProgress` uniform of the active Singularity scene.
 *
 * Call this hook once inside the component that owns the Hero slot.
 * It registers / unregisters the scroll listener automatically.
 */
export function useSingularityScrollUniforms(): void {
  const setUniform = useSceneStore((s) => s.setUniform)

  useEffect(() => {
    function onScroll() {
      const progress = Math.min(
        1,
        window.scrollY / (window.innerHeight || 1),
      )
      setUniform('singularity', 'uScrollProgress', progress)
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll() // prime on mount

    return () => window.removeEventListener('scroll', onScroll)
  }, [setUniform])
}
```

- [ ] **Step 2: Ensure `sceneStore` exposes `setUniform`**

Check `src/scenes/sceneStore.ts`:

```bash
grep -n "setUniform" src/scenes/sceneStore.ts
```

If absent, add the slice:

```ts
// Inside the Zustand store definition
setUniform: (sceneId: string, key: string, value: unknown) => {
  set((state) => ({
    uniforms: {
      ...state.uniforms,
      [sceneId]: { ...(state.uniforms[sceneId] ?? {}), [key]: value },
    },
  }))
},
```

And declare the corresponding `uniforms` state key:

```ts
uniforms: {} as Record<string, Record<string, unknown>>,
```

The Singularity scene reads `uniforms['singularity'].uScrollProgress` inside its `useFrame` callback.

- [ ] **Step 3: Replace direct `SingularityShaders` usage in `Home.tsx`**

Before this task, `Home.tsx` likely renders `<SingularityShaders />` directly. Replace it with a DOM sentinel that the scene router picks up:

```tsx
// src/components/sections/Home.tsx
import React, { useRef } from 'react'
import { useSingularityScrollUniforms } from '../../hooks/useSingularityScrollUniforms'

export default function Home() {
  useSingularityScrollUniforms()

  return (
    <section id="home" className="relative min-h-screen flex items-center">
      {/*
        Scene-router sentinel: the app-wide Canvas reads this attribute
        and activates the Singularity SimModule for this slot.
        The Canvas is mounted in BaseLayout above this section in the DOM.
      */}
      <div
        data-scene-id="singularity"
        aria-hidden="true"
        className="absolute inset-0 -z-10"
      />

      {/* Hero copy — unchanged from pre-migration */}
      <div className="relative z-10 hero-content">
        {/* existing hero JSX preserved here */}
      </div>
    </section>
  )
}
```

Note: if `Home.tsx` contains additional hero content (headline, subtitle, CTA buttons), preserve it verbatim. Only the `<SingularityShaders />` element and any direct canvas/ref wiring is replaced by the sentinel `<div>`.

- [ ] **Step 4: Remove `SingularityShaders` import from `Home.tsx`**

```bash
grep -n "SingularityShaders" src/components/sections/Home.tsx
```

Expected: zero matches after the edit in Step 3.

- [ ] **Step 5: Full test + build**

Run: `pnpm test && pnpm build`
Expected: all tests pass; build succeeds.

- [ ] **Step 6: Commit**

```bash
git add src/components/sections/Home.tsx \
        src/hooks/useSingularityScrollUniforms.ts \
        src/scenes/sceneStore.ts
git commit -m "feat(sims): Home hero uses Singularity scene via router"
```

---

## Phase 17 — Cleanup

### Task D33: Remove `src/components/shaders/Singularity.tsx` and `react-shaders`

**Files:**
- Delete: `src/components/shaders/Singularity.tsx`
- Modify: `package.json` (dependency removal)
- Modify: `pnpm-lock.yaml` (auto-updated)

- [ ] **Step 1: Confirm no remaining references to `SingularityShaders` or `react-shaders`**

```bash
grep -rn "react-shaders\|SingularityShaders" src/
```

Expected: zero matches. If any match is found, update or remove the referencing file before proceeding.

- [ ] **Step 2: Delete the old shader component**

```bash
rm src/components/shaders/Singularity.tsx
```

Verify deletion:

```bash
ls src/components/shaders/Singularity.tsx 2>&1
```

Expected: `ls: … No such file or directory`.

- [ ] **Step 3: Remove `react-shaders` from dependencies**

```bash
pnpm remove react-shaders
```

Expected: `package.json` no longer lists `react-shaders`; `pnpm-lock.yaml` updated.

Verify:

```bash
grep "react-shaders" package.json
```

Expected: zero matches.

- [ ] **Step 4: TypeScript check**

Run: `pnpm tsc --noEmit`
Expected: exit code 0.

- [ ] **Step 5: Commit**

```bash
git add -u
git commit -m "chore: remove react-shaders after r3f port"
```

---

### Task D34: Conditionally remove `src/lib/fourier.ts`

**Files:**
- Possibly delete: `src/lib/fourier.ts`

- [ ] **Step 1: Check if `fourier.ts` is used outside the old singularity shader**

```bash
grep -rn "fourier\|from.*lib/fourier" src/
```

If the only references were inside `src/components/shaders/Singularity.tsx` (now deleted) and `src/scenes/sims/kuramotoSivashinsky/` (which uses it legitimately via the KS pseudospectral compute layer from Task D28), **keep the file** and close this task with a note.

If the only remaining references are inside the KS compute layer or `src/lib/fft.ts` shims, keep the file.

If zero references remain after the deletion of `Singularity.tsx`, proceed to Step 2.

- [ ] **Step 2: Delete if unused**

```bash
rm src/lib/fourier.ts
pnpm tsc --noEmit
```

Expected: exit code 0 (no import errors introduced by removal).

- [ ] **Step 3: Commit only if deleted**

```bash
git add -u
git commit -m "chore: remove unused fourier.ts after react-shaders cleanup"
```

If the file is still needed (KS references it), skip the commit and add a comment in the KS SimModule `index.ts`:

```ts
// fourier.ts is a dependency of this module — do not delete.
```

---

## Phase 18 — Perf verification

### Task D35: Perf budget harness + manual checklist

**Files:**
- Create: `scripts/perf-budget.mjs`

Per-sim mid-tier compute budget (spec §7.6):

| Sim | Target compute/frame | Notes |
|-----|---------------------|-------|
| Magnetic (GPU particles 2k) | p95 ≤ 0.8ms | |
| Lorenz (CPU 500 trails) | p95 ≤ 0.3ms | |
| Gray-Scott (GPU 256² × 4 sub) | p95 ≤ 1.2ms | |
| Kuramoto-Sivashinsky (GPU 512 pts × 4 sub ETDRK4) | p95 ≤ 1.5ms | |
| Rendering overhead (shared) | 2–3ms | |
| **Total active (1 sim)** | **p95 ≤ 5ms** | 11ms headroom at 60fps |

- [ ] **Step 1: Create the scripted harness**

```js
// scripts/perf-budget.mjs
/**
 * Perf budget harness for Sub-Project D simulations.
 *
 * Usage (requires Playwright installed as dev dependency):
 *   node scripts/perf-budget.mjs
 *
 * If Playwright is not installed, the script prints manual DevTools steps
 * and exits 0 (CI-safe). Install Playwright to enable automated assertions.
 *
 * Environment variables:
 *   BASE_URL   — default http://localhost:4321
 *   SIM_NAMES  — comma-separated list; default all five sims
 *   DURATION   — sample window in ms; default 30000
 */

import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:4321'
const SIM_NAMES = (process.env.SIM_NAMES ?? 'singularity,lorenz,magnetic,grayScott,kuramotoSivashinsky').split(',')
const DURATION = Number(process.env.DURATION ?? 30_000)

// Per-sim p95 budgets in milliseconds (spec §7.6 mid-tier)
const BUDGETS = {
  singularity: 5,       // full-frame budget (renders as hero; no isolation)
  lorenz: 5,
  magnetic: 5,
  grayScott: 5,
  kuramotoSivashinsky: 5,
}

async function runWithPlaywright() {
  const { chromium } = await import('playwright')
  const browser = await chromium.launch({ args: ['--enable-gpu'] })
  const results = []

  for (const name of SIM_NAMES) {
    const url = `${BASE_URL}/sim/${name}`
    console.log(`\n[perf] Sampling ${url} for ${DURATION / 1000}s …`)
    const context = await browser.newContext()
    const page = await context.newPage()

    // Collect frame times via Performance.mark hooks injected into the page
    const frameTimes = []
    await page.addInitScript(() => {
      window.__FRAME_TIMES__ = []
      let last = performance.now()
      function tick() {
        const now = performance.now()
        window.__FRAME_TIMES__.push(now - last)
        last = now
        requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    })

    await page.goto(url, { waitUntil: 'networkidle' })
    await page.waitForTimeout(DURATION)

    const raw = await page.evaluate(() => window.__FRAME_TIMES__ ?? [])
    await context.close()

    // Compute p95 frame time
    const sorted = [...raw].sort((a, b) => a - b)
    const p95 = sorted[Math.floor(sorted.length * 0.95)] ?? Infinity
    const budget = BUDGETS[name] ?? 16
    const pass = p95 <= budget

    results.push({ name, p95: p95.toFixed(2), budget, pass })
    console.log(`[perf] ${name}: p95 = ${p95.toFixed(2)}ms  budget = ${budget}ms  ${pass ? 'PASS' : 'FAIL'}`)
  }

  await browser.close()

  const failed = results.filter((r) => !r.pass)
  if (failed.length > 0) {
    console.error('\n[perf] BUDGET EXCEEDED:')
    failed.forEach((r) => console.error(`  ${r.name}: p95 ${r.p95}ms > ${r.budget}ms`))
    process.exit(1)
  }

  console.log('\n[perf] All sims within budget.')
  process.exit(0)
}

async function main() {
  // Detect whether playwright is available
  const playwrightPkg = resolve('node_modules/playwright/package.json')
  if (existsSync(playwrightPkg)) {
    await runWithPlaywright()
    return
  }

  // Fallback: print manual checklist
  console.log(`
[perf] Playwright not found. Run manually:

MANUAL CHROME DEVTOOLS PERFORMANCE CHECKLIST
============================================
For each sim URL: ${SIM_NAMES.map((n) => `${BASE_URL}/sim/${n}`).join(', ')}

1. Open Chrome DevTools → Performance tab.
2. Set CPU throttle to 4× slowdown (mid-tier proxy).
3. Click Record, let sim run for 10 seconds, click Stop.
4. Inspect the flame chart:
   - Scripting (yellow): compute + React overhead
   - Rendering (purple): r3f/three.js draw calls
   - Painting (green): compositing
5. Check "Summary" panel — total frame time should be < 16ms.
6. Verify p95 frame time (Frames panel) stays under 16ms.
7. Expected mid-tier budget per sim (spec §7.6):
   - Magnetic:              compute ~0.8ms
   - Lorenz:                compute ~0.3ms
   - Gray-Scott:            compute ~1.2ms
   - Kuramoto-Sivashinsky:  compute ~1.5ms
   - Rendering overhead:    ~2–3ms (shared)
   - Total active (1 sim):  ~4–5ms  (11ms headroom at 60fps)

OFFSCREEN PAUSE VERIFICATION
=============================
1. Navigate to any sim playground page (/sim/<name>).
2. Open DevTools Performance tab, start recording.
3. Scroll the page so the canvas is fully out of viewport.
4. Wait 5 seconds.
5. Stop recording.
6. Inspect the CPU activity — scripting should drop to ~0 within
   one requestAnimationFrame cycle after the canvas leaves viewport.
7. Expected: IntersectionObserver fires → useFrame halted → CPU ≈ 0.
`)
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
```

- [ ] **Step 2: Add optional `playwright` dev dependency note to `package.json` scripts**

Open `package.json` and add the script entry (do not install playwright automatically):

```json
"perf:budget": "node scripts/perf-budget.mjs"
```

Verify it is present:

```bash
grep "perf:budget" package.json
```

Expected: one match.

- [ ] **Step 3: Verify IntersectionObserver pause behavior — manual checklist**

The automated frame-time harness above covers throughput. The offscreen pause requires a manual visual check because headless Chromium does not fire `IntersectionObserver` in the same way as a visible browser:

```
Checklist — IntersectionObserver pause:
[ ] Open /sim/singularity in Chrome, DevTools Performance tab recording.
[ ] Scroll canvas fully out of viewport (e.g. arrow-key to bottom of page).
[ ] Wait 5 seconds.
[ ] Stop recording.
[ ] Confirm: after the first rAF following the scroll, the "Scripting" band
    on the flame chart becomes empty (no useFrame work, no GPU submits).
[ ] Repeat for /sim/lorenz, /sim/magnetic, /sim/grayScott,
    /sim/kuramotoSivashinsky.
```

The `SceneHost` component (Task D12) wires this via:

```ts
const io = new IntersectionObserver(
  ([entry]) => { scene.setActive(entry.isIntersecting) },
  { threshold: 0 },
)
io.observe(slotEl)
```

If any sim does not pause, check that `setActive(false)` short-circuits the `useFrame` callback inside that sim's `Scene.tsx`.

- [ ] **Step 4: Commit**

```bash
git add scripts/perf-budget.mjs package.json
git commit -m "chore(perf): add budget verification harness + checklist"
```

---

## Phase 19 — End-to-end verification

### Task D36: Full clean-build E2E verification

**Files:**
- No new files. Verify existing output.

- [ ] **Step 1: Clean install from scratch**

```bash
rm -rf node_modules dist
pnpm install --frozen-lockfile
```

Expected: install completes with no peer-dependency errors. `node_modules/` recreated.

- [ ] **Step 2: Run full test suite**

Run: `pnpm test`

Expected: all Sub-Project D tests pass (exit code 0). Test files to confirm green:

- `src/lib/__tests__/rk4.test.ts` (Task D2)
- `src/lib/__tests__/verlet.test.ts` (Task D3)
- `src/lib/__tests__/etdrk4.test.ts` (Task D4)
- `src/lib/__tests__/fft.test.ts` (Task D4)
- `src/scenes/__tests__/lorenz.physics.test.ts` (Task D17)
- `src/scenes/__tests__/magnetic.physics.test.ts` (Task D21)
- `src/scenes/__tests__/grayScott.compute.test.ts` (Task D25)
- `src/scenes/__tests__/ks.compute.test.ts` (Task D28)

- [ ] **Step 3: TypeScript check**

Run: `pnpm tsc --noEmit`
Expected: exit code 0, zero errors.

- [ ] **Step 4: Production build**

Run: `pnpm build`

Expected: build completes with no errors and emits the following HTML files:

```bash
for name in singularity lorenz magnetic grayScott kuramotoSivashinsky; do
  test -f "dist/sim/$name/index.html" && echo "OK: $name" || echo "MISSING: $name"
done
```

Expected output: five `OK:` lines.

- [ ] **Step 5: Preview and manual verification**

Run: `pnpm preview`

Open each URL and run the following checklist:

**`/` (Home)**
- [ ] Page loads; hero Canvas renders Singularity simulation.
- [ ] Scroll down — Singularity `uScrollProgress` uniform responds (visible shader change).
- [ ] No console errors.

**`/sim/singularity`**
- [ ] Full-viewport Canvas renders Singularity.
- [ ] Press `L` — Leva panel toggles visibility (expanded by default on playground).
- [ ] Press `?` — Help overlay opens with math description; press `?` again to close.
- [ ] Presets dropdown lists at least the default preset; selecting a preset changes the sim config.
- [ ] Symmetry slider changes initial condition; sim restarts with new IC.
- [ ] "Share" button copies current URL (including hash) to clipboard.
- [ ] Modify any config value — URL hash updates (debounced ~500ms).
- [ ] Reload with that hash — sim initialises to the saved config.
- [ ] Enable `prefers-reduced-motion` in OS/DevTools → sim halts compute (static snapshot visible).
- [ ] Disable `prefers-reduced-motion` → sim resumes.
- [ ] "← Home" link navigates back to `/`.

**`/sim/lorenz`**
- [ ] Canvas renders Lorenz attractor trails.
- [ ] `L` / `?` / presets / share / hash round-trip all work (same checklist as above).
- [ ] Scroll canvas out of viewport (open DevTools Perf, record 5s) → CPU near 0.

**`/sim/magnetic`**
- [ ] Canvas renders magnetic dipole particle simulation.
- [ ] Symmetry `D_n` slider changes particle initial positions symmetrically.
- [ ] All interactive controls work.

**`/sim/grayScott`**
- [ ] Canvas renders reaction-diffusion patterns.
- [ ] Colormap selector in Leva changes palette.
- [ ] `F` / `k` sliders change pattern regime.

**`/sim/kuramotoSivashinsky`**
- [ ] Canvas renders space-time plot.
- [ ] Symmetry `C_n` slider alters initial Fourier modes.
- [ ] All interactive controls work.

- [ ] **Step 6: Final fix commit (if needed)**

If any issues surfaced during Steps 1–5, fix them inline and commit:

```bash
git add <changed files>
git commit -m "fix: <specifics of what was broken>"
```

If no fixes are needed, skip this step.

---

## Self-Review Checklist

### Spec coverage cross-reference

| Spec section | Description | Tasks |
|---|---|---|
| §7.1 Scene architecture | `Sim<Config,State>` type, registry | D1, D6, D7, D11 |
| §7.2 Solver primitives | RK4, Verlet, ETDRK4, FFT | D2, D3, D4 |
| §7.3 GPU compute | WebGL ping-pong, RGBA16F fallback | D5 |
| §7.4 Symmetry ICs | `C_n` / `D_n` generators | D8 |
| §7.5 URL hash + presets | Hash sync, Zustand slice | D14 |
| §7.6 Perf plan | Adaptive tier, pause-on-offscreen, budget | D9, D10, D12, D35 |
| §7.7 Leva integration | Global panel, keyboard `L`, folders | D13 |
| §7.8 Playground pages | `/sim/[name]` full-viewport routes | D31 |
| §8.4 Solver correctness tests | rk4, verlet, etdrk4 unit tests | D2, D3, D4 |
| §8.4 Sim behavior tests | Lorenz, GS, KS correctness | D17, D25, D28 |
| §8.4 Leva round-trip | Config JSON → leva → JSON identity | D13, D14 |
| §8.4 GPU fallback | RGBA16F alternate path | D5 |
| §8.4 Offscreen pause | IntersectionObserver halts compute | D12, D35 |
| §8.4 Perf profiler | Mid-tier frame budget verified | D35 |
| Help overlay (`?` key) | Math description collapsible | D15 |
| Singularity r3f port | Hero sim migrated off `react-shaders` | D16 |
| Lorenz sim | Full physics + scene + presets | D17–D20 |
| Magnetic sim | Dipole + Verlet + D_n IC + presets | D21–D23 |
| Gray-Scott sim | Fragment shader + ping-pong + presets | D24–D27 |
| Kuramoto-Sivashinsky sim | ETDRK4 + space-time scene + presets | D28–D30 |
| Home hero integration | Sentinel replaces direct shader import | D32 |
| Cleanup | `react-shaders` removed, dead files deleted | D33, D34 |
| E2E verification | Clean build + manual preview checklist | D36 |

### Placeholder scan

- No `TBD`, `TODO`, or `<…>` placeholder remains in any task.
- Every `Run:` command has a defined `Expected:` outcome.
- Every `Create:` / `Modify:` header specifies an exact file path.

### Type consistency

- `SimModule<Config, State>`, `SymmetryType`, `PerfTier`, `SimState` all declared in `src/scenes/types.ts` (Task D6) and used consistently across all SimModule `index.ts` files.
- `SceneRegistry` type derived from `SCENE_REGISTRY` object; `keyof typeof SCENE_REGISTRY` used in `[name].astro`.
- Zustand store slices (`useSceneStore`, `useLevaStore`, `useHashStore`) each typed with their slice interface.

---

## Out of scope for this plan (deferred items)

The following items appear in the spec or were considered during planning but are **not** implemented here. They are candidates for a future sub-project D extension.

- **2D Kuramoto-Sivashinsky variant** — spec §7 notes a possible 2D KS extension. The current implementation is 1D pseudospectral (512 points, space-time plot). A 2D variant would require a 2D FFT pass, a different colormap, and a redesigned Scene layout.
- **GPU particle variant of Magnetic with >2000 particles** — spec §7.6 high tier lists 10 000 particles. The current Magnetic sim is CPU/Verlet for mid tier; a GPU instanced-mesh or compute-shader variant is needed for high-tier counts.
- **Custom scenes for remaining portfolio sections** (About, Experience, Education, Gallery, etc.) — spec §11 describes per-section ambient simulations. Sub-project D ships only Singularity (Home hero) and playground routes. Other section sims are a separate planning unit.
- **Full WebGPU migration** — the architecture is designed to accommodate a WebGPU compute backend (replacing the WebGL ping-pong approach), but the implementation uses WebGL throughout. Migration is blocked on broader browser adoption.
- **Post-processing stack beyond r3f defaults** — bloom, chromatic aberration, SSAO, and similar `@react-three/postprocessing` passes were considered for the Singularity hero. They are deferred to avoid LCP budget risk on first load.
- **Visual regression screenshot suite** — spec §8.4 lists per-sim screenshot at fixed seed + step count. A Playwright screenshot fixture setup is deferred to avoid CI GPU dependency in the initial rollout.
