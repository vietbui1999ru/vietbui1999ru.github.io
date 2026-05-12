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
 */

/** Safe phi1 = (exp(c) - 1) / c with Taylor fallback near c=0 */
function phi1(c: number): number {
  if (Math.abs(c) < 1e-8) {
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

  const Na = N(t, u)
  const a = E2 * u + p1h * half * Na

  const Nb = N(t + half, a)
  const b = E2 * u + p1h * half * Nb

  const Nc = N(t + half, b)
  const c_ = E2 * a + p1h * half * (2 * Nc - Na)

  const Nd = N(t + dt, c_)

  const uNew =
    E * u +
    dt * (p1 - 3 * p2 + 4 * p3) * Na +
    dt * (2 * p2 - 4 * p3) * Nb +
    dt * (2 * p2 - 4 * p3) * Nc +
    dt * (-p2 + 4 * p3) * Nd

  return uNew
}
